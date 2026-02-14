import * as React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { getRecipeById, type SavedRecipe } from '../../services/recipeGenerator';

function formatIngredientAmount(amount: string, unit: string) {
  const trimmedAmount = amount.trim();
  const trimmedUnit = unit.trim();
  if (!trimmedAmount && !trimmedUnit) return '';
  if (!trimmedAmount) return trimmedUnit;
  if (!trimmedUnit) return trimmedAmount;
  return `${trimmedAmount} ${trimmedUnit}`;
}

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const recipeId = React.useMemo(() => {
    if (Array.isArray(id)) return id[0] ?? null;
    return id ?? null;
  }, [id]);
  const { user, loading: authLoading } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const router = useRouter();

  const [recipe, setRecipe] = React.useState<SavedRecipe | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (authLoading) return;

    if (!user || !recipeId) {
      setRecipe(null);
      setLoading(false);
      setError('Recipe not found.');
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    getRecipeById(user.id, recipeId)
      .then((data) => {
        if (!active) return;
        if (!data) {
          setRecipe(null);
          setError('Recipe not found or you do not have access to it.');
          return;
        }
        setRecipe(data);
      })
      .catch((err) => {
        if (!active) return;
        const message = err instanceof Error ? err.message : 'Failed to load recipe.';
        setRecipe(null);
        setError(message);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [authLoading, recipeId, user]);

  const calories = recipe
    ? Number.isFinite(recipe.macros.calories)
      ? recipe.macros.calories
      : recipe.macros.protein * 4 + recipe.macros.carbs * 4 + recipe.macros.fats * 9
    : 0;
  const macroGridColumns = width <= 340 ? 1 : 2;
  const macroCardBasis = macroGridColumns === 1 ? '100%' : '48%';

  return (
    <View style={{ flex: 1, backgroundColor: '#0b0b0f' }}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: recipe?.name ?? 'Recipe',
          headerBackButtonDisplayMode: 'minimal',
          headerStyle: { backgroundColor: '#050506' },
          headerTintColor: '#f4f4f4',
          headerTitleStyle: { color: '#f4f4f4' },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: '#0b0b0f' },
        }}
      />

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: 20,
          gap: 14,
          paddingBottom: 130 + insets.bottom,
        }}
      >
        {loading ? (
          <View
            style={{
              borderRadius: 14,
              borderWidth: 1,
              borderColor: '#252530',
              backgroundColor: '#14141a',
              padding: 16,
              gap: 10,
              alignItems: 'center',
            }}
          >
            <ActivityIndicator color="#a8a8b3" />
            <Text selectable style={{ color: '#b5b5bf' }}>
              Loading recipe...
            </Text>
          </View>
        ) : null}

        {!loading && error ? (
          <View
            style={{
              borderRadius: 14,
              borderWidth: 1,
              borderColor: '#4f2a30',
              backgroundColor: '#201316',
              padding: 14,
              gap: 10,
            }}
          >
            <Text selectable style={{ color: '#ffadb8', fontWeight: '700' }}>
              Could not open recipe
            </Text>
            <Text selectable style={{ color: '#ffd1d8' }}>
              {error}
            </Text>
            <Pressable
              onPress={() => router.back()}
              style={{
                marginTop: 2,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: '#5c3940',
                backgroundColor: '#2a171c',
                paddingVertical: 10,
                alignItems: 'center',
              }}
            >
              <Text selectable style={{ color: '#ffd6dd', fontWeight: '700' }}>
                Go back
              </Text>
            </Pressable>
          </View>
        ) : null}

        {!loading && recipe ? (
          <>
            <View style={{ gap: 10 }}>
              <Text selectable style={{ color: '#8f8f98', fontSize: 12, letterSpacing: 1.6 }}>
                COMPLETE RECIPE
              </Text>
              <Text selectable style={{ color: '#f4f4f4', fontWeight: '800', fontSize: 34, lineHeight: 38 }}>
                {recipe.name}
              </Text>
              <Text selectable style={{ color: '#c0c0cc', fontSize: 22, lineHeight: 30 }}>
                {recipe.description}
              </Text>
              <Text selectable style={{ color: '#9a9aac', fontSize: 18 }}>
                Prep time: {recipe.preparation_time} min
              </Text>
            </View>

            <View style={{ gap: 10 }}>
              <Text
                selectable
                style={{ color: '#f4f4f4', fontSize: 30, lineHeight: 34, fontWeight: '800' }}
              >
                Macros
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                <View
                  style={{
                    flexBasis: macroCardBasis,
                    minHeight: 120,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: '#2f3950',
                    backgroundColor: '#1d2533',
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    justifyContent: 'space-between',
                  }}
                >
                  <Text selectable style={{ color: '#b8dcff', fontSize: 13, fontWeight: '600' }}>
                    Protein
                  </Text>
                  <Text selectable style={{ color: '#d9edff', fontSize: 34, fontWeight: '800' }}>
                    {recipe.macros.protein}g
                  </Text>
                </View>
                <View
                  style={{
                    flexBasis: macroCardBasis,
                    minHeight: 120,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: '#4a3b24',
                    backgroundColor: '#2b2418',
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    justifyContent: 'space-between',
                  }}
                >
                  <Text selectable style={{ color: '#f3ddb2', fontSize: 13, fontWeight: '600' }}>
                    Carbs
                  </Text>
                  <Text selectable style={{ color: '#fff0d0', fontSize: 34, fontWeight: '800' }}>
                    {recipe.macros.carbs}g
                  </Text>
                </View>
                <View
                  style={{
                    flexBasis: macroCardBasis,
                    minHeight: 120,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: '#4d3041',
                    backgroundColor: '#2a1c26',
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    justifyContent: 'space-between',
                  }}
                >
                  <Text selectable style={{ color: '#f0c3d5', fontSize: 13, fontWeight: '600' }}>
                    Fats
                  </Text>
                  <Text selectable style={{ color: '#ffdcec', fontSize: 34, fontWeight: '800' }}>
                    {recipe.macros.fats}g
                  </Text>
                </View>
                <View
                  style={{
                    flexBasis: macroCardBasis,
                    minHeight: 120,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: '#30423a',
                    backgroundColor: '#1d2b26',
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    justifyContent: 'space-between',
                  }}
                >
                  <Text selectable style={{ color: '#cae9dc', fontSize: 13, fontWeight: '600' }}>
                    Calories
                  </Text>
                  <Text selectable style={{ color: '#d8fff0', fontSize: 34, fontWeight: '800' }}>
                    {Math.round(calories)}
                  </Text>
                </View>
              </View>
            </View>

            <View style={{ gap: 10 }}>
              <Text
                selectable
                style={{ color: '#f4f4f4', fontSize: 30, lineHeight: 34, fontWeight: '800' }}
              >
                Ingredients
              </Text>
              {recipe.ingredients.map((ingredient, idx) => {
                const amount = formatIngredientAmount(ingredient.amount, ingredient.unit);
                return (
                  <Text
                    key={`${ingredient.name}-${idx}`}
                    selectable
                    style={{ color: '#e5e5ef', lineHeight: 30, fontSize: 22, fontWeight: '500' }}
                  >
                    <Text selectable style={{ color: '#9fd2ff', fontWeight: '700' }}>
                      {idx + 1}.
                    </Text>{' '}
                    {ingredient.name}
                    {amount ? (
                      <Text selectable style={{ color: '#a5a5b3', fontSize: 18, fontWeight: '400' }}>
                        {' '}
                        ({amount})
                      </Text>
                    ) : null}
                  </Text>
                );
              })}
            </View>

            <View style={{ gap: 10 }}>
              <Text
                selectable
                style={{ color: '#f4f4f4', fontSize: 30, lineHeight: 34, fontWeight: '800' }}
              >
                Instructions
              </Text>
              {recipe.instructions.map((instruction, idx) => (
                <Text
                  key={`${idx}-${instruction.slice(0, 24)}`}
                  selectable
                  style={{ color: '#e5e5ef', lineHeight: 30, fontSize: 22, fontWeight: '500' }}
                >
                  <Text selectable style={{ color: '#9fd2ff', fontWeight: '700' }}>
                    {idx + 1}.
                  </Text>{' '}
                  {instruction}
                </Text>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>

      {recipe ? (
        <View
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            left: 20,
            right: 20,
            bottom: 16 + insets.bottom,
          }}
        >
          <Pressable
            onPress={() => router.push(`/recipe/${recipe.id}/cook`)}
            style={{
              borderRadius: 14,
              borderWidth: 1,
              borderColor: '#4e5c72',
              backgroundColor: '#e9eef6',
              paddingVertical: 14,
              alignItems: 'center',
            }}
          >
            <Text selectable style={{ color: '#11131a', fontWeight: '800', fontSize: 16 }}>
              Cook with AI
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
