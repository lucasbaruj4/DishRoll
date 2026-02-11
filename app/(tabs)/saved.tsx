import { ScrollView, Text } from 'react-native';

export default function SavedScreen() {
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: '#0b0b0f' }}
      contentContainerStyle={{ padding: 24, gap: 12, flexGrow: 1 }}
    >
      <Text selectable style={{ fontSize: 20, fontWeight: '600', color: '#f5f5f5' }}>
        Saved Recipes
      </Text>
      <Text selectable style={{ color: '#b3b3b3' }}>
        Your favorites will show up here.
      </Text>
    </ScrollView>
  );
}
