-- 2026-02-11
-- Onboarding questionnaire update:
-- Replace per-user freeform ingredients with:
-- 1) ingredient_catalog: global source of truth for known ingredients
-- 2) user_ingredients: user <-> ingredient relationship table

-- Optional cleanup if the old table still exists.
-- Safe when already deleted manually.
DROP TABLE IF EXISTS ingredients CASCADE;

-- Global ingredient catalog.
-- This table should contain one canonical row per ingredient.
CREATE TABLE IF NOT EXISTS ingredient_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  search_terms TEXT[] NOT NULL DEFAULT '{}'::text[],
  icon_key TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 1000,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ingredient_catalog_active_idx
  ON ingredient_catalog (is_active, category, sort_order);

ALTER TABLE ingredient_catalog ENABLE ROW LEVEL SECURITY;

-- Authenticated app users can read active catalog rows.
CREATE POLICY "Authenticated users can read ingredient catalog"
  ON ingredient_catalog
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- No write policy is added for clients on purpose.
-- Catalog writes should happen via SQL editor, migrations, or server-side flows.

-- User ingredient selections (join table).
CREATE TABLE IF NOT EXISTS user_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  catalog_id UUID NOT NULL REFERENCES ingredient_catalog(id) ON DELETE CASCADE,
  is_available BOOLEAN NOT NULL DEFAULT true,
  source TEXT NOT NULL DEFAULT 'questionnaire'
    CHECK (source IN ('questionnaire', 'manual')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, catalog_id)
);

CREATE INDEX IF NOT EXISTS user_ingredients_user_available_idx
  ON user_ingredients (user_id, is_available);

CREATE INDEX IF NOT EXISTS user_ingredients_catalog_idx
  ON user_ingredients (catalog_id);

ALTER TABLE user_ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own user_ingredients"
  ON user_ingredients
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Keep updated_at current on writes.
DROP TRIGGER IF EXISTS set_ingredient_catalog_updated_at ON ingredient_catalog;
CREATE TRIGGER set_ingredient_catalog_updated_at
BEFORE UPDATE ON ingredient_catalog
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_user_ingredients_updated_at ON user_ingredients;
CREATE TRIGGER set_user_ingredients_updated_at
BEFORE UPDATE ON user_ingredients
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Seed popular ingredients used by onboarding quick-pick UI.
-- icon_key should match app asset keys.
INSERT INTO ingredient_catalog (slug, name, category, search_terms, icon_key, sort_order)
VALUES
  ('chicken-breast', 'Chicken Breast', 'protein', ARRAY['chicken', 'poultry'], 'chicken-breast', 10),
  ('ground-beef', 'Ground Beef', 'protein', ARRAY['beef', 'meat'], 'ground-beef', 20),
  ('salmon', 'Salmon', 'protein', ARRAY['fish', 'seafood'], 'salmon', 30),
  ('eggs', 'Eggs', 'protein', ARRAY['egg'], 'eggs', 40),
  ('tofu', 'Tofu', 'protein', ARRAY['soy', 'plant-protein'], 'tofu', 50),
  ('greek-yogurt', 'Greek Yogurt', 'protein', ARRAY['yogurt', 'dairy'], 'greek-yogurt', 60),
  ('rice', 'Rice', 'carb', ARRAY['white rice', 'brown rice'], 'rice', 70),
  ('pasta', 'Pasta', 'carb', ARRAY['noodles'], 'pasta', 80),
  ('oats', 'Oats', 'carb', ARRAY['oatmeal'], 'oats', 90),
  ('potato', 'Potato', 'carb', ARRAY['potatoes'], 'potato', 100),
  ('sweet-potato', 'Sweet Potato', 'carb', ARRAY['yam'], 'sweet-potato', 110),
  ('quinoa', 'Quinoa', 'carb', ARRAY['grain'], 'quinoa', 120),
  ('broccoli', 'Broccoli', 'vegetable', ARRAY['greens'], 'broccoli', 130),
  ('spinach', 'Spinach', 'vegetable', ARRAY['leafy greens'], 'spinach', 140),
  ('bell-pepper', 'Bell Pepper', 'vegetable', ARRAY['peppers'], 'bell-pepper', 150),
  ('onion', 'Onion', 'vegetable', ARRAY['yellow onion', 'red onion'], 'onion', 160),
  ('tomato', 'Tomato', 'vegetable', ARRAY['tomatoes'], 'tomato', 170),
  ('mushroom', 'Mushroom', 'vegetable', ARRAY['mushrooms'], 'mushroom', 180),
  ('avocado', 'Avocado', 'fat', ARRAY['healthy fat'], 'avocado', 190),
  ('olive-oil', 'Olive Oil', 'fat', ARRAY['oil'], 'olive-oil', 200),
  ('butter', 'Butter', 'fat', ARRAY['dairy fat'], 'butter', 210),
  ('almonds', 'Almonds', 'fat', ARRAY['nuts'], 'almonds', 220),
  ('black-beans', 'Black Beans', 'legume', ARRAY['beans'], 'black-beans', 230),
  ('lentils', 'Lentils', 'legume', ARRAY['dal'], 'lentils', 240),
  ('chickpeas', 'Chickpeas', 'legume', ARRAY['garbanzo'], 'chickpeas', 250),
  ('banana', 'Banana', 'fruit', ARRAY['bananas'], 'banana', 260),
  ('apple', 'Apple', 'fruit', ARRAY['apples'], 'apple', 270),
  ('blueberries', 'Blueberries', 'fruit', ARRAY['berries'], 'blueberries', 280),
  ('milk', 'Milk', 'dairy', ARRAY['whole milk', 'skim milk'], 'milk', 290),
  ('cheddar-cheese', 'Cheddar Cheese', 'dairy', ARRAY['cheese'], 'cheddar-cheese', 300)
ON CONFLICT (slug) DO UPDATE
SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  search_terms = EXCLUDED.search_terms,
  icon_key = EXCLUDED.icon_key,
  sort_order = EXCLUDED.sort_order,
  is_active = true,
  updated_at = NOW();
