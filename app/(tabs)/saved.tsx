import * as React from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../hooks/useAuth';
import { deleteRecipe, listSavedRecipes, type SavedRecipe } from '../../services/recipeGenerator';

export default function SavedScreen() {
  const { user } = useAuth();
  const [recipes, setRecipes] = React.useState<SavedRecipe[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const loadSavedRecipes = React.useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (!user) {
        setRecipes([]);
        return;
      }

      if (mode === 'refresh') {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const rows = await listSavedRecipes(user.id);
        setRecipes(rows);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load saved recipes.';
        setError(message);
      } finally {
        if (mode === 'refresh') {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    },
    [user]
  );

  useFocusEffect(
    React.useCallback(() => {
      void loadSavedRecipes('initial');
    }, [loadSavedRecipes])
  );

  const handleDelete = React.useCallback(
    (recipe: SavedRecipe) => {
      if (!user || deletingId) return;

      Alert.alert('Delete recipe?', recipe.name, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setDeletingId(recipe.id);
            setError(null);
            deleteRecipe(user.id, recipe.id)
              .then(() => {
                setRecipes((prev) => prev.filter((item) => item.id !== recipe.id));
              })
              .catch((err) => {
                const message = err instanceof Error ? err.message : 'Failed to delete recipe.';
                setError(message);
              })
              .finally(() => {
                setDeletingId(null);
              });
          },
        },
      ]);
    },
    [deletingId, user]
  );

  const hasRecipes = recipes.length > 0;

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: '#0b0b0f' }}
      contentContainerStyle={{ padding: 24, gap: 16, flexGrow: 1 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            void loadSavedRecipes('refresh');
          }}
          tintColor="#a8a8b3"
        />
      }
    >
      <View
        style={{
          borderRadius: 20,
          borderWidth: 1,
          borderColor: '#1f1f27',
          backgroundColor: '#121218',
          padding: 18,
          gap: 8,
        }}
      >
        <Text selectable style={{ color: '#8f8f98', fontSize: 12, letterSpacing: 1.8 }}>
          COLLECTION
        </Text>
        <Text selectable style={{ fontSize: 26, fontWeight: '700', color: '#f4f4f4' }}>
          Saved Recipes
        </Text>
        <Text selectable style={{ color: '#b3b3b3', lineHeight: 20 }}>
          Recipes you keep from swiping right will appear here.
        </Text>
      </View>

      {error ? (
        <View
          style={{
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#4f2a30',
            backgroundColor: '#201316',
            padding: 12,
          }}
        >
          <Text selectable style={{ color: '#ff9eaa' }}>
            {error}
          </Text>
        </View>
      ) : null}

      {loading ? (
        <View
          style={{
            borderRadius: 14,
            borderWidth: 1,
            borderColor: '#252530',
            backgroundColor: '#14141a',
            padding: 14,
          }}
        >
          <Text selectable style={{ color: '#a7a7b1' }}>
            Loading saved recipes...
          </Text>
        </View>
      ) : null}

      {!loading && !hasRecipes ? (
        <View
          style={{
            borderRadius: 14,
            borderWidth: 1,
            borderColor: '#252530',
            backgroundColor: '#14141a',
            padding: 14,
            gap: 6,
          }}
        >
          <Text selectable style={{ color: '#f4f4f4', fontWeight: '700' }}>
            No saved recipes yet
          </Text>
          <Text selectable style={{ color: '#a7a7b1' }}>
            Swipe right in Generate to keep recipes here.
          </Text>
        </View>
      ) : null}

      {recipes.map((recipe) => {
        const isDeleting = deletingId === recipe.id;
        return (
          <View
            key={recipe.id}
            style={{
              borderRadius: 14,
              borderWidth: 1,
              borderColor: '#252530',
              backgroundColor: '#14141a',
              padding: 14,
              gap: 10,
            }}
          >
            <View style={{ gap: 6 }}>
              <Text selectable style={{ color: '#f4f4f4', fontWeight: '700', fontSize: 18 }}>
                {recipe.name}
              </Text>
              <Text selectable style={{ color: '#a7a7b1', lineHeight: 19 }}>
                {recipe.description}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View
                style={{
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: '#2f3950',
                  backgroundColor: '#1d2533',
                  paddingHorizontal: 9,
                  paddingVertical: 4,
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
                  paddingHorizontal: 9,
                  paddingVertical: 4,
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
                  paddingHorizontal: 9,
                  paddingVertical: 4,
                }}
              >
                <Text selectable style={{ color: '#ffc1d9', fontWeight: '700', fontSize: 12 }}>
                  F {recipe.macros.fats}g
                </Text>
              </View>
            </View>

            <Text selectable style={{ color: '#8f8f98' }}>
              {recipe.preparation_time} min • {recipe.ingredients.length} ingredients
            </Text>

            <Pressable
              onPress={() => handleDelete(recipe)}
              disabled={Boolean(deletingId)}
              style={{
                borderRadius: 10,
                borderWidth: 1,
                borderColor: '#60323b',
                backgroundColor: '#2a171c',
                paddingVertical: 10,
                alignItems: 'center',
                opacity: isDeleting ? 0.65 : 1,
              }}
            >
              <Text selectable style={{ color: '#ffb8c3', fontWeight: '700' }}>
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Text>
            </Pressable>
          </View>
        );
      })}
    </ScrollView>
  );
}
