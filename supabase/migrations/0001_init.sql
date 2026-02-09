-- Macro Meal Planner - initial schema

-- Profiles
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  default_macros JSONB DEFAULT '{"protein": 150, "carbs": 200, "fats": 60}'::jsonb
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own profile" ON profiles FOR ALL USING (auth.uid() = id);

-- Ingredients
CREATE TABLE ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity TEXT,
  category TEXT,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON ingredients(user_id);
CREATE UNIQUE INDEX ON ingredients (user_id, lower(name));
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own ingredients" ON ingredients FOR ALL USING (auth.uid() = user_id);

-- Recipes
CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  preparation_time INTEGER NOT NULL CHECK (preparation_time > 0),
  macros JSONB NOT NULL,
  ingredients JSONB NOT NULL,
  instructions TEXT[] NOT NULL,
  is_saved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON recipes(user_id, is_saved);
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own recipes" ON recipes FOR ALL USING (auth.uid() = user_id);

-- Ratings
CREATE TABLE recipe_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating BOOLEAN NOT NULL,
  cooked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(recipe_id, user_id)
);
ALTER TABLE recipe_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own ratings" ON recipe_ratings FOR ALL USING (auth.uid() = user_id);

-- Swipe history
CREATE TABLE swipe_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('left', 'right')),
  swiped_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE swipe_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own swipes" ON swipe_history FOR ALL USING (auth.uid() = user_id);

-- updated_at triggers
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_ingredients_updated_at
BEFORE UPDATE ON ingredients
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_recipes_updated_at
BEFORE UPDATE ON recipes
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
