import * as React from 'react';
import { Redirect } from 'expo-router';
import { ScrollView, Text } from 'react-native';
import { useAuth } from '../hooks/useAuth';

export default function Index() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: 24 }}
      >
        <Text selectable>Loading...</Text>
      </ScrollView>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  return <Redirect href="/(tabs)/generate" />;
}
