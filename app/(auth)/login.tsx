import * as React from 'react';
import { Link } from 'expo-router';
import { ScrollView, Text, TextInput, Pressable, View } from 'react-native';
import { useAuth } from '../../hooks/useAuth';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to sign in.';
      setError(message);
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
      <View style={{ gap: 8 }}>
        <Text selectable style={{ fontSize: 24, fontWeight: '600', color: '#f5f5f5' }}>
          Welcome back
        </Text>
        <Text selectable style={{ color: '#b3b3b3' }}>
          Sign in to keep planning your meals.
        </Text>
      </View>

      <View style={{ gap: 12 }}>
        <View style={{ gap: 6 }}>
          <Text selectable style={{ color: '#f5f5f5' }}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder="you@email.com"
            style={{
              borderWidth: 1,
              borderColor: '#24242b',
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 10,
              color: '#f5f5f5',
            }}
            placeholderTextColor="#6c6c75"
          />
        </View>

        <View style={{ gap: 6 }}>
          <Text selectable style={{ color: '#f5f5f5' }}>Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Your password"
            style={{
              borderWidth: 1,
              borderColor: '#24242b',
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 10,
              color: '#f5f5f5',
            }}
            placeholderTextColor="#6c6c75"
          />
        </View>

        {error ? (
          <Text selectable style={{ color: '#ff6b6b' }}>
            {error}
          </Text>
        ) : null}

        <Pressable
          onPress={handleSubmit}
          disabled={submitting}
          style={{
            backgroundColor: submitting ? '#6c6c75' : '#f5f5f5',
            paddingVertical: 12,
            borderRadius: 12,
            alignItems: 'center',
          }}
        >
          <Text selectable style={{ color: '#0b0b0f', fontWeight: '600' }}>
            {submitting ? 'Signing in...' : 'Sign In'}
          </Text>
        </Pressable>
      </View>

      <Link href="/(auth)/signup" asChild>
        <Pressable>
          <Text selectable style={{ color: '#f5f5f5', textDecorationLine: 'underline' }}>
            Need an account? Sign up
          </Text>
        </Pressable>
      </Link>

      <Link href="/(auth)/onboarding" asChild>
        <Pressable>
          <Text selectable style={{ color: '#f5f5f5', textDecorationLine: 'underline' }}>
            Back to intro
          </Text>
        </Pressable>
      </Link>
    </ScrollView>
  );
}
