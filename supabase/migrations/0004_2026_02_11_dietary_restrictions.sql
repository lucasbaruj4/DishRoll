-- 2026-02-11
-- Add source-of-truth dietary restrictions for onboarding step 2.
-- Pattern mirrors ingredient catalog + user join table.

-- Global catalog of restrictions (allergies + disliked foods).
CREATE TABLE IF NOT EXISTS dietary_restriction_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('allergy', 'dislike')),
  search_terms TEXT[] NOT NULL DEFAULT '{}'::text[],
  sort_order INTEGER NOT NULL DEFAULT 1000,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS dietary_restriction_catalog_active_idx
  ON dietary_restriction_catalog (is_active, kind, sort_order);

ALTER TABLE dietary_restriction_catalog ENABLE ROW LEVEL SECURITY;

-- Read-only for authenticated clients.
CREATE POLICY "Authenticated users can read dietary restriction catalog"
  ON dietary_restriction_catalog
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- User selections against the restriction catalog.
CREATE TABLE IF NOT EXISTS user_dietary_restrictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  restriction_id UUID NOT NULL REFERENCES dietary_restriction_catalog(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, restriction_id)
);

CREATE INDEX IF NOT EXISTS user_dietary_restrictions_user_idx
  ON user_dietary_restrictions (user_id);

CREATE INDEX IF NOT EXISTS user_dietary_restrictions_restriction_idx
  ON user_dietary_restrictions (restriction_id);

ALTER TABLE user_dietary_restrictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own dietary restrictions"
  ON user_dietary_restrictions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Reuse existing set_updated_at() trigger function from initial schema.
DROP TRIGGER IF EXISTS set_dietary_restriction_catalog_updated_at ON dietary_restriction_catalog;
CREATE TRIGGER set_dietary_restriction_catalog_updated_at
BEFORE UPDATE ON dietary_restriction_catalog
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_user_dietary_restrictions_updated_at ON user_dietary_restrictions;
CREATE TRIGGER set_user_dietary_restrictions_updated_at
BEFORE UPDATE ON user_dietary_restrictions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Seed common options for onboarding quick-pick.
INSERT INTO dietary_restriction_catalog (slug, name, kind, search_terms, sort_order)
VALUES
  ('peanut-allergy', 'Peanut Allergy', 'allergy', ARRAY['peanut', 'nuts'], 10),
  ('tree-nut-allergy', 'Tree Nut Allergy', 'allergy', ARRAY['almond', 'cashew', 'walnut'], 20),
  ('dairy-allergy', 'Dairy Allergy', 'allergy', ARRAY['milk', 'cheese', 'lactose'], 30),
  ('egg-allergy', 'Egg Allergy', 'allergy', ARRAY['eggs'], 40),
  ('soy-allergy', 'Soy Allergy', 'allergy', ARRAY['soy', 'tofu'], 50),
  ('wheat-allergy', 'Wheat Allergy', 'allergy', ARRAY['gluten', 'wheat'], 60),
  ('shellfish-allergy', 'Shellfish Allergy', 'allergy', ARRAY['shrimp', 'crab', 'lobster'], 70),
  ('fish-allergy', 'Fish Allergy', 'allergy', ARRAY['salmon', 'tuna'], 80),
  ('sesame-allergy', 'Sesame Allergy', 'allergy', ARRAY['sesame'], 90),
  ('pork-dislike', 'Dislike Pork', 'dislike', ARRAY['pork', 'bacon'], 200),
  ('beef-dislike', 'Dislike Beef', 'dislike', ARRAY['beef'], 210),
  ('seafood-dislike', 'Dislike Seafood', 'dislike', ARRAY['fish', 'shrimp'], 220),
  ('mushroom-dislike', 'Dislike Mushrooms', 'dislike', ARRAY['mushroom'], 230),
  ('cilantro-dislike', 'Dislike Cilantro', 'dislike', ARRAY['coriander'], 240),
  ('spicy-food-dislike', 'Dislike Spicy Food', 'dislike', ARRAY['spicy', 'chili'], 250),
  ('organ-meat-dislike', 'Dislike Organ Meats', 'dislike', ARRAY['liver', 'kidney'], 260),
  ('lamb-dislike', 'Dislike Lamb', 'dislike', ARRAY['lamb'], 270),
  ('tofu-dislike', 'Dislike Tofu', 'dislike', ARRAY['soy', 'tofu'], 280)
ON CONFLICT (slug) DO UPDATE
SET
  name = EXCLUDED.name,
  kind = EXCLUDED.kind,
  search_terms = EXCLUDED.search_terms,
  sort_order = EXCLUDED.sort_order,
  is_active = true,
  updated_at = NOW();
