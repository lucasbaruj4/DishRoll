import { ScrollView, Text, View } from 'react-native';

export default function SavedScreen() {
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: '#0b0b0f' }}
      contentContainerStyle={{ padding: 24, gap: 16, flexGrow: 1 }}
    >
      <View
        style={{
          borderRadius: 20,
          borderWidth: 1,
          borderColor: '#1f1f27',
          backgroundColor: '#121218',
          padding: 18,
          gap: 8,
        }}
      >
        <Text selectable style={{ color: '#8f8f98', fontSize: 12, letterSpacing: 1.8 }}>
          COLLECTION
        </Text>
        <Text selectable style={{ fontSize: 26, fontWeight: '700', color: '#f4f4f4' }}>
          Saved Recipes
        </Text>
        <Text selectable style={{ color: '#b3b3b3', lineHeight: 20 }}>
          Recipes you keep from swiping right will appear here.
        </Text>
      </View>

      <View
        style={{
          borderRadius: 14,
          borderWidth: 1,
          borderColor: '#252530',
          backgroundColor: '#14141a',
          padding: 14,
          gap: 6,
        }}
      >
        <Text selectable style={{ color: '#f4f4f4', fontWeight: '700' }}>
          Coming next
        </Text>
        <Text selectable style={{ color: '#a7a7b1' }}>
          Recipe cards, detail links, and quick delete actions.
        </Text>
      </View>
    </ScrollView>
  );
}
