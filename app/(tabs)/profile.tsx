import * as React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useAuth } from '../../hooks/useAuth';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [submitting, setSubmitting] = React.useState(false);

  const handleSignOut = async () => {
    setSubmitting(true);
    try {
      await signOut();
    } finally {
      setSubmitting(false);
    }
  };

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
          ACCOUNT
        </Text>
        <Text selectable style={{ fontSize: 26, fontWeight: '700', color: '#f4f4f4' }}>
          Profile
        </Text>
        <Text selectable style={{ color: '#b3b3b3', lineHeight: 20 }}>
          {user?.email ?? 'No email found'}
        </Text>
      </View>

      <Pressable
        onPress={handleSignOut}
        disabled={submitting}
        style={{
          backgroundColor: submitting ? '#6c6c75' : '#f5f5f5',
          paddingVertical: 14,
          borderRadius: 14,
          alignItems: 'center',
        }}
      >
        <Text selectable style={{ color: '#0b0b0f', fontWeight: '600' }}>
          {submitting ? 'Signing out...' : 'Sign Out'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}
