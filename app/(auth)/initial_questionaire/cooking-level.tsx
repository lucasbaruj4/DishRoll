import { Stack, useRouter } from 'expo-router';
import { HeaderBackButton } from '@react-navigation/elements';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
  type LayoutChangeEvent,
  type GestureResponderEvent,
} from 'react-native';
import * as React from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useCookingLevelCatalog } from '../../../hooks/useCookingLevelCatalog';
import { supabase } from '../../../services/supabase';
import {
  completeQuestionnaireWithCookingLevel,
  getQuestionnaireProgress,
} from '../../../services/initialQuestionnaire';

export default function InitialLevelScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { items, loading, error, refresh } = useCookingLevelCatalog();
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [trackWidth, setTrackWidth] = React.useState(0);
  const [trackPageX, setTrackPageX] = React.useState(0);
  const [isSliding, setIsSliding] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const trackRef = React.useRef<View | null>(null);

  const waitForQuestionnaireCompletion = async (userId: string) => {
    const maxAttempts = 12;
    const waitMs = 120;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const progress = await getQuestionnaireProgress(userId);
      if (progress.completed) return true;
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }

    return false;
  };

  React.useEffect(() => {
    const bootstrap = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('cooking_level_id')
        .eq('id', user.id)
        .single();

      if (data?.cooking_level_id) {
        setSelectedId(data.cooking_level_id as string);
      }
    };

    bootstrap();
  }, [user]);

  React.useEffect(() => {
    if (items.length === 0 || selectedId) return;
    const defaultLevel = items.find((item) => item.rank === 3) ?? items[0];
    if (defaultLevel) {
      setSelectedId(defaultLevel.id);
    }
  }, [items, selectedId]);

  const selectedIndex = Math.max(
    0,
    items.findIndex((item) => item.id === selectedId)
  );
  const selectedItem = items[selectedIndex];
  const knobSize = 28;
  const trackHorizontalPadding = 14;
  const maxKnobTravel = Math.max(trackWidth - trackHorizontalPadding * 2 - knobSize, 0);
  const knobLeft =
    trackHorizontalPadding +
    (items.length > 1 ? (maxKnobTravel * selectedIndex) / (items.length - 1) : 0);

  const onTrackLayout = (event: LayoutChangeEvent) => {
    setTrackWidth(event.nativeEvent.layout.width);
    requestAnimationFrame(() => {
      trackRef.current?.measureInWindow((x) => {
        setTrackPageX(x);
      });
    });
  };

  const updateSelectionFromTouch = (event: GestureResponderEvent) => {
    if (items.length === 0 || trackWidth <= 0) return;
    const knobRadius = knobSize / 2;
    const leftPadding = trackHorizontalPadding + knobRadius;
    const rightPadding = trackHorizontalPadding + knobRadius;
    const usableWidth = trackWidth - leftPadding - rightPadding;
    if (usableWidth <= 0) return;

    const rawX = event.nativeEvent.pageX - trackPageX;
    const clamped = Math.max(leftPadding, Math.min(rawX, trackWidth - rightPadding));
    const normalized = (clamped - leftPadding) / usableWidth;
    const nextIndex = Math.round(normalized * (items.length - 1));
    const item = items[nextIndex];
    if (item) {
      setSelectedId(item.id);
    }
  };

  const handleFinish = async () => {
    if (!user || !selectedId) {
      setSaveError('Please select your cooking level.');
      return;
    }

    setSaveError(null);
    setSaving(true);
    try {
      await completeQuestionnaireWithCookingLevel(user.id, selectedId);
      await waitForQuestionnaireCompletion(user.id);
      router.replace('/(tabs)/generate');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to save cooking level.';
      setSaveError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (saving) return;
    router.dismissTo('/(auth)/initial_questionaire/allergies');
  };

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      scrollEnabled={!isSliding}
      style={{ backgroundColor: '#0b0b0f' }}
      contentContainerStyle={{ padding: 24, gap: 16, flexGrow: 1 }}
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
          STEP 3 OF 3
        </Text>
        <Text selectable style={{ fontSize: 26, fontWeight: '700', color: '#f4f4f4' }}>
          Cooking level
        </Text>
        <Text selectable style={{ color: '#b1b1ba', lineHeight: 20 }}>
          Drag the slider across 5 fixed levels so we can tailor recipe complexity.
        </Text>
      </View>

      {loading ? (
        <View style={{ paddingVertical: 30, alignItems: 'center', gap: 10 }}>
          <ActivityIndicator color="#f4f4f4" />
          <Text selectable style={{ color: '#b1b1ba' }}>
            Loading cooking levels...
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

      {!loading && !error && items.length > 0 ? (
        <View style={{ gap: 16 }}>
          <View
            ref={trackRef}
            onLayout={onTrackLayout}
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onResponderGrant={(event) => {
              setIsSliding(true);
              updateSelectionFromTouch(event);
            }}
            onResponderMove={updateSelectionFromTouch}
            onResponderRelease={() => setIsSliding(false)}
            onResponderTerminate={() => setIsSliding(false)}
            style={{
              height: 52,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: '#2b2b33',
              backgroundColor: '#111116',
              justifyContent: 'center',
              paddingHorizontal: 14,
              position: 'relative',
            }}
          >
            <View
              style={{
                height: 4,
                borderRadius: 999,
                backgroundColor: '#2f2f38',
              }}
            />

            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: 12,
                left: knobLeft,
                width: knobSize,
                height: knobSize,
                borderRadius: knobSize / 2,
                backgroundColor: '#f4f4f4',
                borderWidth: 1,
                borderColor: '#ffffff',
              }}
            />

            <View
              style={{
                position: 'absolute',
                left: trackHorizontalPadding,
                right: trackHorizontalPadding,
                top: 0,
                bottom: 0,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              {items.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => setSelectedId(item.id)}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                  }}
                />
              ))}
            </View>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text selectable style={{ color: '#9b9ba5', fontSize: 12 }}>
              Beginner
            </Text>
            <Text selectable style={{ color: '#9b9ba5', fontSize: 12 }}>
              Experienced
            </Text>
          </View>

          {selectedItem ? (
            <View
              style={{
                borderRadius: 14,
                borderWidth: 1,
                borderColor: '#2b2b33',
                backgroundColor: '#111116',
                padding: 14,
                gap: 6,
              }}
            >
              <Text selectable style={{ color: '#f4f4f4', fontWeight: '700', fontSize: 16 }}>
                {selectedItem.label}
              </Text>
              <Text selectable style={{ color: '#b1b1ba', lineHeight: 19 }}>
                {selectedItem.description}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {saveError ? (
        <Text selectable style={{ color: '#ff7f7f' }}>
          {saveError}
        </Text>
      ) : null}

      <Pressable
        onPress={handleFinish}
        disabled={saving || loading || Boolean(error) || items.length === 0}
        style={{
          marginTop: 8,
          paddingVertical: 13,
          borderRadius: 14,
          alignItems: 'center',
          backgroundColor:
            saving || loading || Boolean(error) || items.length === 0 ? '#64646f' : '#f4f4f4',
        }}
      >
        <Text selectable style={{ color: '#050506', fontWeight: '700' }}>
          {saving ? 'Saving...' : 'Finish Setup'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}
