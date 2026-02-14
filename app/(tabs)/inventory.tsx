import * as React from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import IngredientTile from '../../components/onboarding/IngredientTile';
import { FALLBACK_INGREDIENT_ICON, INGREDIENT_ICON_EMOJI } from '../../data/ingredientIcons';
import { useIngredientCatalog } from '../../hooks/useIngredientCatalog';
import { useUserIngredients } from '../../hooks/useUserIngredients';

export default function InventoryScreen() {
  const { items: catalogItems, loading: catalogLoading, error: catalogError, refresh: refreshCatalog } =
    useIngredientCatalog();
  const {
    availableCatalogIds,
    loading: selectionLoading,
    error: selectionError,
    refresh: refreshSelection,
    setAvailabilityBatch,
  } = useUserIngredients();
  const [query, setQuery] = React.useState('');
  const [pendingChanges, setPendingChanges] = React.useState<Map<string, boolean>>(new Map());
  const [savingChanges, setSavingChanges] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const saveBarAnim = React.useRef(new Animated.Value(0)).current;

  const loading = catalogLoading || selectionLoading;
  const error = catalogError ?? selectionError;
  const hasPendingChanges = pendingChanges.size > 0;

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = catalogItems.filter((item) => {
    if (!normalizedQuery) return true;
    if (item.name.toLowerCase().includes(normalizedQuery)) return true;
    if (item.slug.toLowerCase().includes(normalizedQuery)) return true;

    return (item.search_terms ?? []).some((term) =>
      term.toLowerCase().includes(normalizedQuery)
    );
  });

  React.useEffect(() => {
    Animated.spring(saveBarAnim, {
      toValue: hasPendingChanges ? 1 : 0,
      useNativeDriver: true,
      bounciness: 7,
      speed: 18,
    }).start();
  }, [hasPendingChanges, saveBarAnim]);

  const isSelected = React.useCallback(
    (catalogId: string) => {
      const pending = pendingChanges.get(catalogId);
      if (pending !== undefined) return pending;
      return availableCatalogIds.has(catalogId);
    },
    [availableCatalogIds, pendingChanges]
  );

  const availableNowCount = React.useMemo(() => {
    let count = availableCatalogIds.size;
    pendingChanges.forEach((next, catalogId) => {
      const current = availableCatalogIds.has(catalogId);
      if (current === next) return;
      count += next ? 1 : -1;
    });
    return count;
  }, [availableCatalogIds, pendingChanges]);

  const handleToggle = (catalogId: string) => {
    const current = isSelected(catalogId);
    const next = !current;
    setActionError(null);
    setPendingChanges((prev) => {
      const copy = new Map(prev);
      const committed = availableCatalogIds.has(catalogId);
      if (next === committed) {
        copy.delete(catalogId);
      } else {
        copy.set(catalogId, next);
      }
      return copy;
    });
  };

  const handleSaveChanges = async () => {
    if (pendingChanges.size === 0 || savingChanges) return;

    setSavingChanges(true);
    setActionError(null);

    try {
      const changes = Array.from(pendingChanges.entries()).map(([catalogId, isAvailable]) => ({
        catalogId,
        isAvailable,
      }));
      await setAvailabilityBatch(changes);
      setPendingChanges(new Map());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to update ingredient.';
      setActionError(message);
    } finally {
      setSavingChanges(false);
    }
  };

  const handleRetry = async () => {
    await Promise.all([refreshCatalog(), refreshSelection()]);
  };

  const saveBarTranslate = saveBarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [80, 0],
  });

  return (
    <View style={{ flex: 1, backgroundColor: '#0b0b0f' }}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ backgroundColor: '#0b0b0f' }}
        contentContainerStyle={{ padding: 24, gap: 16, flexGrow: 1, paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ gap: 8 }}>
          <Text selectable style={{ color: '#8f8f98', fontSize: 12, letterSpacing: 1.8 }}>
            PANTRY
          </Text>
          <Text selectable style={{ fontSize: 26, fontWeight: '700', color: '#f4f4f4' }}>
            Inventory
          </Text>
          <Text selectable style={{ color: '#b1b1ba', lineHeight: 20 }}>
            Tap ingredients, then save your changes when you are done.
          </Text>
        </View>

        <View
          style={{
            borderWidth: 1,
            borderColor: '#202027',
            backgroundColor: '#111116',
            borderRadius: 16,
            padding: 12,
            gap: 12,
          }}
        >
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search ingredients..."
            autoCapitalize="none"
            autoCorrect={false}
            placeholderTextColor="#6a6a74"
            style={{
              borderWidth: 1,
              borderColor: '#2a2a31',
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 11,
              color: '#f4f4f4',
              backgroundColor: '#09090d',
            }}
          />
          <Text selectable style={{ color: '#8f8f98' }}>
            Available now: {availableNowCount}
          </Text>
        </View>

        {loading ? (
          <View style={{ paddingVertical: 30, alignItems: 'center', gap: 10 }}>
            <ActivityIndicator color="#f4f4f4" />
            <Text selectable style={{ color: '#b1b1ba' }}>
              Loading ingredients...
            </Text>
          </View>
        ) : null}

        {error ? (
          <View style={{ gap: 10, alignItems: 'flex-start' }}>
            <Text selectable style={{ color: '#ff7f7f' }}>
              {error}
            </Text>
            <Pressable
              onPress={handleRetry}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: '#34343d',
              }}
            >
              <Text selectable style={{ color: '#f4f4f4' }}>
                Retry
              </Text>
            </Pressable>
          </View>
        ) : null}

        {actionError ? (
          <Text selectable style={{ color: '#ff7f7f' }}>
            {actionError}
          </Text>
        ) : null}

        {!loading && !error ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, opacity: savingChanges ? 0.7 : 1 }}>
            {filtered.map((item) => (
              <IngredientTile
                key={item.id}
                icon={INGREDIENT_ICON_EMOJI[item.icon_key] ?? FALLBACK_INGREDIENT_ICON}
                name={item.name}
                selected={isSelected(item.id)}
                onPress={() => handleToggle(item.id)}
              />
            ))}
          </View>
        ) : null}

        {!loading && !error && filtered.length === 0 ? (
          <Text selectable style={{ color: '#8f8f98' }}>
            No ingredients matched your search.
          </Text>
        ) : null}
      </ScrollView>

      <Animated.View
        pointerEvents={hasPendingChanges ? 'auto' : 'none'}
        style={{
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: 18,
          opacity: saveBarAnim,
          transform: [{ translateY: saveBarTranslate }],
        }}
      >
        <View
          style={{
            borderRadius: 16,
            borderWidth: 1,
            borderColor: '#323241',
            backgroundColor: '#111116',
            padding: 12,
            gap: 10,
          }}
        >
          <Text selectable style={{ color: '#b8b8c0' }}>
            {pendingChanges.size} change{pendingChanges.size === 1 ? '' : 's'} pending
          </Text>
          <Pressable
            onPress={handleSaveChanges}
            disabled={savingChanges}
            style={{
              borderRadius: 12,
              paddingVertical: 12,
              alignItems: 'center',
              backgroundColor: savingChanges ? '#6c6c75' : '#f4f4f4',
            }}
          >
            <Text selectable style={{ color: '#0b0b0f', fontWeight: '700' }}>
              {savingChanges ? 'Saving...' : 'Save changes'}
            </Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}
