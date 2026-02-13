import * as React from 'react';
import { Stack, useRouter } from 'expo-router';
import { HeaderBackButton } from '@react-navigation/elements';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import IngredientTile from '../../../components/onboarding/IngredientTile';
import { FALLBACK_INGREDIENT_ICON, INGREDIENT_ICON_EMOJI } from '../../../data/ingredientIcons';
import { useAuth } from '../../../hooks/useAuth';
import { useIngredientCatalog } from '../../../hooks/useIngredientCatalog';
import { supabase } from '../../../services/supabase';
import {
  saveQuestionnaireIngredients,
  setQuestionnaireStep,
} from '../../../services/initialQuestionnaire';

export default function InitialIngredientsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { items, loading, error, refresh } = useIngredientCatalog();
  const [query, setQuery] = React.useState('');
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const continueBarAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const bootstrap = async () => {
      if (!user) return;
      const { data, error: selectedError } = await supabase
        .from('user_ingredients')
        .select('catalog_id')
        .eq('user_id', user.id)
        .eq('is_available', true)
        .eq('source', 'questionnaire');

      if (selectedError) {
        return;
      }

      setSelectedIds(new Set((data ?? []).map((row) => row.catalog_id as string)));
    };

    bootstrap();
  }, [user]);

  const normalizedQuery = query.trim().toLowerCase();
  const selectedCount = selectedIds.size;
  const hasMinimumSelection = selectedCount >= 3;
  const filtered = items.filter((item) => {
    if (!normalizedQuery) return true;

    if (item.name.toLowerCase().includes(normalizedQuery)) return true;
    if (item.slug.toLowerCase().includes(normalizedQuery)) return true;

    return (item.search_terms ?? []).some((term) =>
      term.toLowerCase().includes(normalizedQuery)
    );
  });

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleContinue = async () => {
    if (!hasMinimumSelection || saving) return;

    if (!user) {
      setSaveError('Please sign in again.');
      return;
    }

    setSaveError(null);
    setSaving(true);

    try {
      const selectedCatalogIds = Array.from(selectedIds);
      await saveQuestionnaireIngredients(user.id, selectedCatalogIds);
      await setQuestionnaireStep(user.id, 'allergies');

      router.replace('/(auth)/initial_questionaire/allergies');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to save selected ingredients.';
      setSaveError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    router.dismissTo('/(auth)/onboarding');
  };

  React.useEffect(() => {
    Animated.spring(continueBarAnim, {
      toValue: hasMinimumSelection ? 1 : 0,
      useNativeDriver: true,
      bounciness: 7,
      speed: 18,
    }).start();
  }, [continueBarAnim, hasMinimumSelection]);

  const continueBarTranslate = continueBarAnim.interpolate({
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
        <Stack.Screen
          options={{
            headerBackVisible: false,
            headerLeft: () =>
              saving ? null : <HeaderBackButton tintColor="#f4f4f4" onPress={handleBack} />,
          }}
        />

        <View style={{ gap: 8 }}>
          <Text selectable style={{ color: '#8f8f98', fontSize: 12, letterSpacing: 1.8 }}>
            STEP 1 OF 3
          </Text>
          <Text selectable style={{ fontSize: 26, fontWeight: '700', color: '#f4f4f4' }}>
            What ingredients do you usually have?
          </Text>
          <Text selectable style={{ color: '#b1b1ba', lineHeight: 20 }}>
            Pick what you have on hand. You can update this later in inventory.
          </Text>
          <Text selectable style={{ color: '#8f8f98' }}>
            Selected: {selectedCount} (minimum 3)
          </Text>
        </View>

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
            backgroundColor: '#111116',
          }}
        />

        {loading ? (
          <View style={{ paddingVertical: 30, alignItems: 'center', gap: 10 }}>
            <ActivityIndicator color="#f4f4f4" />
            <Text selectable style={{ color: '#b1b1ba' }}>
              Loading ingredients...
            </Text>
          </View>
        ) : null}

        {!loading && error ? (
          <View style={{ gap: 10, alignItems: 'flex-start' }}>
            <Text selectable style={{ color: '#ff7f7f' }}>
              {error}
            </Text>
            <Pressable
              onPress={refresh}
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

        {!loading && !error ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {filtered.map((item) => (
              <IngredientTile
                key={item.id}
                icon={INGREDIENT_ICON_EMOJI[item.icon_key] ?? FALLBACK_INGREDIENT_ICON}
                name={item.name}
                selected={selectedIds.has(item.id)}
                onPress={() => toggleSelected(item.id)}
              />
            ))}
          </View>
        ) : null}

        {!loading && !error && filtered.length === 0 ? (
          <Text selectable style={{ color: '#8f8f98' }}>
            No ingredients matched your search.
          </Text>
        ) : null}

        {saveError ? (
          <Text selectable style={{ color: '#ff7f7f' }}>
            {saveError}
          </Text>
        ) : null}
      </ScrollView>

      <Animated.View
        pointerEvents={hasMinimumSelection ? 'auto' : 'none'}
        style={{
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: 18,
          opacity: continueBarAnim,
          transform: [{ translateY: continueBarTranslate }],
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
            {selectedCount} ingredient{selectedCount === 1 ? '' : 's'} selected
          </Text>
          <Pressable
            onPress={handleContinue}
            disabled={saving}
            style={{
              borderRadius: 12,
              paddingVertical: 12,
              alignItems: 'center',
              backgroundColor: saving ? '#6c6c75' : '#f4f4f4',
            }}
          >
            <Text selectable style={{ color: '#0b0b0f', fontWeight: '700' }}>
              {saving ? 'Saving...' : 'Continue'}
            </Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}
