import { ScrollView, Text } from 'react-native';

export default function GenerateScreen() {
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: 24, gap: 12 }}
    >
      <Text selectable style={{ fontSize: 20, fontWeight: '600' }}>
        Generate Recipes
      </Text>
      <Text selectable style={{ color: '#666' }}>
        Enter macro targets and generate recipe ideas from your pantry.
      </Text>
    </ScrollView>
  );
}
