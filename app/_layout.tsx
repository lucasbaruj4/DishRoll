import * as React from 'react';
import { Stack } from 'expo-router/stack';
import { useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '../hooks/useAuth';
import { useRlsCheck } from '../hooks/useRlsCheck';

function AuthGate() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  useRlsCheck();

  React.useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === '(auth)';
    const isOnboarding =
      inAuthGroup && (segments[1] === 'onboarding' || segments[1] === 'kitchen');

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/onboarding');
      return;
    }

    if (session && inAuthGroup && !isOnboarding) {
      router.replace('/(tabs)/inventory');
    }
  }, [loading, session, segments, router]);

  return null;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AuthGate />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </AuthProvider>
  );
}
