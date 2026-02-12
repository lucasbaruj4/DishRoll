import { supabase } from './supabase';

export type MacroTargets = {
  protein: number;
  carbs: number;
  fats: number;
};

export type GeneratedRecipeInput = {
  name: string;
  description: string;
  preparation_time: number;
  macros: {
    protein: number;
    carbs: number;
    fats: number;
    calories: number;
  };
  ingredients: Array<{
    name: string;
    amount: string;
    unit: string;
  }>;
  instructions: string[];
};

export type RecipeDirection = 'left' | 'right';

export type SavedRecipe = GeneratedRecipeInput & {
  id: string;
  user_id: string;
  is_saved: boolean;
};

type GenerateRecipeParams = {
  ingredientNames: string[];
  macros: MacroTargets;
  timeLimit: number;
};

type RecipeGenerationMode = 'openai' | 'local';

type GenerateRecipeBatchResult = {
  recipes: GeneratedRecipeInput[];
  mode: RecipeGenerationMode;
  warning: string | null;
};

const RECIPE_SUFFIXES = ['Power Bowl', 'Skillet', 'Stir-Fry'];
const GENERATE_RECIPES_FUNCTION = 'generate-recipes';
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? '';

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function macroWithOffset(base: number, offset: number) {
  return Math.max(0, Math.round(base * (1 + offset)));
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parsePositiveNumber(value: unknown, fallback: number) {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.round(parsed);
}

function sanitizeRecipe(
  value: unknown,
  index: number,
  params: GenerateRecipeParams
): GeneratedRecipeInput | null {
  if (!isObject(value)) {
    return null;
  }

  const rawMacros = isObject(value.macros) ? value.macros : {};
  const prep = clamp(parsePositiveNumber(value.preparation_time, params.timeLimit), 10, 90);

  const protein = clamp(parsePositiveNumber(rawMacros.protein, params.macros.protein), 1, 400);
  const carbs = clamp(parsePositiveNumber(rawMacros.carbs, params.macros.carbs), 1, 500);
  const fats = clamp(parsePositiveNumber(rawMacros.fats, params.macros.fats), 1, 250);
  const calories = clamp(parsePositiveNumber(rawMacros.calories, protein * 4 + carbs * 4 + fats * 9), 50, 5000);

  const ingredients = Array.isArray(value.ingredients)
    ? value.ingredients
        .filter(isObject)
        .map((item) => ({
          name: String(item.name ?? '').trim(),
          amount: String(item.amount ?? '').trim() || '1',
          unit: String(item.unit ?? '').trim() || 'serving',
        }))
        .filter((item) => item.name.length > 0)
        .slice(0, 12)
    : [];

  const instructions = Array.isArray(value.instructions)
    ? value.instructions
        .map((step) => String(step ?? '').trim())
        .filter(Boolean)
        .slice(0, 8)
    : [];

  if (ingredients.length === 0 || instructions.length === 0) {
    return null;
  }

  const fallbackName = `Recipe ${index + 1}`;
  const rawName = String(value.name ?? fallbackName).trim();
  const rawDescription = String(value.description ?? '').trim();

  return {
    name: rawName || fallbackName,
    description: rawDescription || `Built using your ingredients in ${prep} minutes or less.`,
    preparation_time: prep,
    macros: { protein, carbs, fats, calories },
    ingredients,
    instructions,
  };
}

function sanitizeRecipeList(
  items: unknown[],
  params: GenerateRecipeParams
): GeneratedRecipeInput[] {
  return items
    .map((item, index) => sanitizeRecipe(item, index, params))
    .filter((item): item is GeneratedRecipeInput => Boolean(item))
    .slice(0, 3);
}

async function invokeGenerateRecipes(accessToken: string, params: GenerateRecipeParams) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Missing Supabase env config in client.');
  }

  const functionsBaseUrl = SUPABASE_URL.replace('.supabase.co', '.functions.supabase.co');
  const response = await fetch(`${functionsBaseUrl}/${GENERATE_RECIPES_FUNCTION}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      ingredientNames: params.ingredientNames,
      macros: params.macros,
      timeLimit: params.timeLimit,
    }),
  });

  let parsedBody: unknown = null;
  try {
    parsedBody = await response.json();
  } catch {
    parsedBody = null;
  }

  if (!response.ok) {
    if (parsedBody) {
      throw new Error(JSON.stringify(parsedBody));
    }
    throw new Error(`HTTP ${response.status}`);
  }

  return parsedBody as { recipes?: unknown[] };
}

async function generateWithEdgeFunction(params: GenerateRecipeParams): Promise<GeneratedRecipeInput[]> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) {
    throw new Error(`Unable to read auth session (${sessionError.message})`);
  }

  let accessToken = sessionData.session?.access_token;
  if (!accessToken) {
    throw new Error('Missing auth token. Please sign in again.');
  }

  let data: { recipes?: unknown[] };
  try {
    data = await invokeGenerateRecipes(accessToken, params);
  } catch (error) {
    const firstError = error instanceof Error ? error.message : String(error);
    const isInvalidJwt = firstError.toLowerCase().includes('invalid jwt');
    if (isInvalidJwt) {
      const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
      if (!refreshError && refreshed.session?.access_token) {
        accessToken = refreshed.session.access_token;
        data = await invokeGenerateRecipes(accessToken, params);
      } else {
        throw new Error(firstError);
      }
    } else {
      throw new Error(firstError);
    }
  }

  const payload = data as { recipes?: unknown[] } | null;
  if (!payload || !Array.isArray(payload.recipes)) {
    throw new Error('edge_function_invalid_payload');
  }

  const sanitized = sanitizeRecipeList(payload.recipes, params);
  if (sanitized.length === 0) {
    throw new Error('edge_function_invalid_recipe_items');
  }

  return sanitized;
}

export function generateRecipeDrafts({
  ingredientNames,
  macros,
  timeLimit,
}: GenerateRecipeParams): GeneratedRecipeInput[] {
  if (ingredientNames.length === 0) {
    return [];
  }

  const available = ingredientNames.map((name) => name.trim()).filter(Boolean);
  const prep = clamp(Math.round(timeLimit), 10, 90);
  const offsets = [-0.08, 0, 0.08];

  return offsets.map((offset, index) => {
    const lead = available[index % available.length];
    const second = available[(index + 1) % available.length];
    const third = available[(index + 2) % available.length];
    const recipeName = `${lead} ${RECIPE_SUFFIXES[index % RECIPE_SUFFIXES.length]}`;
    const protein = macroWithOffset(macros.protein, offset);
    const carbs = macroWithOffset(macros.carbs, -offset / 2);
    const fats = macroWithOffset(macros.fats, offset / 2);
    const calories = protein * 4 + carbs * 4 + fats * 9;

    return {
      name: recipeName,
      description: `Built from your available ingredients: ${lead}, ${second}, ${third}.`,
      preparation_time: prep,
      macros: {
        protein,
        carbs,
        fats,
        calories,
      },
      ingredients: [
        { name: lead, amount: '200', unit: 'g' },
        { name: second, amount: '150', unit: 'g' },
        { name: third, amount: '100', unit: 'g' },
      ],
      instructions: [
        `Prep the ${lead}, ${second}, and ${third}.`,
        'Cook protein ingredients first, then add remaining ingredients.',
        'Season to taste and plate once heated through.',
      ],
    };
  });
}

export async function generateRecipeBatch(
  params: GenerateRecipeParams
): Promise<GenerateRecipeBatchResult> {
  const localRecipes = generateRecipeDrafts(params);
  if (localRecipes.length === 0) {
    return {
      recipes: [],
      mode: 'local',
      warning: null,
    };
  }

  try {
    const recipes = await generateWithEdgeFunction(params);
    return {
      recipes,
      mode: 'openai',
      warning: null,
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Remote generation failed';
    return {
      recipes: localRecipes,
      mode: 'local',
      warning: detail,
    };
  }
}

export async function saveGeneratedRecipes(
  userId: string,
  recipes: GeneratedRecipeInput[]
): Promise<SavedRecipe[]> {
  if (recipes.length === 0) {
    return [];
  }

  const payload = recipes.map((recipe) => ({
    user_id: userId,
    name: recipe.name,
    description: recipe.description,
    preparation_time: recipe.preparation_time,
    macros: recipe.macros,
    ingredients: recipe.ingredients,
    instructions: recipe.instructions,
    is_saved: false,
  }));

  const { data, error } = await supabase
    .from('recipes')
    .insert(payload)
    .select('id, user_id, name, description, preparation_time, macros, ingredients, instructions, is_saved');
  if (error) {
    throw error;
  }

  return (data ?? []) as SavedRecipe[];
}

export async function logRecipeSwipe(userId: string, recipeId: string, direction: RecipeDirection) {
  const { error: updateError } = await supabase
    .from('recipes')
    .update({ is_saved: direction === 'right' })
    .eq('id', recipeId)
    .eq('user_id', userId);

  if (updateError) {
    throw updateError;
  }

  const { error: insertError } = await supabase.from('swipe_history').insert({
    user_id: userId,
    recipe_id: recipeId,
    direction,
  });

  if (insertError) {
    throw insertError;
  }
}
