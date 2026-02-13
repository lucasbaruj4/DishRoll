# AGENTS.md - Macro Meal Planner

## Project Overview
iOS app for meal planning based on available ingredients and macro targets. Users swipe through AI-generated recipes, cook meals, and rate them.

**MVP Goal**: "Cook 5 different meals this week using only the app"

## Tech Stack
- React Native + Expo (iOS, develop on Windows)
- Supabase (backend + auth)
- OpenAI GPT-4o-mini (recipe generation, ~$0.002/batch)
- Expo Go (testing on iPhone)
- Cost: ~$5-10/month

## Project Structure
```
MacroMealPlanner/
├── app/
│   ├── (auth)/           # login, signup
│   ├── (tabs)/           # inventory, generate, saved, profile
│   └── recipe/[id].tsx   # recipe detail
├── components/           # UI components
├── services/             # supabase, auth, recipeGenerator, etc.
├── hooks/                # useIngredients, useRecipes, useAuth
├── types/                # TypeScript definitions
└── utils/                # helpers, prompts
```

## Database Schema (Supabase)

Run this in Supabase SQL Editor:

```sql
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
```

## Setup Instructions

### 1. Initialize Project
```bash
npx create-expo-app@latest MacroMealPlanner --template blank-typescript
cd MacroMealPlanner

# Install dependencies
npx expo install expo-router react-native-safe-area-context react-native-screens
npx expo install @supabase/supabase-js @react-native-async-storage/async-storage react-native-url-polyfill
npx expo install react-native-gesture-handler react-native-reanimated
npm install openai react-native-deck-swiper @expo/vector-icons
```

### 2. Environment Setup
Create `.env.local`:
```
EXPO_PUBLIC_SUPABASE_URL=your_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_key
EXPO_PUBLIC_OPENAI_API_KEY=your_key
```

Update `package.json`:
```json
{
  "main": "expo-router/entry"
}
```

### 3. Supabase Setup
1. Create project at supabase.com
2. Run database schema (above)
3. Enable Email auth in Authentication settings
4. Copy project URL and anon key to `.env.local`

## Key Implementation Details

### Supabase Client (`services/supabase.ts`)
```typescript
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
```

### Recipe Generator (`services/recipeGenerator.ts`)
```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY!,
});

const SYSTEM_PROMPT = `Generate recipes using ONLY provided ingredients that meet macro targets (±10%).
Output valid JSON:
{
  "name": "Recipe Name",
  "preparation_time": 30,
  "macros": {"protein": 40, "carbs": 50, "fats": 20, "calories": 500},
  "ingredients": [{"name": "chicken", "amount": "200", "unit": "g"}],
  "instructions": ["Step 1", "Step 2"]
}`;

export async function generateRecipe(ingredients: string[], macros, timeLimit, userId) {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Ingredients: ${ingredients.join(', ')}
Macros: ${macros.protein}g protein, ${macros.carbs}g carbs, ${macros.fats}g fats
Time: ${timeLimit} min` }
    ],
    temperature: 0.8,
    response_format: { type: 'json_object' },
  });
  
  return JSON.parse(completion.choices[0].message.content);
}
```

## MVP Features Checklist

Core features to implement:

1. **Auth Flow**
   - Login/signup screens
   - Auth context with session management
   - Protected routes

2. **Ingredient Inventory**
   - Add/edit/delete ingredients
   - Category grouping
   - Availability toggle

3. **Recipe Generation**
   - Macro input form
   - Generate 3 recipes via OpenAI
   - Save generated recipes to DB

4. **Swipe Interface**
   - Tinder-style card swiping
   - Right = save, Left = skip
   - Log swipes to database

5. **Saved Recipes**
   - List saved recipes
   - Navigate to detail view
   - Delete recipes

6. **Cooking Flow**
   - Recipe detail with instructions
   - Check off ingredients/steps
   - Rate recipe (👍/👎)

## Development Workflow

```bash
# Start dev server
npx expo start

# Scan QR with Expo Go app on iPhone
# Make changes → auto-reload on phone
```

## Documentation Rule

- When a relevant product, UX, infra, schema, or workflow change is made, add an entry to `docs/CHANGELOG.md` in the same work session.

## Common Issues

**RLS errors**: Check policies use `auth.uid() = user_id`  
**Env vars undefined**: Prefix with `EXPO_PUBLIC_`, restart server  
**Swiper not working**: Configure `react-native-gesture-handler` in root layout  
**Type errors**: Generate types: `npx supabase gen types typescript --project-id YOUR_ID`

## Success Criteria

- ✅ Generate recipes matching macros (±10%)
- ✅ Smooth swipe gestures
- ✅ Complete cooking flow works
- ✅ No critical bugs
- ✅ Cook 5 meals using only the app

## Post-MVP Ideas

- Voice cooking coach (Web Speech API)
- Swipe learning algorithm
- MacroFactor integration
- Camera for ingredient recognition
