const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini';
const RATE_LIMIT_WINDOW_MINUTES = 15;
const RATE_LIMIT_MAX_REQUESTS = 12;
const OPENAI_TIMEOUT_MS = 20000;
const MAX_INGREDIENT_NAME_LENGTH = 48;

declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(handler: (request: Request) => Promise<Response> | Response): void;
};

type MacroTargets = {
  protein: number;
  carbs: number;
  fats: number;
};

type GenerateRequest = {
  ingredientNames?: unknown;
  macros?: unknown;
  timeLimit?: unknown;
};

type GenerationLogStatus = 'success' | 'error' | 'rate_limited';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function asPositiveNumber(value: unknown, fallback: number) {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.round(parsed);
}

function normalizeIngredients(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item ?? '').trim().slice(0, MAX_INGREDIENT_NAME_LENGTH))
    .filter(Boolean)
    .slice(0, 20);
}

function normalizeMacros(value: unknown): MacroTargets {
  const raw = typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
  return {
    protein: clamp(asPositiveNumber(raw.protein, 150), 20, 300),
    carbs: clamp(asPositiveNumber(raw.carbs, 200), 20, 400),
    fats: clamp(asPositiveNumber(raw.fats, 60), 10, 150),
  };
}

function buildPrompt(ingredients: string[], macros: MacroTargets, timeLimit: number) {
  return `Generate 3 distinct meal recipes.
Use only these ingredients: ${ingredients.join(', ')}.
Target macros per recipe near: protein ${macros.protein}g, carbs ${macros.carbs}g, fats ${macros.fats}g.
Keep preparation time at or under ${timeLimit} minutes.

Return strict JSON:
{
  "recipes": [
    {
      "name": "string",
      "description": "string",
      "preparation_time": 30,
      "macros": { "protein": 40, "carbs": 50, "fats": 20, "calories": 500 },
      "ingredients": [{ "name": "string", "amount": "string", "unit": "string" }],
      "instructions": ["string"]
    }
  ]
}`;
}

function parseContentRangeTotal(headerValue: string | null) {
  if (!headerValue) return 0;
  const totalPart = headerValue.split('/')[1];
  if (!totalPart) return 0;
  const total = Number(totalPart);
  return Number.isFinite(total) && total >= 0 ? total : 0;
}

async function getAuthenticatedUserId(
  request: Request,
  supabaseUrl: string,
  supabaseAnonKey: string
) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    method: 'GET',
    headers: {
      Authorization: authHeader,
      apikey: supabaseAnonKey,
    },
  });

  if (!response.ok) return null;
  const data = (await response.json()) as { id?: string };
  return data.id ?? null;
}

async function getRecentUsageCount(
  supabaseUrl: string,
  supabaseAnonKey: string,
  authHeader: string,
  userId: string
) {
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000).toISOString();
  const url =
    `${supabaseUrl}/rest/v1/recipe_generation_logs` +
    `?select=id` +
    `&user_id=eq.${encodeURIComponent(userId)}` +
    `&requested_at=gte.${encodeURIComponent(windowStart)}`;

  const response = await fetch(url, {
    method: 'HEAD',
    headers: {
      Authorization: authHeader,
      apikey: supabaseAnonKey,
      Prefer: 'count=exact',
    },
  });

  if (!response.ok) {
    throw new Error('usage_count_failed');
  }

  return parseContentRangeTotal(response.headers.get('content-range'));
}

async function logGenerationEvent(
  supabaseUrl: string,
  supabaseAnonKey: string,
  authHeader: string,
  payload: {
    userId: string;
    status: GenerationLogStatus;
    ingredientCount: number;
    errorCode?: string | null;
    latencyMs?: number | null;
  }
) {
  const response = await fetch(`${supabaseUrl}/rest/v1/recipe_generation_logs`, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      apikey: supabaseAnonKey,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      user_id: payload.userId,
      status: payload.status,
      provider: 'openai',
      ingredient_count: payload.ingredientCount,
      error_code: payload.errorCode ?? null,
      latency_ms: payload.latencyMs ?? null,
    }),
  });

  if (!response.ok) {
    throw new Error('usage_log_failed');
  }
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  const startedAt = Date.now();
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const openAiKey = Deno.env.get('OPENAI_API_KEY');
  const openAiModel = Deno.env.get('OPENAI_MODEL') || DEFAULT_OPENAI_MODEL;
  const authHeader = request.headers.get('Authorization');

  if (!supabaseUrl || !supabaseAnonKey) {
    return jsonResponse(500, { error: 'Missing SUPABASE_URL or SUPABASE_ANON_KEY secret' });
  }
  if (!openAiKey) {
    return jsonResponse(500, { error: 'Missing OPENAI_API_KEY secret' });
  }
  if (!authHeader?.startsWith('Bearer ')) {
    return jsonResponse(401, { error: 'Unauthorized' });
  }

  const userId = await getAuthenticatedUserId(request, supabaseUrl, supabaseAnonKey);
  if (!userId) {
    return jsonResponse(401, { error: 'Unauthorized' });
  }

  let ingredientCountForLog = 0;

  try {
    const payload = (await request.json()) as GenerateRequest;
    const ingredientNames = normalizeIngredients(payload.ingredientNames);
    const macros = normalizeMacros(payload.macros);
    const timeLimit = clamp(asPositiveNumber(payload.timeLimit, 30), 10, 90);
    ingredientCountForLog = ingredientNames.length;

    if (ingredientNames.length < 3) {
      return jsonResponse(400, { error: 'At least 3 ingredients are required.' });
    }

    const recentUsageCount = await getRecentUsageCount(
      supabaseUrl,
      supabaseAnonKey,
      authHeader,
      userId
    );
    if (recentUsageCount >= RATE_LIMIT_MAX_REQUESTS) {
      await logGenerationEvent(supabaseUrl, supabaseAnonKey, authHeader, {
        userId,
        status: 'rate_limited',
        ingredientCount: ingredientNames.length,
        errorCode: 'rate_limit_exceeded',
      }).catch(() => undefined);

      return jsonResponse(429, {
        error: `Rate limit exceeded. Max ${RATE_LIMIT_MAX_REQUESTS} requests per ${RATE_LIMIT_WINDOW_MINUTES} minutes.`,
      });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

    const openAiResponse = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openAiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: openAiModel,
        temperature: 0.7,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: 'You generate practical recipes. Return only valid JSON.',
          },
          {
            role: 'user',
            content: buildPrompt(ingredientNames, macros, timeLimit),
          },
        ],
      }),
    }).finally(() => clearTimeout(timeoutId));

    if (!openAiResponse.ok) {
      await logGenerationEvent(supabaseUrl, supabaseAnonKey, authHeader, {
        userId,
        status: 'error',
        ingredientCount: ingredientNames.length,
        errorCode: `openai_http_${openAiResponse.status}`,
        latencyMs: Date.now() - startedAt,
      }).catch(() => undefined);

      return jsonResponse(502, { error: `OpenAI request failed with status ${openAiResponse.status}` });
    }

    const responseBody = (await openAiResponse.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };
    const content = responseBody.choices?.[0]?.message?.content;
    if (!content) {
      await logGenerationEvent(supabaseUrl, supabaseAnonKey, authHeader, {
        userId,
        status: 'error',
        ingredientCount: ingredientNames.length,
        errorCode: 'openai_empty_content',
        latencyMs: Date.now() - startedAt,
      }).catch(() => undefined);

      return jsonResponse(502, { error: 'OpenAI returned empty content' });
    }

    const parsed = JSON.parse(content) as { recipes?: unknown[] };
    if (!Array.isArray(parsed.recipes)) {
      await logGenerationEvent(supabaseUrl, supabaseAnonKey, authHeader, {
        userId,
        status: 'error',
        ingredientCount: ingredientNames.length,
        errorCode: 'openai_invalid_payload_shape',
        latencyMs: Date.now() - startedAt,
      }).catch(() => undefined);

      return jsonResponse(502, { error: 'Invalid OpenAI payload shape' });
    }

    await logGenerationEvent(supabaseUrl, supabaseAnonKey, authHeader, {
      userId,
      status: 'success',
      ingredientCount: ingredientNames.length,
      latencyMs: Date.now() - startedAt,
    }).catch(() => undefined);

    return jsonResponse(200, { recipes: parsed.recipes.slice(0, 3) });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      await logGenerationEvent(supabaseUrl, supabaseAnonKey, authHeader, {
        userId,
        status: 'error',
        ingredientCount: ingredientCountForLog,
        errorCode: 'openai_timeout',
        latencyMs: Date.now() - startedAt,
      }).catch(() => undefined);
      return jsonResponse(504, { error: 'OpenAI request timed out' });
    }

    await logGenerationEvent(supabaseUrl, supabaseAnonKey, authHeader, {
      userId,
      status: 'error',
      ingredientCount: ingredientCountForLog,
      errorCode: 'unhandled_server_error',
      latencyMs: Date.now() - startedAt,
    }).catch(() => undefined);

    const message = error instanceof Error ? error.message : 'Unexpected server error';
    return jsonResponse(500, { error: message });
  }
});
