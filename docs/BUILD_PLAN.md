# Build Plan

Progress (as of 2026-02-09)
- Foundation: complete
- Auth flow: complete (login/signup + protected routes)
- Ingredient inventory: basic CRUD + availability toggle complete
- Security baseline: RLS dev check wired, env secrets protected

Skill Routing (apply when matching tasks appear)
- `building-native-ui`: Any Expo Router structure, navigation, layout, UI components, animations, or native tabs.
- `native-data-fetching`: Any network request, Supabase call, OpenAI call, auth token handling, caching, or offline behavior.
- `supabase-postgres-best-practices`: Any SQL, schema, indexes, RLS policies, or DB performance review.
- `react-native-best-practices`: Any performance, jank, re-renders, list virtualization, bundle size, or animation profiling work.

1. Foundation
1. Create Expo Router structure and root layout.
1. Set up Supabase client and auth context.
1. Wire env vars and verify Expo Go connects.

Skills
- `building-native-ui` for router/layout and route conventions.
- `native-data-fetching` for Supabase client setup and env var usage.

Deliverables
- `services/supabase.ts`
- `hooks/useAuth.ts`
- `app/_layout.tsx`
- `app/(auth)/`
- `app/(tabs)/`

2. Auth Flow
1. Login/signup screens.
1. Session persistence + protected routes.
1. Onboarding screens (intro + kitchen selection).

Skills
- `building-native-ui` for auth screens and route protection.
- `native-data-fetching` for auth/session handling.

Acceptance
- New user can sign up, log in, and is routed to tabs.
- Session survives app reload.
- Onboarding flow routes to signup and then kitchen selection.

3. Ingredient Inventory
1. CRUD ingredients.
1. Category grouping + availability toggle.
1. `useIngredients` hook and list UI.

Skills
- `building-native-ui` for list UI and controls.
- `native-data-fetching` for CRUD calls and caching.
- `react-native-best-practices` for list virtualization if the list grows.

Acceptance
- Ingredients list reflects DB.
- Toggle availability is instant and persists.

4. Recipe Generation
1. Macro input form.
1. Generate 3 recipes via OpenAI.
1. Save recipes to DB.

Skills
- `building-native-ui` for form UI and validation UX.
- `native-data-fetching` for OpenAI + Supabase requests, error handling, and throttling.

Acceptance
- Generates 3 distinct recipes that match macros.
- Recipes saved and visible in Saved list.

5. Swipe Interface
1. Tinder-style swipe UI.
1. Right = save, left = skip.
1. Log swipes in DB.

Skills
- `building-native-ui` for gesture UI patterns.
- `native-data-fetching` for swipe logging.
- `react-native-best-practices` for gesture performance and avoiding JS-thread jank.

Acceptance
- Swiping updates saved state and logs history.

6. Saved Recipes + Detail
1. Saved list.
1. Recipe detail view with ingredients + instructions.
1. Delete recipe.

Skills
- `building-native-ui` for list + detail layouts and navigation.
- `native-data-fetching` for read/delete operations.
- `react-native-best-practices` for long list performance.

Acceptance
- Saved list matches DB.
- Detail screen loads reliably by recipe id.

7. Cooking Flow
1. Checkable ingredients/steps.
1. Rating (👍/👎) saved to DB.

Skills
- `building-native-ui` for checkable steps and rating UI.
- `native-data-fetching` for rating writes and idempotency.

Acceptance
- Ratings stored once per user per recipe.

8. Security Baseline (Day 1)
1. Enforce RLS on all tables and verify policies only allow `auth.uid()` access.
1. Never ship service role keys to clients. Use only anon key in app.
1. Lock down Supabase auth: email auth only, disable public sign-ups if needed.
1. Validate OpenAI inputs and outputs, enforce JSON schema, and strip unsafe content.
1. Prevent prompt injection: isolate user input, never include secrets in prompts.
1. Avoid logging PII or API keys in client logs or analytics.
1. Add basic rate limiting or request throttling for recipe generation.
1. Store secrets only in `.env.local`, never commit to git.

Skills
- `supabase-postgres-best-practices` for RLS policy correctness and schema/index review.
- `native-data-fetching` for OpenAI request validation, retries, and throttling.

Acceptance
- All tables have RLS enabled and verified by tests.
- No secrets present in app bundle or logs.
- Recipe generation only accepts sanitized inputs and validates outputs.

9. Stabilization
1. RLS checks, error states.
1. Basic UI polish.
1. Smoke test: "Cook 5 different meals this week."

Skills
- `react-native-best-practices` for profiling, re-renders, and list performance.
- `building-native-ui` for final polish and navigation consistency.

Acceptance
- No critical flows blocked.
- All MVP success criteria satisfied.
