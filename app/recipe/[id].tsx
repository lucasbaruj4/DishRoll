import * as React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
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
            <View
              style={{
                borderRadius: 18,
                borderWidth: 1,
                borderColor: '#1f1f27',
                backgroundColor: '#121218',
                padding: 16,
                gap: 10,
              }}
            >
              <Text selectable style={{ color: '#8f8f98', fontSize: 12, letterSpacing: 1.6 }}>
                COMPLETE RECIPE
              </Text>
              <Text selectable style={{ color: '#f4f4f4', fontWeight: '700', fontSize: 27 }}>
                {recipe.name}
              </Text>
              <Text selectable style={{ color: '#b8b8c1', lineHeight: 21 }}>
                {recipe.description}
              </Text>
              <Text selectable style={{ color: '#9292a0' }}>
                Prep time: {recipe.preparation_time} min
              </Text>
            </View>

            <View
              style={{
                borderRadius: 14,
                borderWidth: 1,
                borderColor: '#23232d',
                backgroundColor: '#111118',
                padding: 14,
                gap: 10,
              }}
            >
              <Text selectable style={{ color: '#f4f4f4', fontSize: 18, fontWeight: '700' }}>
                Macros
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <View
                  style={{
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: '#2f3950',
                    backgroundColor: '#1d2533',
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                  }}
                >
                  <Text selectable style={{ color: '#a9d8ff', fontWeight: '700', fontSize: 12 }}>
                    P {recipe.macros.protein}g
                  </Text>
                </View>
                <View
                  style={{
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: '#4a3b24',
                    backgroundColor: '#2b2418',
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                  }}
                >
                  <Text selectable style={{ color: '#f4d08b', fontWeight: '700', fontSize: 12 }}>
                    C {recipe.macros.carbs}g
                  </Text>
                </View>
                <View
                  style={{
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: '#4d3041',
                    backgroundColor: '#2a1c26',
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                  }}
                >
                  <Text selectable style={{ color: '#ffc1d9', fontWeight: '700', fontSize: 12 }}>
                    F {recipe.macros.fats}g
                  </Text>
                </View>
                <View
                  style={{
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: '#30423a',
                    backgroundColor: '#1d2b26',
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                  }}
                >
                  <Text selectable style={{ color: '#bde9d6', fontWeight: '700', fontSize: 12 }}>
                    {Math.round(calories)} kcal
                  </Text>
                </View>
              </View>
            </View>

            <View
              style={{
                borderRadius: 14,
                borderWidth: 1,
                borderColor: '#23232d',
                backgroundColor: '#111118',
                padding: 14,
                gap: 10,
              }}
            >
              <Text selectable style={{ color: '#f4f4f4', fontSize: 18, fontWeight: '700' }}>
                Ingredients
              </Text>
              {recipe.ingredients.map((ingredient, idx) => {
                const amount = formatIngredientAmount(ingredient.amount, ingredient.unit);
                return (
                  <View
                    key={`${ingredient.name}-${idx}`}
                    style={{
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: '#232332',
                      backgroundColor: '#171722',
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      gap: 4,
                    }}
                  >
                    <Text selectable style={{ color: '#ececf3', fontWeight: '600', fontSize: 15 }}>
                      {ingredient.name}
                    </Text>
                    {amount ? (
                      <Text selectable style={{ color: '#9b9ba8', fontSize: 13 }}>
                        {amount}
                      </Text>
                    ) : null}
                  </View>
                );
              })}
            </View>

            <View
              style={{
                borderRadius: 14,
                borderWidth: 1,
                borderColor: '#23232d',
                backgroundColor: '#111118',
                padding: 14,
                gap: 10,
              }}
            >
              <Text selectable style={{ color: '#f4f4f4', fontSize: 18, fontWeight: '700' }}>
                Instructions
              </Text>
              {recipe.instructions.map((instruction, idx) => (
                <View
                  key={`${idx}-${instruction.slice(0, 24)}`}
                  style={{
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: '#232332',
                    backgroundColor: '#171722',
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    flexDirection: 'row',
                    gap: 10,
                  }}
                >
                  <Text
                    selectable
                    style={{
                      color: '#9fd2ff',
                      fontWeight: '700',
                      minWidth: 20,
                      textAlign: 'center',
                    }}
                  >
                    {idx + 1}
                  </Text>
                  <Text selectable style={{ color: '#d8d8e2', lineHeight: 20, flex: 1 }}>
                    {instruction}
                  </Text>
                </View>
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
