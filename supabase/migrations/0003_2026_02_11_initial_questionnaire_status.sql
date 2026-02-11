-- 2026-02-11
-- Track whether a user has finished the initial onboarding questionnaire.
-- This enables deterministic routing after login.

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS initial_questionnaire_completed BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS initial_questionnaire_step TEXT NOT NULL DEFAULT 'ingredients';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_initial_questionnaire_step_check'
  ) THEN
    ALTER TABLE profiles
    ADD CONSTRAINT profiles_initial_questionnaire_step_check
    CHECK (
      initial_questionnaire_step IN ('ingredients', 'allergies', 'level', 'complete')
    );
  END IF;
END $$;
