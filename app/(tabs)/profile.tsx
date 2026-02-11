import * as React from 'react';
import { ScrollView, Text, Pressable } from 'react-native';
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
      contentContainerStyle={{ padding: 24, gap: 12, flexGrow: 1 }}
    >
      <Text selectable style={{ fontSize: 20, fontWeight: '600', color: '#f5f5f5' }}>
        Profile
      </Text>
      <Text selectable style={{ color: '#b3b3b3' }}>
        {user?.email ?? 'No email found'}
      </Text>
      <Pressable
        onPress={handleSignOut}
        disabled={submitting}
        style={{
          backgroundColor: submitting ? '#6c6c75' : '#f5f5f5',
          paddingVertical: 12,
          borderRadius: 12,
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
