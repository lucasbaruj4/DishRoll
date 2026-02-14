import * as React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import {
  Animated,
  InteractionManager,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  generateRecipeBatch,
  getRecipesByIds,
  logRecipeSwipe,
  saveGeneratedRecipes,
  type GeneratedRecipeInput,
  type RecipeDirection,
  type SavedRecipe,
} from '../../services/recipeGenerator';
import { useAuth } from '../../hooks/useAuth';
import { useIngredientCatalog } from '../../hooks/useIngredientCatalog';
import { type UserIngredient, useUserIngredients } from '../../hooks/useUserIngredients';

type RecipeDeckCard = GeneratedRecipeInput & {
  id: string;
  persisted: boolean;
};

const SWIPE_THRESHOLD = 100;
const SWIPE_VELOCITY_THRESHOLD = 0.65;
const SWIPE_ANIMATION_DURATION_MS = 150;
const SWIPE_FINALIZE_GUARD_MS = 260;
const MACRO_SHEET_FOOTER_BOTTOM_PADDING = 12;
const SWIPE_TUTORIAL_STORAGE_KEY = 'generate_swipe_tutorial_ack_v1';
const LAST_USED_MACROS_STORAGE_PREFIX = 'generate_last_used_macros_v1';
const ACTIVE_DECK_STORAGE_PREFIX = 'generate_active_deck_v1';
const INITIAL_MACROS = {
  protein: 150,
  carbs: 200,
  fats: 60,
  timeLimit: 30,
};

type PersistedMacros = {
  protein: number;
  carbs: number;
  fats: number;
  timeLimit: number;
};

type PersistedActiveDeck = {
  recipeIds: string[];
  index: number;
  ingredientSignature: string | null;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function recipeEmoji(name: string) {
  const normalized = name.toLowerCase();
  if (normalized.includes('salad')) return '🥗';
  if (normalized.includes('bowl')) return '🍲';
  if (normalized.includes('stir')) return '🥘';
  if (normalized.includes('pasta')) return '🍝';
  if (normalized.includes('chicken')) return '🍗';
  if (normalized.includes('beef') || normalized.includes('steak')) return '🥩';
  if (normalized.includes('fish') || normalized.includes('salmon') || normalized.includes('tuna'))
    return '🐟';
  if (normalized.includes('egg')) return '🍳';
  return '🍽️';
}

function signatureFromCatalogIds(ids: Iterable<string>) {
  return Array.from(ids).sort().join('|');
}

function signatureFromUserIngredients(items: UserIngredient[]) {
  return items
    .filter((item) => item.is_available)
    .map((item) => item.catalog_id)
    .sort()
    .join('|');
}

function parseBoundedInt(text: string, fallback: number, min: number, max: number) {
  const digitsOnly = text.replace(/[^\d]/g, '');
  if (!digitsOnly) return fallback;
  const parsed = Number.parseInt(digitsOnly, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return clamp(parsed, min, max);
}

function digitsOnly(text: string) {
  return text.replace(/[^\d]/g, '');
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
  const router = useRouter();
  const { items: catalogItems } = useIngredientCatalog();
  const { availableCatalogIds, loading: ingredientsLoading, refresh: refreshUserIngredients } =
    useUserIngredients();
  const { width, height } = useWindowDimensions();
  const isSmallPhone = width <= 375;
  const isTinyPhone = width <= 340;
  const macroGridColumns = isTinyPhone ? 1 : 2;
  const macroGridGap = isSmallPhone ? 8 : 10;
  const macroCardBasis = macroGridColumns === 1 ? '100%' : '48%';
  const macroCardMinHeight = isSmallPhone ? 116 : 132;
  const macroValueFontSize = isTinyPhone ? 34 : isSmallPhone ? 38 : 44;
  const macroValueLineHeight = isTinyPhone ? 40 : isSmallPhone ? 44 : 50;
  const macroSheetHeight = Math.round(height * (isSmallPhone ? 0.94 : 0.9));
  const [protein, setProtein] = React.useState(INITIAL_MACROS.protein);
  const [carbs, setCarbs] = React.useState(INITIAL_MACROS.carbs);
  const [fats, setFats] = React.useState(INITIAL_MACROS.fats);
  const [timeLimit, setTimeLimit] = React.useState(INITIAL_MACROS.timeLimit);
  const [submitting, setSubmitting] = React.useState(false);
  const [swiping, setSwiping] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [deck, setDeck] = React.useState<RecipeDeckCard[]>([]);
  const [index, setIndex] = React.useState(0);
  const [lastSwipe, setLastSwipe] = React.useState<RecipeDirection | null>(null);
  const [macroSheetVisible, setMacroSheetVisible] = React.useState(false);
  const [didAutoOpenMacroSheet, setDidAutoOpenMacroSheet] = React.useState(false);
  const [deckIngredientSignature, setDeckIngredientSignature] = React.useState<string | null>(null);
  const [proteinInput, setProteinInput] = React.useState(String(protein));
  const [carbsInput, setCarbsInput] = React.useState(String(carbs));
  const [fatsInput, setFatsInput] = React.useState(String(fats));
  const [timeInput, setTimeInput] = React.useState(String(timeLimit));
  const [macroFooterHeight, setMacroFooterHeight] = React.useState(0);
  const [swipeTutorialSeen, setSwipeTutorialSeen] = React.useState<boolean | null>(null);
  const [swipeTutorialConfirmed, setSwipeTutorialConfirmed] = React.useState(false);
  const [outOfSyncModalVisible, setOutOfSyncModalVisible] = React.useState(false);
  const [outOfSyncModalSeenKey, setOutOfSyncModalSeenKey] = React.useState<string | null>(null);
  const [sessionStateHydrated, setSessionStateHydrated] = React.useState(false);

  const drag = React.useRef(new Animated.ValueXY()).current;
  const swipeTutorialAnim = React.useRef(new Animated.Value(0)).current;
  const swipeFinalizeGuardRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

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
  const availableIngredientSignature = React.useMemo(
    () => signatureFromCatalogIds(availableCatalogIds),
    [availableCatalogIds]
  );
  const lastUsedMacrosStorageKey = React.useMemo(
    () => (user ? `${LAST_USED_MACROS_STORAGE_PREFIX}:${user.id}` : null),
    [user]
  );
  const activeDeckStorageKey = React.useMemo(
    () => (user ? `${ACTIVE_DECK_STORAGE_PREFIX}:${user.id}` : null),
    [user]
  );

  useFocusEffect(
    React.useCallback(() => {
      void refreshUserIngredients();
    }, [refreshUserIngredients])
  );

  const currentCard = deck[index] ?? null;
  const nextCard = deck[index + 1] ?? null;
  const hasDeckItems = deck.length > 0;
  const hasActiveCard = Boolean(currentCard);
  const hasUnsyncedRecipes =
    hasDeckItems &&
    deckIngredientSignature !== null &&
    deckIngredientSignature !== availableIngredientSignature;
  const outOfSyncKey = hasUnsyncedRecipes
    ? `${deckIngredientSignature ?? 'none'}->${availableIngredientSignature}`
    : null;
  const deckProgress = hasDeckItems ? Math.min((index + 1) / deck.length, 1) : 0;
  const nextDeckProgress = hasDeckItems ? Math.min((index + 2) / deck.length, 1) : 0;
  const showSwipeTutorial = swipeTutorialSeen === false && hasActiveCard && !macroSheetVisible;
  const macroScrollBottomPadding = MACRO_SHEET_FOOTER_BOTTOM_PADDING;

  React.useEffect(() => {
    if (!sessionStateHydrated) return;
    if (!hasDeckItems && !didAutoOpenMacroSheet) {
      setMacroSheetVisible(true);
      setDidAutoOpenMacroSheet(true);
    }
  }, [didAutoOpenMacroSheet, hasDeckItems, sessionStateHydrated]);

  React.useEffect(() => {
    if (!outOfSyncKey) {
      setOutOfSyncModalVisible(false);
      return;
    }
    if (outOfSyncModalSeenKey === outOfSyncKey) return;
    setOutOfSyncModalVisible(true);
  }, [outOfSyncKey, outOfSyncModalSeenKey]);

  React.useEffect(() => {
    if (!macroSheetVisible) return;
    setProteinInput(String(protein));
    setCarbsInput(String(carbs));
    setFatsInput(String(fats));
    setTimeInput(String(timeLimit));
  }, [carbs, fats, macroSheetVisible, protein, timeLimit]);

  React.useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(SWIPE_TUTORIAL_STORAGE_KEY)
      .then((value) => {
        if (!alive) return;
        setSwipeTutorialSeen(value === '1');
      })
      .catch(() => {
        if (!alive) return;
        setSwipeTutorialSeen(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  React.useEffect(() => {
    if (!user || !lastUsedMacrosStorageKey || !activeDeckStorageKey) {
      setSessionStateHydrated(false);
      return;
    }

    let alive = true;
    setSessionStateHydrated(false);
    setDeck([]);
    setIndex(0);
    setDeckIngredientSignature(null);

    const hydrateSessionState = async () => {
      try {
        const [storedMacrosRaw, storedDeckRaw] = await Promise.all([
          AsyncStorage.getItem(lastUsedMacrosStorageKey),
          AsyncStorage.getItem(activeDeckStorageKey),
        ]);

        if (!alive) return;

        if (storedMacrosRaw) {
          try {
            const parsed = JSON.parse(storedMacrosRaw) as Partial<PersistedMacros>;
            const nextProtein = clamp(
              parseBoundedInt(String(parsed.protein ?? ''), INITIAL_MACROS.protein, 20, 300),
              20,
              300
            );
            const nextCarbs = clamp(
              parseBoundedInt(String(parsed.carbs ?? ''), INITIAL_MACROS.carbs, 20, 400),
              20,
              400
            );
            const nextFats = clamp(
              parseBoundedInt(String(parsed.fats ?? ''), INITIAL_MACROS.fats, 10, 150),
              10,
              150
            );
            const nextTime = clamp(
              parseBoundedInt(String(parsed.timeLimit ?? ''), INITIAL_MACROS.timeLimit, 10, 90),
              10,
              90
            );

            setProtein(nextProtein);
            setCarbs(nextCarbs);
            setFats(nextFats);
            setTimeLimit(nextTime);
            setProteinInput(String(nextProtein));
            setCarbsInput(String(nextCarbs));
            setFatsInput(String(nextFats));
            setTimeInput(String(nextTime));
          } catch {
            // Ignore malformed local macro payload.
          }
        }

        if (storedDeckRaw) {
          try {
            const parsed = JSON.parse(storedDeckRaw) as PersistedActiveDeck;
            const recipeIds = Array.isArray(parsed.recipeIds)
              ? parsed.recipeIds.filter((id) => typeof id === 'string' && id.length > 0)
              : [];
            if (recipeIds.length > 0) {
              const restored = await getRecipesByIds(user.id, recipeIds);
              if (!alive) return;

              const recipeMap = new Map(restored.map((recipe) => [recipe.id, recipe]));
              const ordered = recipeIds
                .map((id) => recipeMap.get(id))
                .filter((item): item is SavedRecipe => Boolean(item))
                .map(toDeckCard);
              if (ordered.length > 0) {
                const nextIndex = clamp(
                  Number.isFinite(parsed.index) ? parsed.index : 0,
                  0,
                  Math.max(ordered.length - 1, 0)
                );
                setDeck(ordered);
                setIndex(nextIndex);
                setDeckIngredientSignature(
                  typeof parsed.ingredientSignature === 'string' ? parsed.ingredientSignature : null
                );
              } else {
                setDeck([]);
                setIndex(0);
                setDeckIngredientSignature(null);
              }
            }
          } catch {
            // Ignore malformed local deck payload.
          }
        }
      } finally {
        if (alive) {
          setSessionStateHydrated(true);
        }
      }
    };

    void hydrateSessionState();

    return () => {
      alive = false;
    };
  }, [activeDeckStorageKey, lastUsedMacrosStorageKey, user]);

  React.useEffect(() => {
    if (!sessionStateHydrated || !lastUsedMacrosStorageKey) return;

    const payload: PersistedMacros = {
      protein,
      carbs,
      fats,
      timeLimit,
    };

    AsyncStorage.setItem(lastUsedMacrosStorageKey, JSON.stringify(payload)).catch(() => {
      // Non-blocking local persistence failure.
    });
  }, [carbs, fats, lastUsedMacrosStorageKey, protein, sessionStateHydrated, timeLimit]);

  React.useEffect(() => {
    if (!sessionStateHydrated || !activeDeckStorageKey) return;

    const persistedRecipeIds = deck.filter((card) => card.persisted).map((card) => card.id);
    if (persistedRecipeIds.length === 0) {
      AsyncStorage.removeItem(activeDeckStorageKey).catch(() => {
        // Non-blocking local persistence failure.
      });
      return;
    }

    const payload: PersistedActiveDeck = {
      recipeIds: persistedRecipeIds,
      index: clamp(index, 0, Math.max(persistedRecipeIds.length - 1, 0)),
      ingredientSignature: deckIngredientSignature,
    };

    AsyncStorage.setItem(activeDeckStorageKey, JSON.stringify(payload)).catch(() => {
      // Non-blocking local persistence failure.
    });
  }, [activeDeckStorageKey, deck, deckIngredientSignature, index, sessionStateHydrated]);

  React.useEffect(() => {
    if (!showSwipeTutorial) return;

    setSwipeTutorialConfirmed(false);
    swipeTutorialAnim.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(swipeTutorialAnim, {
          toValue: 1,
          duration: 550,
          useNativeDriver: true,
        }),
        Animated.timing(swipeTutorialAnim, {
          toValue: -1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(swipeTutorialAnim, {
          toValue: 0,
          duration: 550,
          useNativeDriver: true,
        }),
        Animated.delay(300),
      ])
    );
    loop.start();
    return () => {
      loop.stop();
      swipeTutorialAnim.setValue(0);
    };
  }, [showSwipeTutorial, swipeTutorialAnim]);

  React.useEffect(() => {
    if (hasActiveCard) return;
    drag.setValue({ x: 0, y: 0 });
  }, [drag, hasActiveCard]);

  React.useEffect(() => {
    return () => {
      if (!swipeFinalizeGuardRef.current) return;
      clearTimeout(swipeFinalizeGuardRef.current);
      swipeFinalizeGuardRef.current = null;
    };
  }, []);

  const dismissSwipeTutorial = React.useCallback(async () => {
    if (!swipeTutorialConfirmed) return;
    setSwipeTutorialSeen(true);
    try {
      await AsyncStorage.setItem(SWIPE_TUTORIAL_STORAGE_KEY, '1');
    } catch {
      // Non-blocking local persistence failure.
    }
  }, [swipeTutorialConfirmed]);

  const resetCardPosition = React.useCallback(() => {
    Animated.spring(drag, {
      toValue: { x: 0, y: 0 },
      bounciness: 8,
      speed: 18,
      useNativeDriver: true,
    }).start();
  }, [drag]);

  const finalizeSwipe = React.useCallback(
    (direction: RecipeDirection, swipedCardId: string, swipedCardPersisted: boolean) => {
      setError(null);
      setLastSwipe(direction);
      setIndex((prev) => prev + 1);
      setSwiping(false);

      if (direction === 'right' && swipedCardPersisted) {
        router.push(`/recipe/${swipedCardId}`);
      }

      if (!user || !swipedCardPersisted) return;

      InteractionManager.runAfterInteractions(() => {
        void logRecipeSwipe(user.id, swipedCardId, direction).catch((err) => {
          const message =
            err instanceof Error ? err.message : 'Swipe saved locally, but sync failed.';
          setError(message);
        });
      });
    },
    [router, user]
  );

  const triggerSwipe = React.useCallback(
    (direction: RecipeDirection) => {
      if (!currentCard || swiping) return;

      const swipedCardId = currentCard.id;
      const swipedCardPersisted = currentCard.persisted;
      setSwiping(true);

      let settled = false;
      const settleSwipe = (finished: boolean) => {
        if (settled) return;
        settled = true;

        if (swipeFinalizeGuardRef.current) {
          clearTimeout(swipeFinalizeGuardRef.current);
          swipeFinalizeGuardRef.current = null;
        }

        drag.setValue({ x: 0, y: 0 });
        if (!finished) {
          setSwiping(false);
          return;
        }
        finalizeSwipe(direction, swipedCardId, swipedCardPersisted);
      };

      swipeFinalizeGuardRef.current = setTimeout(() => {
        settleSwipe(true);
      }, SWIPE_FINALIZE_GUARD_MS);

      Animated.timing(drag, {
        toValue: { x: direction === 'right' ? width : -width, y: 20 },
        duration: SWIPE_ANIMATION_DURATION_MS,
        useNativeDriver: true,
      }).start(({ finished }) => {
        settleSwipe(finished);
      });
    },
    [currentCard, drag, finalizeSwipe, swiping, width]
  );

  const handlePanRelease = React.useCallback(
    (dx: number, vx: number) => {
      if (!currentCard || swiping) {
        resetCardPosition();
        return;
      }

      const flickRight = vx > SWIPE_VELOCITY_THRESHOLD && dx > SWIPE_THRESHOLD / 3;
      const flickLeft = vx < -SWIPE_VELOCITY_THRESHOLD && dx < -SWIPE_THRESHOLD / 3;

      if (dx > SWIPE_THRESHOLD || flickRight) {
        triggerSwipe('right');
        return;
      }
      if (dx < -SWIPE_THRESHOLD || flickLeft) {
        triggerSwipe('left');
        return;
      }

      resetCardPosition();
    },
    [currentCard, resetCardPosition, swiping, triggerSwipe]
  );

  const panResponder = React.useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gestureState) => {
          if (!hasActiveCard || showSwipeTutorial || swiping) return false;
          const horizontalIntent = Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
          return horizontalIntent && Math.abs(gestureState.dx) > 8;
        },
        onPanResponderMove: (_event, gestureState) => {
          drag.setValue({ x: gestureState.dx, y: gestureState.dy });
        },
        onPanResponderRelease: (_event, gestureState) => {
          handlePanRelease(gestureState.dx, gestureState.vx);
        },
        onPanResponderTerminate: () => {
          if (swipeFinalizeGuardRef.current) {
            clearTimeout(swipeFinalizeGuardRef.current);
            swipeFinalizeGuardRef.current = null;
          }
          setSwiping(false);
          resetCardPosition();
        },
      }),
    [drag, handlePanRelease, hasActiveCard, resetCardPosition, showSwipeTutorial, swiping]
  );

  const rotation = drag.x.interpolate({
    inputRange: [-220, 0, 220],
    outputRange: ['-12deg', '0deg', '12deg'],
    extrapolate: 'clamp',
  });
  const swipeLabelOpacity = drag.x.interpolate({
    inputRange: [-140, -40, 40, 140],
    outputRange: [1, 0, 0, 1],
    extrapolate: 'clamp',
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
  const nextCardScale = drag.x.interpolate({
    inputRange: [-width, 0, width],
    outputRange: [1, 0.96, 1],
    extrapolate: 'clamp',
  });
  const nextCardTranslateY = drag.x.interpolate({
    inputRange: [-width, 0, width],
    outputRange: [0, 14, 0],
    extrapolate: 'clamp',
  });
  const nextCardOpacity = drag.x.interpolate({
    inputRange: [-width, 0, width],
    outputRange: [0.92, 0.62, 0.92],
    extrapolate: 'clamp',
  });

  const commitInputs = React.useCallback(() => {
    const nextProtein = parseBoundedInt(proteinInput, protein, 20, 300);
    const nextCarbs = parseBoundedInt(carbsInput, carbs, 20, 400);
    const nextFats = parseBoundedInt(fatsInput, fats, 10, 150);
    const nextTime = parseBoundedInt(timeInput, timeLimit, 10, 90);

    setProtein(nextProtein);
    setCarbs(nextCarbs);
    setFats(nextFats);
    setTimeLimit(nextTime);

    setProteinInput(String(nextProtein));
    setCarbsInput(String(nextCarbs));
    setFatsInput(String(nextFats));
    setTimeInput(String(nextTime));

    return { protein: nextProtein, carbs: nextCarbs, fats: nextFats, timeLimit: nextTime };
  }, [carbs, carbsInput, fats, fatsInput, protein, proteinInput, timeInput, timeLimit]);

  const handleGenerate = async () => {
    if (!user) {
      setError('You must be signed in to generate recipes.');
      return;
    }

    Keyboard.dismiss();
    const values = commitInputs();
    const hasInvalid =
      values.protein <= 0 || values.carbs <= 0 || values.fats <= 0 || values.timeLimit <= 0;

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
    const latestIngredientSignature = signatureFromUserIngredients(latestCommittedIngredients);

    if (latestIngredientNames.length < 3) {
      setError('Add at least 3 available ingredients first, then save changes in Inventory.');
      setSubmitting(false);
      return;
    }

    const result = await generateRecipeBatch({
      ingredientNames: latestIngredientNames,
      macros: { protein: values.protein, carbs: values.carbs, fats: values.fats },
      timeLimit: values.timeLimit,
    });

    if (result.recipes.length === 0) {
      setError('No recipes were generated. Try adding more ingredients.');
      setSubmitting(false);
      return;
    }

    try {
      const saved = await saveGeneratedRecipes(user.id, result.recipes);
      setDeck(saved.map(toDeckCard));
      setIndex(0);
      setDeckIngredientSignature(latestIngredientSignature);
      setMacroSheetVisible(false);
      if (result.warning) {
        setError(result.warning);
      }
    } catch {
      setDeck(toLocalDeckCards(result.recipes));
      setIndex(0);
      setDeckIngredientSignature(latestIngredientSignature);
      setMacroSheetVisible(false);
      setError('Using local preview only. Database write failed, so swipes will not sync.');
    } finally {
      setSubmitting(false);
    }
  };

  const commitField = React.useCallback(
    (
      text: string,
      fallback: number,
      min: number,
      max: number,
      setNumber: (value: number) => void,
      setText: (value: string) => void
    ) => {
      const next = parseBoundedInt(text, fallback, min, max);
      setNumber(next);
      setText(String(next));
    },
    []
  );

  const renderNumberField = (
    label: string,
    value: string,
    unit: string,
    onChangeText: (next: string) => void,
    onBlur: () => void,
    compact = false
  ) => (
    <View
      style={{
        borderWidth: 1,
        borderColor: '#282834',
        backgroundColor: '#121218',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: compact ? 12 : 10,
        gap: 6,
        ...(compact
          ? {
              flexBasis: macroCardBasis,
              minHeight: macroCardMinHeight,
              justifyContent: 'space-between',
            }
          : null),
      }}
    >
      <Text selectable style={{ color: '#a8a8b3', fontSize: 12 }}>
        {label}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
        <TextInput
          value={value}
          keyboardType="number-pad"
          onChangeText={(text) => onChangeText(digitsOnly(text))}
          onBlur={onBlur}
          style={{
            flex: 1,
            color: '#f5f5f5',
            fontSize: compact ? macroValueFontSize : 28,
            fontWeight: '700',
            paddingVertical: 0,
            lineHeight: compact ? macroValueLineHeight : 34,
          }}
        />
        <Text selectable style={{ color: '#8f8f98', fontWeight: '700', marginBottom: 6 }}>
          {unit}
        </Text>
      </View>
    </View>
  );
  return (
    <View style={{ flex: 1, backgroundColor: '#0b0b0f', padding: 20, gap: 14 }}>
      <View
        style={{
          paddingTop: 8,
          flexDirection: 'row',
          justifyContent: 'flex-start',
          alignItems: 'center',
        }}
      >
        <View style={{ gap: 2 }}>
          <Text selectable style={{ color: '#8f8f98', fontSize: 12, letterSpacing: 1.2 }}>
            SWIPE DECK
          </Text>
          <Text selectable style={{ color: '#f5f5f5', fontSize: 28, fontWeight: '700' }}>
            Generate
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <View
          style={{
            borderWidth: 1,
            borderColor: '#2a2a35',
            backgroundColor: '#121218',
            borderRadius: 10,
            paddingHorizontal: 10,
            paddingVertical: 6,
          }}
        >
          <Text selectable style={{ color: '#d0d0d8', fontVariant: ['tabular-nums'] }}>
            {protein}p / {carbs}c / {fats}f
          </Text>
        </View>
        <View
          style={{
            borderWidth: 1,
            borderColor: '#2a2a35',
            backgroundColor: '#121218',
            borderRadius: 10,
            paddingHorizontal: 10,
            paddingVertical: 6,
          }}
        >
          <Text selectable style={{ color: '#d0d0d8', fontVariant: ['tabular-nums'] }}>
            {timeLimit} min
          </Text>
        </View>
        <View style={{ marginLeft: 'auto' }}>
          <Text selectable style={{ color: '#8f8f98', fontVariant: ['tabular-nums'] }}>
            {hasDeckItems ? `${Math.min(index + 1, deck.length)}/${deck.length}` : '0/0'}
          </Text>
        </View>
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

      <View style={{ flex: 1, minHeight: 0 }}>
        {hasActiveCard ? (
          <View style={{ flex: 1 }}>
            {nextCard ? (
              <Animated.View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  width: '100%',
                  opacity: nextCardOpacity,
                  transform: [{ translateY: nextCardTranslateY }, { scale: nextCardScale }],
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: '#303040',
                  backgroundColor: '#171722',
                  padding: 12,
                  gap: 10,
                }}
              >
                <View
                  style={{
                    borderRadius: 14,
                    overflow: 'hidden',
                    borderWidth: 1,
                    borderColor: '#303041',
                    backgroundColor: '#232333',
                  }}
                >
                  <View
                    style={{
                      backgroundColor: '#343246',
                      paddingHorizontal: 14,
                      paddingTop: 12,
                      paddingBottom: 18,
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text selectable style={{ fontSize: 34 }}>
                        {recipeEmoji(nextCard.name)}
                      </Text>
                      <View
                        style={{
                          borderRadius: 999,
                          borderWidth: 1,
                          borderColor: '#5d5e78',
                          backgroundColor: '#292b3e',
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                        }}
                      >
                        <Text selectable style={{ color: '#e4e7ff', fontWeight: '700', fontSize: 12 }}>
                          Up next
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={{ height: 6, backgroundColor: '#2a2a39' }}>
                    <View style={{ height: '100%', width: `${nextDeckProgress * 100}%`, backgroundColor: '#8ec1ff' }} />
                  </View>
                </View>
                <Text selectable style={{ color: '#dedee9', fontWeight: '700', fontSize: 21 }}>
                  {nextCard.name}
                </Text>
                <Text selectable style={{ color: '#a2a7ba', lineHeight: 20 }}>
                  {nextCard.description}
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View
                    style={{
                      borderRadius: 999,
                      backgroundColor: '#20232d',
                      borderWidth: 1,
                      borderColor: '#2d3543',
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                    }}
                  >
                    <Text selectable style={{ color: '#a7d7ff', fontWeight: '700', fontSize: 12 }}>
                      P {nextCard.macros.protein}g
                    </Text>
                  </View>
                  <View
                    style={{
                      borderRadius: 999,
                      backgroundColor: '#29251d',
                      borderWidth: 1,
                      borderColor: '#413728',
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                    }}
                  >
                    <Text selectable style={{ color: '#f5d08c', fontWeight: '700', fontSize: 12 }}>
                      C {nextCard.macros.carbs}g
                    </Text>
                  </View>
                  <View
                    style={{
                      borderRadius: 999,
                      backgroundColor: '#2d2028',
                      borderWidth: 1,
                      borderColor: '#4a303d',
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                    }}
                  >
                    <Text selectable style={{ color: '#ffbfd7', fontWeight: '700', fontSize: 12 }}>
                      F {nextCard.macros.fats}g
                    </Text>
                  </View>
                </View>
              </Animated.View>
            ) : null}

            <Animated.View
              {...panResponder.panHandlers}
              style={{
                flex: 1,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: '#353544',
                backgroundColor: '#161620',
                padding: 12,
                gap: 10,
                justifyContent: 'space-between',
                transform: [{ translateX: drag.x }, { translateY: drag.y }, { rotateZ: rotation }],
              }}
            >
              <Animated.View style={{ opacity: swipeLabelOpacity }}>
                <View style={{ flexDirection: 'row', marginBottom: 6, justifyContent: 'space-between' }}>
                  <Animated.View style={{ opacity: leftLabelOpacity }}>
                      <Text
                        selectable
                        style={{
                          color: '#ff9eaa',
                          fontWeight: '700',
                          fontSize: 12,
                          letterSpacing: 1.2,
                        }}
                      >
                        SKIP
                      </Text>
                  </Animated.View>
                  <Animated.View style={{ opacity: rightLabelOpacity }}>
                      <Text
                        selectable
                        style={{
                          color: '#9ef4c7',
                          fontWeight: '700',
                          fontSize: 12,
                          letterSpacing: 1.2,
                        }}
                      >
                        SAVE
                      </Text>
                  </Animated.View>
                </View>
              </Animated.View>

                <View
                  style={{
                    borderRadius: 14,
                    overflow: 'hidden',
                    borderWidth: 1,
                    borderColor: '#303041',
                    backgroundColor: '#232333',
                  }}
                >
                  <View
                    style={{
                      backgroundColor: '#3a2e2f',
                      paddingHorizontal: 14,
                      paddingTop: 12,
                      paddingBottom: 18,
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text selectable style={{ fontSize: 38 }}>
                        {recipeEmoji(currentCard.name)}
                      </Text>
                      <View
                        style={{
                          borderRadius: 999,
                          borderWidth: 1,
                          borderColor: '#6f5a5d',
                          backgroundColor: '#2a2122',
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                        }}
                      >
                        <Text selectable style={{ color: '#f1e3e3', fontWeight: '700', fontSize: 12 }}>
                          {currentCard.preparation_time} min
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={{ height: 6, backgroundColor: '#2a2a39' }}>
                    <View
                      style={{ height: '100%', width: `${deckProgress * 100}%`, backgroundColor: '#98eec2' }}
                    />
                  </View>
                </View>
                <Text selectable style={{ color: '#f5f5f5', fontWeight: '700', fontSize: 22 }}>
                  {currentCard.name}
                </Text>
                <Text selectable style={{ color: '#b8b8c0', lineHeight: 20 }}>
                  {currentCard.description}
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View
                    style={{
                      borderRadius: 999,
                      backgroundColor: '#20232d',
                      borderWidth: 1,
                      borderColor: '#2d3543',
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                    }}
                  >
                    <Text selectable style={{ color: '#a7d7ff', fontWeight: '700', fontSize: 12 }}>
                      P {currentCard.macros.protein}g
                    </Text>
                  </View>
                  <View
                    style={{
                      borderRadius: 999,
                      backgroundColor: '#29251d',
                      borderWidth: 1,
                      borderColor: '#413728',
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                    }}
                  >
                    <Text selectable style={{ color: '#f5d08c', fontWeight: '700', fontSize: 12 }}>
                      C {currentCard.macros.carbs}g
                    </Text>
                  </View>
                  <View
                    style={{
                      borderRadius: 999,
                      backgroundColor: '#2d2028',
                      borderWidth: 1,
                      borderColor: '#4a303d',
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                    }}
                  >
                    <Text selectable style={{ color: '#ffbfd7', fontWeight: '700', fontSize: 12 }}>
                      F {currentCard.macros.fats}g
                    </Text>
                  </View>
                </View>
                <Text selectable style={{ color: '#8f8f98' }}>
                  Uses: {currentCard.ingredients.map((item) => item.name).join(', ')}
                </Text>
            </Animated.View>

            {showSwipeTutorial ? (
              <View
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: 0,
                  bottom: 0,
                  justifyContent: 'center',
                  alignItems: 'center',
                  paddingHorizontal: 20,
                  backgroundColor: 'rgba(5,5,10,0.55)',
                }}
              >
                <View
                  style={{
                    width: '100%',
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: '#3b3b49',
                    backgroundColor: '#14141c',
                    padding: 14,
                    gap: 12,
                  }}
                >
                  <Text selectable style={{ color: '#f4f4f4', fontWeight: '700', fontSize: 18 }}>
                    Swipe to choose
                  </Text>
                  <Text selectable style={{ color: '#b8b8c0', lineHeight: 19 }}>
                    Swipe left to skip. Swipe right to save.
                  </Text>
                  <Animated.View
                    style={{
                      alignSelf: 'center',
                      transform: [
                        {
                          translateX: swipeTutorialAnim.interpolate({
                            inputRange: [-1, 0, 1],
                            outputRange: [-44, 0, 44],
                          }),
                        },
                      ],
                    }}
                  >
                    <Text selectable style={{ color: '#d7d7df', fontSize: 24 }}>
                      ← →
                    </Text>
                  </Animated.View>
                  <Pressable
                    onPress={() => setSwipeTutorialConfirmed((prev) => !prev)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <View
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 4,
                        borderWidth: 1,
                        borderColor: swipeTutorialConfirmed ? '#9ec7ff' : '#4f4f5e',
                        backgroundColor: swipeTutorialConfirmed ? '#23405f' : 'transparent',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text selectable style={{ color: '#dff0ff', fontSize: 11, fontWeight: '700' }}>
                        {swipeTutorialConfirmed ? '✓' : ''}
                      </Text>
                    </View>
                    <Text selectable style={{ color: '#cfd4de' }}>
                      I understand swipe controls
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      void dismissSwipeTutorial();
                    }}
                    disabled={!swipeTutorialConfirmed}
                    style={{
                      borderRadius: 10,
                      paddingVertical: 10,
                      alignItems: 'center',
                      backgroundColor: swipeTutorialConfirmed ? '#f2f2f5' : '#4c4c56',
                    }}
                  >
                    <Text selectable style={{ color: '#0b0b0f', fontWeight: '700' }}>
                      Got it
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </View>
        ) : (
          <View
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: '#252530',
              backgroundColor: '#121218',
              borderRadius: 18,
              padding: 20,
              justifyContent: 'center',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <Text selectable style={{ color: '#f4f4f4', fontWeight: '700', fontSize: 22 }}>
              {hasDeckItems ? 'Deck complete' : 'No recipes yet'}
            </Text>
            <Text selectable style={{ color: '#a7a7b1', textAlign: 'center', lineHeight: 20 }}>
              {hasDeckItems
                ? 'All cards are swiped. Generate another deck with your latest inventory.'
                : 'Set your macros and generate your first swipe deck.'}
            </Text>
          </View>
        )}
      </View>

      <View style={{ paddingBottom: 4, gap: 10 }}>
        <Pressable
          disabled={submitting}
          onPress={() => setMacroSheetVisible(true)}
          style={{
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#2f2f3d',
            backgroundColor: submitting ? '#1f1f2a' : '#161620',
            paddingVertical: 11,
            alignItems: 'center',
          }}
        >
          <Text selectable style={{ color: '#e2e2ea', fontWeight: '700' }}>
            Change macros
          </Text>
        </Pressable>
        <Pressable
          disabled={submitting || ingredientsLoading}
          onPress={handleGenerate}
          style={{
            borderRadius: 12,
            backgroundColor: submitting || ingredientsLoading ? '#686874' : '#f5f5f5',
            paddingVertical: 12,
            alignItems: 'center',
          }}
        >
          <Text selectable style={{ color: '#0b0b0f', fontWeight: '700' }}>
            {submitting
              ? 'Generating...'
              : hasDeckItems
                ? hasUnsyncedRecipes
                  ? 'Sync Deck'
                  : 'Regenerate Deck'
                : 'Generate Swipe Deck'}
          </Text>
        </Pressable>
      </View>

      {lastSwipe ? (
        <Text selectable style={{ color: '#8f8f98', paddingBottom: 4 }}>
          Last action: {lastSwipe === 'right' ? 'Saved to collection' : 'Skipped'}
        </Text>
      ) : null}

      <Modal
        animationType="fade"
        transparent
        visible={outOfSyncModalVisible}
        onRequestClose={() => {
          if (outOfSyncKey) {
            setOutOfSyncModalSeenKey(outOfSyncKey);
          }
          setOutOfSyncModalVisible(false);
        }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(5,5,10,0.7)',
            justifyContent: 'center',
            paddingHorizontal: 20,
          }}
        >
          <View
            style={{
              borderRadius: 16,
              borderWidth: 1,
              borderColor: '#6a5732',
              backgroundColor: '#1a1510',
              padding: 16,
              gap: 12,
            }}
          >
            <Text selectable style={{ color: '#f6c574', fontWeight: '700', fontSize: 18 }}>
              Ingredients changed
            </Text>
            <Text selectable style={{ color: '#dfc18a', lineHeight: 20 }}>
              Your current deck was generated with an older inventory. Do you want to generate new
              recipes now, or keep swiping this deck?
            </Text>
            <View style={{ gap: 8 }}>
              <Pressable
                disabled={submitting || ingredientsLoading}
                onPress={() => {
                  if (outOfSyncKey) {
                    setOutOfSyncModalSeenKey(outOfSyncKey);
                  }
                  setOutOfSyncModalVisible(false);
                  void handleGenerate();
                }}
                style={{
                  borderRadius: 12,
                  backgroundColor: submitting || ingredientsLoading ? '#5f616f' : '#f5f5f5',
                  paddingVertical: 11,
                  alignItems: 'center',
                }}
              >
                <Text selectable style={{ color: '#0b0b0f', fontWeight: '700' }}>
                  {submitting ? 'Generating...' : 'Generate new recipes'}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (outOfSyncKey) {
                    setOutOfSyncModalSeenKey(outOfSyncKey);
                  }
                  setOutOfSyncModalVisible(false);
                }}
                style={{
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: '#7b6640',
                  backgroundColor: '#2c2418',
                  paddingVertical: 11,
                  alignItems: 'center',
                }}
              >
                <Text selectable style={{ color: '#f3d49a', fontWeight: '700' }}>
                  Keep current deck
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent
        visible={macroSheetVisible}
        onRequestClose={() => {
          if (!submitting) setMacroSheetVisible(false);
        }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.66)',
            justifyContent: 'flex-end',
          }}
        >
          <Pressable
            onPress={() => {
              if (submitting) return;
              Keyboard.dismiss();
              setMacroSheetVisible(false);
            }}
            style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'position' : 'height'}
            keyboardVerticalOffset={0}
            style={{ flex: 1, justifyContent: 'flex-end' }}
          >
            <Pressable
              onPress={(event) => {
                event.stopPropagation();
              }}
              style={{
                borderWidth: 1,
                borderColor: '#2a2a35',
                backgroundColor: '#0f0f14',
                borderTopLeftRadius: 18,
                borderTopRightRadius: 18,
                maxHeight: macroSheetHeight,
                overflow: 'hidden',
              }}
            >
              <ScrollView
                keyboardShouldPersistTaps="handled"
                automaticallyAdjustKeyboardInsets={false}
                contentContainerStyle={{
                  padding: 16,
                  gap: 12,
                  paddingBottom: macroScrollBottomPadding,
                }}
              >
                <Text selectable style={{ color: '#f4f4f4', fontWeight: '700', fontSize: 22 }}>
                  {hasDeckItems ? 'Adjust macros' : 'Set macros'}
                </Text>
                <Text selectable style={{ color: '#a7a7b1', lineHeight: 19 }}>
                  {hasDeckItems
                    ? 'Regenerate a new swipe deck with these targets.'
                    : 'Pick your macro target and generate your first swipe deck.'}
                </Text>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: macroGridGap }}>
                  {renderNumberField('Protein target', proteinInput, 'g', setProteinInput, () =>
                    commitField(proteinInput, protein, 20, 300, setProtein, setProteinInput), true
                  )}
                  {renderNumberField('Carbs target', carbsInput, 'g', setCarbsInput, () =>
                    commitField(carbsInput, carbs, 20, 400, setCarbs, setCarbsInput), true
                  )}
                  {renderNumberField('Fats target', fatsInput, 'g', setFatsInput, () =>
                    commitField(fatsInput, fats, 10, 150, setFats, setFatsInput), true
                  )}
                  {renderNumberField('Prep time limit', timeInput, 'min', setTimeInput, () =>
                    commitField(timeInput, timeLimit, 10, 90, setTimeLimit, setTimeInput), true
                  )}
                </View>

                <Text selectable style={{ color: '#8f8f98', fontSize: 12 }}>
                  Available ingredients: {availableIngredientNames.length}. Save inventory changes before generating.
                </Text>
              </ScrollView>
              <View
                onLayout={(event) => {
                  const nextHeight = Math.round(event.nativeEvent.layout.height);
                  if (nextHeight === macroFooterHeight) return;
                  setMacroFooterHeight(nextHeight);
                }}
                style={{
                  borderTopWidth: 1,
                  borderTopColor: '#252530',
                  paddingHorizontal: 16,
                  paddingTop: 12,
                  paddingBottom: MACRO_SHEET_FOOTER_BOTTOM_PADDING,
                }}
              >
                <Pressable
                  onPress={() => {
                    commitInputs();
                    Keyboard.dismiss();
                    if (!submitting) setMacroSheetVisible(false);
                  }}
                  disabled={submitting}
                  style={{
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: '#3a3a48',
                    backgroundColor: '#171720',
                    paddingVertical: 12,
                    alignItems: 'center',
                    opacity: submitting ? 0.5 : 1,
                  }}
                >
                  <Text selectable style={{ color: '#d5d5dd', fontWeight: '700' }}>
                    Done
                  </Text>
                </Pressable>
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}
