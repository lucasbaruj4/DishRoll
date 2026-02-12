import * as React from 'react';
import { useRouter } from 'expo-router';
import { ScrollView, Text, Pressable, View } from 'react-native';

const INGREDIENTS = [
  'Chicken',
  'Beef',
  'Pork',
  'Eggs',
  'Salmon',
  'Tuna',
  'Tofu',
  'Greek yogurt',
  'Rice',
  'Pasta',
  'Potatoes',
  'Oats',
  'Beans',
  'Lentils',
  'Broccoli',
  'Spinach',
  'Bell peppers',
  'Onions',
  'Tomatoes',
  'Mushrooms',
  'Cheese',
  'Avocado',
  'Olive oil',
  'Almonds',
];

export default function KitchenScreen() {
  const router = useRouter();
  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  const toggleIngredient = (item: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(item)) {
        next.delete(item);
      } else {
        next.add(item);
      }
      return next;
    });
  };

  const handleContinue = () => {
    router.replace('/(tabs)/generate');
  };

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: '#0b0b0f' }}
      contentContainerStyle={{ padding: 24, gap: 16, flexGrow: 1 }}
    >
      <View style={{ gap: 6 }}>
        <Text selectable style={{ fontSize: 22, fontWeight: '600', color: '#f5f5f5' }}>
          What do you have in your kitchen now?
        </Text>
        <Text selectable style={{ color: '#b3b3b3' }}>
          Pick a few ingredients to get started. You can edit this later.
        </Text>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {INGREDIENTS.map((item) => {
          const active = selected.has(item);
          return (
            <Pressable
              key={item}
              onPress={() => toggleIngredient(item)}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: active ? '#f5f5f5' : '#24242b',
                backgroundColor: active ? '#f5f5f5' : '#14141a',
              }}
            >
              <Text selectable style={{ color: active ? '#0b0b0f' : '#f5f5f5' }}>
                {item}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        onPress={handleContinue}
        style={{
          backgroundColor: '#f5f5f5',
          paddingVertical: 12,
          borderRadius: 12,
          alignItems: 'center',
          marginTop: 8,
        }}
      >
        <Text selectable style={{ color: '#0b0b0f', fontWeight: '600' }}>
          Continue
        </Text>
      </Pressable>
    </ScrollView>
  );
}
