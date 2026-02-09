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
      contentContainerStyle={{ padding: 24, gap: 12 }}
    >
      <Text selectable style={{ fontSize: 20, fontWeight: '600' }}>
        Profile
      </Text>
      <Text selectable style={{ color: '#666' }}>
        {user?.email ?? 'No email found'}
      </Text>
      <Pressable
        onPress={handleSignOut}
        disabled={submitting}
        style={{
          backgroundColor: submitting ? '#999' : '#111',
          paddingVertical: 12,
          borderRadius: 12,
          alignItems: 'center',
        }}
      >
        <Text selectable style={{ color: '#fff', fontWeight: '600' }}>
          {submitting ? 'Signing out...' : 'Sign Out'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}
