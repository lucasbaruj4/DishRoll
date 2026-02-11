-- 2026-02-11
-- Add normalized cooking levels (5 fixed points) and connect selection to profiles.

CREATE TABLE IF NOT EXISTS cooking_level_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT NOT NULL,
  rank SMALLINT NOT NULL UNIQUE CHECK (rank BETWEEN 1 AND 5),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS cooking_level_catalog_active_rank_idx
  ON cooking_level_catalog (is_active, rank);

ALTER TABLE cooking_level_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read cooking level catalog"
  ON cooking_level_catalog
  FOR SELECT
  USING (auth.role() = 'authenticated');

DROP TRIGGER IF EXISTS set_cooking_level_catalog_updated_at ON cooking_level_catalog;
CREATE TRIGGER set_cooking_level_catalog_updated_at
BEFORE UPDATE ON cooking_level_catalog
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS cooking_level_id UUID REFERENCES cooking_level_catalog(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS profiles_cooking_level_id_idx
  ON profiles (cooking_level_id);

INSERT INTO cooking_level_catalog (code, label, description, rank)
VALUES
  ('beginner', 'Beginner', 'New to cooking, prefers very simple recipes.', 1),
  ('basic', 'Basic', 'Comfortable with simple prep and short recipes.', 2),
  ('intermediate', 'Intermediate', 'Can follow multi-step recipes confidently.', 3),
  ('advanced', 'Advanced', 'Comfortable with technique-heavy recipes.', 4),
  ('experienced', 'Experienced', 'Highly confident, can handle complex meals.', 5)
ON CONFLICT (code) DO UPDATE
SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  rank = EXCLUDED.rank,
  is_active = true,
  updated_at = NOW();
