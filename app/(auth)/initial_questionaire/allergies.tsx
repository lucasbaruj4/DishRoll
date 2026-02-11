import * as React from 'react';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import IngredientTile from '../../../components/onboarding/IngredientTile';
import {
  DIETARY_RESTRICTION_ICON_EMOJI,
  FALLBACK_DIETARY_RESTRICTION_ICON,
} from '../../../data/restrictionIcons';
import { useAuth } from '../../../hooks/useAuth';
import { useDietaryRestrictionCatalog } from '../../../hooks/useDietaryRestrictionCatalog';
import { supabase } from '../../../services/supabase';
import {
  saveUserDietaryRestrictions,
  setQuestionnaireStep,
} from '../../../services/initialQuestionnaire';

export default function InitialAllergiesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { items, loading, error, refresh } = useDietaryRestrictionCatalog();
  const [query, setQuery] = React.useState('');
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const bootstrap = async () => {
      if (!user) return;
      const { data, error: selectedError } = await supabase
        .from('user_dietary_restrictions')
        .select('restriction_id')
        .eq('user_id', user.id);

      if (selectedError) {
        return;
      }

      setSelectedIds(new Set((data ?? []).map((row) => row.restriction_id as string)));
    };

    bootstrap();
  }, [user]);

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = items.filter((item) => {
    if (!normalizedQuery) return true;
    if (item.name.toLowerCase().includes(normalizedQuery)) return true;
    if (item.slug.toLowerCase().includes(normalizedQuery)) return true;
    return (item.search_terms ?? []).some((term) =>
      term.toLowerCase().includes(normalizedQuery)
    );
  });

  const allergies = filtered.filter((item) => item.kind === 'allergy');
  const dislikes = filtered.filter((item) => item.kind === 'dislike');

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleContinue = async () => {
    if (!user) {
      setSaveError('Please sign in again.');
      return;
    }

    setSaveError(null);
    setSaving(true);

    try {
      const selectedRestrictionIds = Array.from(selectedIds);
      await saveUserDietaryRestrictions(user.id, selectedRestrictionIds);
      await setQuestionnaireStep(user.id, 'cooking_level');
      router.push('/(auth)/initial_questionaire/cooking-level');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to save allergies and dislikes.';
      setSaveError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: '#0b0b0f' }}
      contentContainerStyle={{ padding: 24, gap: 16, flexGrow: 1 }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ gap: 8 }}>
        <Text selectable style={{ color: '#8f8f98', fontSize: 12, letterSpacing: 1.8 }}>
          STEP 2 OF 3
        </Text>
        <Text selectable style={{ fontSize: 26, fontWeight: '700', color: '#f4f4f4' }}>
          Allergies and disliked foods
        </Text>
        <Text selectable style={{ color: '#b1b1ba', lineHeight: 20 }}>
          Select what should never show up in your recommendations.
        </Text>
      </View>

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search allergies or foods..."
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
            Loading restrictions...
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
        <View style={{ gap: 14 }}>
          {allergies.length > 0 ? (
            <View style={{ gap: 10 }}>
              <Text selectable style={{ color: '#c6c6cf', fontWeight: '700', fontSize: 15 }}>
                Allergies
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {allergies.map((item) => (
                  <IngredientTile
                    key={item.id}
                    icon={
                      DIETARY_RESTRICTION_ICON_EMOJI[item.slug] ??
                      FALLBACK_DIETARY_RESTRICTION_ICON
                    }
                    name={item.name}
                    selected={selectedIds.has(item.id)}
                    onPress={() => toggleSelected(item.id)}
                  />
                ))}
              </View>
            </View>
          ) : null}

          {dislikes.length > 0 ? (
            <View style={{ gap: 10 }}>
              <Text selectable style={{ color: '#c6c6cf', fontWeight: '700', fontSize: 15 }}>
                Disliked Foods
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {dislikes.map((item) => (
                  <IngredientTile
                    key={item.id}
                    icon={
                      DIETARY_RESTRICTION_ICON_EMOJI[item.slug] ??
                      FALLBACK_DIETARY_RESTRICTION_ICON
                    }
                    name={item.name}
                    selected={selectedIds.has(item.id)}
                    onPress={() => toggleSelected(item.id)}
                  />
                ))}
              </View>
            </View>
          ) : null}
        </View>
      ) : null}

      {!loading && !error && filtered.length === 0 ? (
        <Text selectable style={{ color: '#8f8f98' }}>
          No restrictions matched your search.
        </Text>
      ) : null}

      {saveError ? (
        <Text selectable style={{ color: '#ff7f7f' }}>
          {saveError}
        </Text>
      ) : null}

      <Pressable
        onPress={handleContinue}
        disabled={saving}
        style={{
          marginTop: 8,
          paddingVertical: 13,
          borderRadius: 14,
          alignItems: 'center',
          backgroundColor: saving ? '#64646f' : '#f4f4f4',
        }}
      >
        <Text selectable style={{ color: '#050506', fontWeight: '700' }}>
          {saving ? 'Saving...' : 'Continue'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}
