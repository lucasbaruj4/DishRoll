-- 2026-02-11
-- Clarify questionnaire step naming:
-- level -> cooking_level

UPDATE profiles
SET initial_questionnaire_step = 'cooking_level'
WHERE initial_questionnaire_step = 'level';

ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_initial_questionnaire_step_check;

ALTER TABLE profiles
ADD CONSTRAINT profiles_initial_questionnaire_step_check
CHECK (
  initial_questionnaire_step IN ('ingredients', 'allergies', 'cooking_level', 'complete')
);
