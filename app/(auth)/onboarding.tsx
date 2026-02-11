import * as React from 'react';
import { Link } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Animated, ScrollView, Text, Pressable, View, useWindowDimensions } from 'react-native';

export default function OnboardingScreen() {
  const { width } = useWindowDimensions();
  const [page, setPage] = React.useState(0);
  const [carouselWidth, setCarouselWidth] = React.useState(width - 48);
  const scrollX = React.useRef(new Animated.Value(0)).current;
  const CARD_GAP = 14;
  const slides = [
    {
      title: 'Use what you already have',
      body: 'Pick ingredients in your kitchen and we build recipes around them.',
    },
    {
      title: 'Hit your macro targets',
      body: 'Set protein, carbs, and fats to keep your week on track.',
    },
    {
      title: 'Swipe, save, cook, rate',
      body: 'Quickly pick what sounds good and save your favorites.',
    },
  ];

  const snapInterval = Math.max(carouselWidth + CARD_GAP, 1);
  const maxOffset = snapInterval * (slides.length - 1);

  const circleOneTranslateX = scrollX.interpolate({
    inputRange: [0, snapInterval * (slides.length - 1)],
    outputRange: [0, -48],
    extrapolate: 'clamp',
  });

  const circleOneTranslateY = scrollX.interpolate({
    inputRange: [0, snapInterval * (slides.length - 1)],
    outputRange: [0, 16],
    extrapolate: 'clamp',
  });

  const circleTwoTranslateX = scrollX.interpolate({
    inputRange: [0, snapInterval * (slides.length - 1)],
    outputRange: [0, 56],
    extrapolate: 'clamp',
  });

  const circleTwoTranslateY = scrollX.interpolate({
    inputRange: [0, snapInterval * (slides.length - 1)],
    outputRange: [0, -22],
    extrapolate: 'clamp',
  });

  return (
    <View style={{ flex: 1, backgroundColor: '#050506' }}>
      <StatusBar style="light" backgroundColor="#050506" />
      <View
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: '#050506',
        }}
      />
      <Animated.View
        style={{
          position: 'absolute',
          top: 60,
          right: -40,
          width: 220,
          height: 220,
          borderRadius: 220,
          borderWidth: 1,
          borderColor: '#1d1d22',
          transform: [{ translateX: circleOneTranslateX }, { translateY: circleOneTranslateY }],
        }}
      />
      <Animated.View
        style={{
          position: 'absolute',
          bottom: 40,
          left: -30,
          width: 180,
          height: 180,
          borderRadius: 180,
          borderWidth: 1,
          borderColor: '#1a1a20',
          transform: [{ translateX: circleTwoTranslateX }, { translateY: circleTwoTranslateY }],
        }}
      />

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ backgroundColor: 'transparent' }}
        contentContainerStyle={{ padding: 24, gap: 22, flexGrow: 1 }}
      >
        <View style={{ gap: 10 }}>
          <Text
            selectable
            style={{
              fontSize: 36,
              fontWeight: '700',
              color: '#f4f4f4',
              letterSpacing: -0.8,
            }}
          >
            Meals, distilled.
          </Text>
          <Text selectable style={{ color: '#a4a4ac', fontSize: 16, lineHeight: 22 }}>
            A calm, precise way to cook with what you already have.
          </Text>
        </View>

        <View
          onLayout={(event) => {
            const measuredWidth = event.nativeEvent.layout.width;
            if (measuredWidth > 0 && measuredWidth !== carouselWidth) {
              setCarouselWidth(measuredWidth);
            }
          }}
        >
          <Animated.ScrollView
            horizontal
            pagingEnabled={false}
            snapToInterval={snapInterval}
            snapToAlignment="start"
            disableIntervalMomentum
            showsHorizontalScrollIndicator={false}
            bounces={false}
            alwaysBounceHorizontal={false}
            overScrollMode="never"
            decelerationRate="fast"
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: scrollX } } }],
              { useNativeDriver: false }
            )}
            onMomentumScrollEnd={(event) => {
              const clamped = Math.max(
                0,
                Math.min(event.nativeEvent.contentOffset.x, maxOffset)
              );
              const nextPage = Math.round(clamped / snapInterval);
              if (nextPage !== page) setPage(nextPage);
            }}
            scrollEventThrottle={16}
          >
            {slides.map((item, index) => (
              <View
                key={item.title}
                style={{
                  width: carouselWidth,
                  marginRight: index === slides.length - 1 ? 0 : CARD_GAP,
                }}
              >
                <View
                  style={{
                    width: carouselWidth,
                    height: 400,
                    borderRadius: 30,
                    padding: 24,
                    justifyContent: 'space-between',
                    backgroundColor: '#0e0e12',
                    borderWidth: 1,
                    borderColor: '#1f1f26',
                    overflow: 'hidden',
                  }}
                >
                  <View style={{ gap: 16 }}>
                    <Text
                      selectable
                      style={{
                        fontSize: 13,
                        textTransform: 'uppercase',
                        letterSpacing: 3,
                        color: '#6f6f79',
                      }}
                    >
                      Step {index + 1}
                    </Text>
                    <Text
                      selectable
                      style={{
                        fontSize: 28,
                        fontWeight: '700',
                        color: '#f4f4f4',
                        letterSpacing: -0.6,
                      }}
                    >
                      {item.title}
                    </Text>
                    <Text selectable style={{ color: '#b4b4be', fontSize: 16, lineHeight: 22 }}>
                      {item.body}
                    </Text>
                  </View>

                  <View style={{ gap: 12 }}>
                    <View
                      style={{
                        height: 1,
                        backgroundColor: '#1c1c22',
                        width: '100%',
                        opacity: 0.7,
                      }}
                    />
                    <Text selectable style={{ color: '#8f8f9a', fontSize: 13 }}>
                      {index + 1} / {slides.length}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </Animated.ScrollView>
        </View>

        <View style={{ flexDirection: 'row', gap: 10, alignSelf: 'center' }}>
          {slides.map((_, index) => {
            const inputRange = [
              (index - 1) * snapInterval,
              index * snapInterval,
              (index + 1) * snapInterval,
            ];

            return (
              <Animated.View
                key={`dot-${index}`}
                style={{
                  width: scrollX.interpolate({
                    inputRange,
                    outputRange: [8, 22, 8],
                    extrapolate: 'clamp',
                  }),
                  height: 8,
                  borderRadius: 999,
                  backgroundColor: '#f4f4f4',
                  opacity: scrollX.interpolate({
                    inputRange,
                    outputRange: [0.24, 1, 0.24],
                    extrapolate: 'clamp',
                  }),
                }}
              />
            );
          })}
        </View>

        <View style={{ gap: 12, marginTop: 6 }}>
          <Link href="/(auth)/signup" asChild>
            <Pressable
              style={{
                backgroundColor: '#f4f4f4',
                paddingVertical: 12,
                borderRadius: 14,
                alignItems: 'center',
              }}
            >
              <Text selectable style={{ color: '#050506', fontWeight: '600' }}>
                Create account
              </Text>
            </Pressable>
          </Link>

          <Link href="/(auth)/login" asChild>
            <Pressable style={{ alignItems: 'center' }}>
              <Text selectable style={{ textDecorationLine: 'underline', color: '#f4f4f4' }}>
                Already have an account? Log in
              </Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </View>
  );
}
