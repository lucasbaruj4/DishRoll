import * as React from 'react';
import { Pressable, Text, View } from 'react-native';

type IngredientTileProps = {
  icon: string;
  name: string;
  selected: boolean;
  onPress: () => void;
};

export default function IngredientTile({
  icon,
  name,
  selected,
  onPress,
}: IngredientTileProps) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        width: '31%',
        minHeight: 118,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: selected ? '#f4f4f4' : '#26262e',
        backgroundColor: selected ? '#1d1d24' : '#111116',
        paddingVertical: 12,
        paddingHorizontal: 8,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
      }}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: selected ? '#2b2b35' : '#1a1a21',
        }}
      >
        <Text style={{ fontSize: 24 }}>{icon}</Text>
      </View>
      <Text
        selectable
        style={{
          fontSize: 13,
          lineHeight: 16,
          color: '#f4f4f4',
          textAlign: 'center',
          fontWeight: selected ? '700' : '500',
        }}
      >
        {name}
      </Text>
    </Pressable>
  );
}

