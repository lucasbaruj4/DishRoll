import * as React from 'react';
import {
  Animated,
  PanResponder,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  generateRecipeBatch,
  logRecipeSwipe,
  saveGeneratedRecipes,
  type GeneratedRecipeInput,
  type RecipeDirection,
  type SavedRecipe,
} from '../../services/recipeGenerator';
import { useAuth } from '../../hooks/useAuth';
import { useIngredientCatalog } from '../../hooks/useIngredientCatalog';
import { useUserIngredients } from '../../hooks/useUserIngredients';

type RecipeDeckCard = GeneratedRecipeInput & {
  id: string;
  persisted: boolean;
};

const PREP_OPTIONS = [20, 30, 40];
const SWIPE_THRESHOLD = 110;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function toDeckCard(recipe: SavedRecipe): RecipeDeckCard {
  return {
    id: recipe.id,
    persisted: true,
    name: recipe.name,
    description: recipe.description,
    preparation_time: recipe.preparation_time,
    macros: recipe.macros,
    ingredients: recipe.ingredients,
    instructions: recipe.instructions,
  };
}

function toLocalDeckCards(recipes: GeneratedRecipeInput[]): RecipeDeckCard[] {
  return recipes.map((recipe, index) => ({
    ...recipe,
    id: `local-${Date.now()}-${index}`,
    persisted: false,
  }));
}

export default function GenerateScreen() {
  const { user } = useAuth();
  const { items: catalogItems } = useIngredientCatalog();
  const { availableCatalogIds, loading: ingredientsLoading, refresh: refreshUserIngredients } =
    useUserIngredients();
  const { width } = useWindowDimensions();
  const [protein, setProtein] = React.useState(150);
  const [carbs, setCarbs] = React.useState(200);
  const [fats, setFats] = React.useState(60);
  const [timeLimit, setTimeLimit] = React.useState(30);
  const [submitting, setSubmitting] = React.useState(false);
  const [swiping, setSwiping] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [deck, setDeck] = React.useState<RecipeDeckCard[]>([]);
  const [index, setIndex] = React.useState(0);
  const [lastSwipe, setLastSwipe] = React.useState<RecipeDirection | null>(null);

  const drag = React.useRef(new Animated.ValueXY()).current;

  const availableIngredientNames = React.useMemo(() => {
    return catalogItems
      .filter((item) => availableCatalogIds.has(item.id))
      .map((item) => item.name)
      .filter(Boolean);
  }, [availableCatalogIds, catalogItems]);
  const catalogNameById = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const item of catalogItems) {
      if (item.name) map.set(item.id, item.name);
    }
    return map;
  }, [catalogItems]);
  const availableIngredientPreview = React.useMemo(
    () => availableIngredientNames.slice(0, 10),
    [availableIngredientNames]
  );

  useFocusEffect(
    React.useCallback(() => {
      void refreshUserIngredients();
    }, [refreshUserIngredients])
  );

  const currentCard = deck[index] ?? null;
  const nextCard = deck[index + 1] ?? null;

  const rotate = drag.x.interpolate({
    inputRange: [-220, 0, 220],
    outputRange: ['-12deg', '0deg', '12deg'],
  });

  const swipeLabelOpacity = drag.x.interpolate({
    inputRange: [-140, -40, 40, 140],
    outputRange: [1, 0, 0, 1],
  });

  const leftLabelOpacity = drag.x.interpolate({
    inputRange: [-140, -40, 0],
    outputRange: [1, 0.2, 0],
    extrapolate: 'clamp',
  });

  const rightLabelOpacity = drag.x.interpolate({
    inputRange: [0, 40, 140],
    outputRange: [0, 0.2, 1],
    extrapolate: 'clamp',
  });

  const resetCardPosition = React.useCallback(() => {
    Animated.spring(drag, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: false,
      bounciness: 8,
      speed: 18,
    }).start();
  }, [drag]);

  const finalizeSwipe = React.useCallback(
    async (direction: RecipeDirection) => {
      if (!user || !currentCard) return;

      setSwiping(true);
      setError(null);
      try {
        if (currentCard.persisted) {
          await logRecipeSwipe(user.id, currentCard.id, direction);
        }
        setLastSwipe(direction);
        setIndex((prev) => prev + 1);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save swipe.';
        setError(message);
      } finally {
        drag.setValue({ x: 0, y: 0 });
        setSwiping(false);
      }
    },
    [currentCard, drag, user]
  );

  const triggerSwipe = React.useCallback(
    (direction: RecipeDirection) => {
      if (!currentCard || swiping) return;
      Animated.timing(drag, {
        toValue: { x: direction === 'right' ? width : -width, y: 20 },
        duration: 170,
        useNativeDriver: false,
      }).start(() => {
        void finalizeSwipe(direction);
      });
    },
    [currentCard, drag, finalizeSwipe, swiping, width]
  );

  const panResponder = React.useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dx) > 8 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
        onPanResponderMove: Animated.event([null, { dx: drag.x, dy: drag.y }], {
          useNativeDriver: false,
        }),
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx > SWIPE_THRESHOLD) {
            triggerSwipe('right');
            return;
          }
          if (gestureState.dx < -SWIPE_THRESHOLD) {
            triggerSwipe('left');
            return;
          }
          resetCardPosition();
        },
      }),
    [drag.x, drag.y, resetCardPosition, triggerSwipe]
  );

  const handleGenerate = async () => {
    if (!user) {
      setError('You must be signed in to generate recipes.');
      return;
    }

    const hasInvalid = protein <= 0 || carbs <= 0 || fats <= 0 || timeLimit <= 0;

    if (hasInvalid) {
      setError('Use positive values for all macros and prep time.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setLastSwipe(null);

    const latestCommittedIngredients = await refreshUserIngredients();
    const latestIngredientNames = latestCommittedIngredients
      .filter((item) => item.is_available)
      .map((item) => catalogNameById.get(item.catalog_id) ?? '')
      .filter(Boolean);

    if (latestIngredientNames.length < 3) {
      setError('Add at least 3 available ingredients first, then save changes in Inventory.');
      setDeck([]);
      setIndex(0);
      setSubmitting(false);
      return;
    }

    const result = await generateRecipeBatch({
      ingredientNames: latestIngredientNames,
      macros: { protein, carbs, fats },
      timeLimit,
    });

    if (result.recipes.length === 0) {
      setError('No recipes were generated. Try adding more ingredients.');
      setDeck([]);
      setIndex(0);
      setSubmitting(false);
      return;
    }

    try {
      const saved = await saveGeneratedRecipes(user.id, result.recipes);
      setDeck(saved.map(toDeckCard));
      setIndex(0);
      if (result.warning) {
        setError(result.warning);
      }
    } catch {
      setDeck(toLocalDeckCards(result.recipes));
      setIndex(0);
      setError('Using local preview only. Database write failed, so swipes will not sync.');
    } finally {
      setSubmitting(false);
    }
  };

  const updateMacro = (key: 'protein' | 'carbs' | 'fats', delta: number) => {
    if (key === 'protein') setProtein((prev) => clamp(prev + delta, 20, 300));
    if (key === 'carbs') setCarbs((prev) => clamp(prev + delta, 20, 400));
    if (key === 'fats') setFats((prev) => clamp(prev + delta, 10, 150));
  };

  const updateTime = (delta: number) => {
    setTimeLimit((prev) => clamp(prev + delta, 10, 90));
  };

  const renderMacroControl = (label: string, value: number, onAdjust: (delta: number) => void) => {
    return (
      <View
        style={{
          flex: 1,
          borderWidth: 1,
          borderColor: '#2b2b36',
          backgroundColor: '#101016',
          borderRadius: 14,
          padding: 12,
          gap: 10,
        }}
      >
        <Text selectable style={{ color: '#a8a8b3', fontSize: 12, letterSpacing: 0.3 }}>
          {label}
        </Text>
        <Text selectable style={{ color: '#f5f5f5', fontSize: 24, fontWeight: '700' }}>
          {value}g
        </Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable
            onPress={() => onAdjust(-5)}
            style={{
              flex: 1,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: '#323241',
              paddingVertical: 8,
              alignItems: 'center',
            }}
          >
            <Text selectable style={{ color: '#d5d5dd', fontWeight: '700' }}>
              -5
            </Text>
          </Pressable>
          <Pressable
            onPress={() => onAdjust(5)}
            style={{
              flex: 1,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: '#323241',
              paddingVertical: 8,
              alignItems: 'center',
            }}
          >
            <Text selectable style={{ color: '#d5d5dd', fontWeight: '700' }}>
              +5
            </Text>
          </Pressable>
        </View>
      </View>
    );
  };

  const hasDeck = Boolean(currentCard);

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: '#0b0b0f' }}
      contentContainerStyle={{ padding: 24, gap: 18, flexGrow: 1 }}
    >
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {renderMacroControl('Protein', protein, (delta) => updateMacro('protein', delta))}
        {renderMacroControl('Carbs', carbs, (delta) => updateMacro('carbs', delta))}
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        {renderMacroControl('Fats', fats, (delta) => updateMacro('fats', delta))}
        <View
          style={{
            flex: 1,
            borderWidth: 1,
            borderColor: '#2b2b36',
            backgroundColor: '#101016',
            borderRadius: 14,
            padding: 12,
            gap: 10,
          }}
        >
          <Text selectable style={{ color: '#a8a8b3', fontSize: 12, letterSpacing: 0.3 }}>
            Prep Time
          </Text>
          <Text selectable style={{ color: '#f5f5f5', fontSize: 24, fontWeight: '700' }}>
            {timeLimit} min
          </Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {PREP_OPTIONS.map((option) => (
              <Pressable
                key={option}
                onPress={() => setTimeLimit(option)}
                style={{
                  borderWidth: 1,
                  borderColor: option === timeLimit ? '#f2f2f5' : '#323241',
                  borderRadius: 10,
                  paddingVertical: 8,
                  paddingHorizontal: 8,
                  backgroundColor: option === timeLimit ? '#f2f2f5' : '#15151d',
                }}
              >
                <Text
                  selectable
                  style={{
                    color: option === timeLimit ? '#101016' : '#d5d5dd',
                    fontWeight: '700',
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {option}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable
              onPress={() => updateTime(-5)}
              style={{
                flex: 1,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: '#323241',
                paddingVertical: 8,
                alignItems: 'center',
              }}
            >
              <Text selectable style={{ color: '#d5d5dd', fontWeight: '700' }}>
                -5
              </Text>
            </Pressable>
            <Pressable
              onPress={() => updateTime(5)}
              style={{
                flex: 1,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: '#323241',
                paddingVertical: 8,
                alignItems: 'center',
              }}
            >
              <Text selectable style={{ color: '#d5d5dd', fontWeight: '700' }}>
                +5
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      <Pressable
        onPress={handleGenerate}
        disabled={submitting || ingredientsLoading}
        style={{
          backgroundColor: submitting || ingredientsLoading ? '#6c6c75' : '#f5f5f5',
          paddingVertical: 14,
          borderRadius: 14,
          alignItems: 'center',
        }}
      >
        <Text selectable style={{ color: '#0b0b0f', fontWeight: '700' }}>
          {submitting ? 'Generating...' : 'Generate Swipe Deck'}
        </Text>
      </Pressable>

      <View
        style={{
          borderWidth: 1,
          borderColor: '#252530',
          backgroundColor: '#121218',
          borderRadius: 12,
          padding: 10,
          gap: 6,
        }}
      >
        <Text selectable style={{ color: '#a7a7b1', fontSize: 12, letterSpacing: 0.4 }}>
          INGREDIENTS SENT TO GENERATOR ({availableIngredientNames.length})
        </Text>
        <Text selectable style={{ color: '#d0d0d8', lineHeight: 20 }}>
          {availableIngredientPreview.length > 0
            ? availableIngredientPreview.join(', ')
            : 'None selected yet.'}
          {availableIngredientNames.length > availableIngredientPreview.length ? ', ...' : ''}
        </Text>
        <Text selectable style={{ color: '#8f8f98', fontSize: 12 }}>
          Updates here only after Inventory changes are saved.
        </Text>
      </View>

      {error ? (
        <View
          style={{
            borderWidth: 1,
            borderColor: '#47272d',
            backgroundColor: '#1f1215',
            borderRadius: 12,
            padding: 10,
          }}
        >
          <Text selectable style={{ color: '#ff8f9c' }}>
            {error}
          </Text>
        </View>
      ) : null}

      <View
        style={{
          borderWidth: 1,
          borderColor: '#252530',
          backgroundColor: '#121218',
          borderRadius: 18,
          padding: 14,
          gap: 12,
          minHeight: 390,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text selectable style={{ color: '#f4f4f4', fontWeight: '700', fontSize: 18 }}>
            Swipe Recipes
          </Text>
          <Text selectable style={{ color: '#9797a0', fontVariant: ['tabular-nums'] }}>
            {hasDeck ? `${index + 1}/${deck.length}` : '0/0'}
          </Text>
        </View>

        {!hasDeck ? (
          <Text selectable style={{ color: '#a7a7b1', lineHeight: 20 }}>
            Generate a batch to start swiping. Right swipe saves. Left swipe skips.
          </Text>
        ) : (
          <View style={{ height: 300, justifyContent: 'center' }}>
            {nextCard ? (
              <View
                style={{
                  position: 'absolute',
                  width: '100%',
                  transform: [{ scale: 0.96 }],
                  opacity: 0.6,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: '#2f2f3d',
                  backgroundColor: '#1b1b24',
                  padding: 14,
                }}
              >
                <Text selectable style={{ color: '#e6e6ee', fontWeight: '700', fontSize: 18 }}>
                  {nextCard.name}
                </Text>
                <Text selectable style={{ color: '#a7a7b1', marginTop: 8 }}>
                  Up next
                </Text>
              </View>
            ) : null}

            <Animated.View
              {...panResponder.panHandlers}
              style={{
                borderRadius: 16,
                borderWidth: 1,
                borderColor: '#353544',
                backgroundColor: '#161620',
                padding: 14,
                gap: 10,
                transform: [{ translateX: drag.x }, { translateY: drag.y }, { rotate }],
              }}
            >
              <Animated.View style={{ opacity: swipeLabelOpacity }}>
                <View style={{ flexDirection: 'row', marginBottom: 6, justifyContent: 'space-between' }}>
                  <Animated.Text
                    selectable
                    style={{
                      color: '#ff9eaa',
                      fontWeight: '700',
                      fontSize: 12,
                      letterSpacing: 1.2,
                      opacity: leftLabelOpacity,
                    }}
                  >
                    SKIP
                  </Animated.Text>
                  <Animated.Text
                    selectable
                    style={{
                      color: '#9ef4c7',
                      fontWeight: '700',
                      fontSize: 12,
                      letterSpacing: 1.2,
                      opacity: rightLabelOpacity,
                    }}
                  >
                    SAVE
                  </Animated.Text>
                </View>
              </Animated.View>
              <Text selectable style={{ color: '#f5f5f5', fontWeight: '700', fontSize: 20 }}>
                {currentCard.name}
              </Text>
              <Text selectable style={{ color: '#b8b8c0', lineHeight: 20 }}>
                {currentCard.description}
              </Text>
              <Text selectable style={{ color: '#8f8f98', fontVariant: ['tabular-nums'] }}>
                {currentCard.macros.protein}p / {currentCard.macros.carbs}c / {currentCard.macros.fats}f |{' '}
                {currentCard.preparation_time} min
              </Text>
              <Text selectable style={{ color: '#8f8f98' }}>
                Uses: {currentCard.ingredients.map((item) => item.name).join(', ')}
              </Text>
            </Animated.View>
          </View>
        )}

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Pressable
            disabled={!hasDeck || swiping}
            onPress={() => triggerSwipe('left')}
            style={{
              flex: 1,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: '#6f3845',
              backgroundColor: '#2a161b',
              paddingVertical: 12,
              alignItems: 'center',
              opacity: !hasDeck || swiping ? 0.5 : 1,
            }}
          >
            <Text selectable style={{ color: '#ff9eaa', fontWeight: '700' }}>
              Skip
            </Text>
          </Pressable>
          <Pressable
            disabled={!hasDeck || swiping}
            onPress={() => triggerSwipe('right')}
            style={{
              flex: 1,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: '#2f6a52',
              backgroundColor: '#15261e',
              paddingVertical: 12,
              alignItems: 'center',
              opacity: !hasDeck || swiping ? 0.5 : 1,
            }}
          >
            <Text selectable style={{ color: '#9ef4c7', fontWeight: '700' }}>
              Save
            </Text>
          </Pressable>
        </View>

        {lastSwipe ? (
          <Text selectable style={{ color: '#8f8f98' }}>
            Last action: {lastSwipe === 'right' ? 'Saved to collection' : 'Skipped'}
          </Text>
        ) : null}
      </View>
    </ScrollView>
  );
}
