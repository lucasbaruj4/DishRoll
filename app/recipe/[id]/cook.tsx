import * as React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../../hooks/useAuth';
import { getRecipeById } from '../../../services/recipeGenerator';

export default function RecipeCookScreen() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const recipeId = React.useMemo(() => {
    if (Array.isArray(id)) return id[0] ?? null;
    return id ?? null;
  }, [id]);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [recipeName, setRecipeName] = React.useState<string>('Recipe');
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (authLoading) return;

    if (!user || !recipeId) {
      setError('Recipe not found.');
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    getRecipeById(user.id, recipeId)
      .then((recipe) => {
        if (!active) return;
        if (!recipe) {
          setError('Recipe not found or you do not have access to it.');
          return;
        }
        setRecipeName(recipe.name);
      })
      .catch((err: unknown) => {
        if (!active) return;
        const message = err instanceof Error ? err.message : 'Failed to open cooking coach.';
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

  return (
    <View style={{ flex: 1, backgroundColor: '#0b0b0f' }}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Cook with AI',
          headerStyle: { backgroundColor: '#050506' },
          headerTintColor: '#f4f4f4',
          headerTitleStyle: { color: '#f4f4f4' },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: '#0b0b0f' },
        }}
      />

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: 20, gap: 14 }}
      >
        <View
          style={{
            borderRadius: 14,
            borderWidth: 1,
            borderColor: '#252530',
            backgroundColor: '#14141a',
            padding: 14,
            gap: 10,
          }}
        >
          <Text selectable style={{ color: '#f4f4f4', fontWeight: '700', fontSize: 20 }}>
            {loading ? 'Preparing coach...' : recipeName}
          </Text>
          {error ? (
            <Text selectable style={{ color: '#ffb9c5' }}>
              {error}
            </Text>
          ) : (
            <Text selectable style={{ color: '#b7b7c0', lineHeight: 20 }}>
              Chat interface will live here next. This route is now wired from recipe detail and
              validated against the signed-in user recipe access.
            </Text>
          )}
        </View>

        <Pressable
          onPress={() => router.back()}
          style={{
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#31313d',
            backgroundColor: '#171720',
            paddingVertical: 12,
            alignItems: 'center',
          }}
        >
          <Text selectable style={{ color: '#e4e4ed', fontWeight: '700' }}>
            Back to recipe
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
