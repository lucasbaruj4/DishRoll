# OpenAI Edge Function Setup

This project now calls OpenAI only from a Supabase Edge Function (`generate-recipes`), not from the mobile client.

## 1. Run latest migrations

Ensure `recipe_generation_logs` exists for rate limiting and usage logging:

```bash
supabase db push --project-ref YOUR_PROJECT_REF
```

## 2. Set server-side secret

Use Supabase CLI:

```bash
supabase secrets set OPENAI_API_KEY=YOUR_OPENAI_API_KEY --project-ref YOUR_PROJECT_REF
```

Or set `OPENAI_API_KEY` in the Supabase Dashboard for your project.

Optional: override the model used by the function. If unset, it defaults to `gpt-4o-mini`.

```bash
supabase secrets set OPENAI_MODEL=gpt-4o-mini --project-ref YOUR_PROJECT_REF
```

## 3. Deploy the function

```bash
supabase functions deploy generate-recipes --project-ref YOUR_PROJECT_REF
```

## 4. Verify client env

Only client-safe keys should be present in `.env.local`:

```env
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

Do not add any OpenAI secret to `.env.local`.

## 5. Restart Expo

After env changes and function deploy:

```bash
npx expo start
```

## OpenAI Prompt + Model (Current)

- Function: `supabase/functions/generate-recipes/index.ts`
- API endpoint: `https://api.openai.com/v1/chat/completions`
- Default model: `gpt-4o-mini` (or `OPENAI_MODEL` secret if provided)

System message:

```text
You generate practical recipes. Return only valid JSON.
```

User prompt template:

```text
Generate 3 distinct meal recipes.
Use only these ingredients: <ingredients list>.
Target macros per recipe near: protein <P>g, carbs <C>g, fats <F>g.
Keep preparation time at or under <T> minutes.

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
}
```

## Fast Dev Testing

Testing-only note: use low-cost model overrides for development/testing, not for production quality expectations.

For low-cost testing:

1. Use a low-cost model via `OPENAI_MODEL` secret.
2. Keep recipe batches at 3 (current behavior).
3. Keep ingredient count small and realistic (fewer tokens in prompt).
