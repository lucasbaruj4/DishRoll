import { ScrollView, Text } from 'react-native';

export default function SavedScreen() {
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: 24, gap: 12 }}
    >
      <Text selectable style={{ fontSize: 20, fontWeight: '600' }}>
        Saved Recipes
      </Text>
      <Text selectable style={{ color: '#666' }}>
        Your favorites will show up here.
      </Text>
    </ScrollView>
  );
}
