# Changelog

## 2026-02-11
- Continuing frontend refinement on onboarding and auth-related UX details.
- Backend feature work is queued next after onboarding polish is finalized.
- Fixed onboarding carousel card clipping and edge overflow behavior.
- Added animated onboarding background circles and scroll-linked pagination dots.
- Tuned card spacing and indicator sizing for cleaner slide transitions.
- Started planning the post-signup `initial_questionaire` flow for new users.
- Defined three-step questionnaire scope: available ingredients, allergies/disliked foods, and cooking level.
- Beginning implementation with the first questionnaire screen focused on ingredient selection UI.
- Added `initial_questionaire` route pipeline and wired signup redirect to the ingredient step.
- Implemented ingredient questionnaire UI with searchable quick-pick tiles backed by `ingredient_catalog`.
- Added persistence from ingredient questionnaire selections into `user_ingredients`.
- Added profile-based questionnaire gating so logged-in users are redirected to onboarding until setup is complete.
- Added dietary restriction source-of-truth schema: `dietary_restriction_catalog` + `user_dietary_restrictions` with RLS and seed options.
- Added fully implemented allergies/dislikes questionnaire step with searchable catalog UI and persistence to `user_dietary_restrictions`.
- Refactored questionnaire persistence into shared service utilities and renamed step state from `level` to `cooking_level` for clarity.
- Added normalized `cooking_level_catalog` (5-point scale) and implemented step 3 with a fixed-stop slider UI that saves selected level to user profile.
- Fixed onboarding resume routing so incomplete users return to their saved questionnaire step instead of always restarting at ingredients.
- Polished cooking-level slider interaction by locking page scroll during drag and fixing knob edge alignment at both track extremes.

## 2026-02-09
- Scaffolded Expo Router structure with auth and tab layouts.
- Added Supabase client setup with auth persistence.
- Implemented auth flow (login/signup) with protected routing.
- Added onboarding and kitchen selection screens.
- Built ingredient inventory CRUD + availability toggle.
- Added dev-only RLS sanity check.
- Created initial Supabase schema migration in `supabase/migrations/0001_init.sql`.
- Updated build plan progress tracking.
- Applied dark mode styling across key screens.
