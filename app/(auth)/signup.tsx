import * as React from 'react';
import { Link } from 'expo-router';
import { ScrollView, Text, TextInput, Pressable, View } from 'react-native';
import { useAuth } from '../../hooks/useAuth';

export default function SignupScreen() {
  const { signUp } = useAuth();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await signUp(email.trim(), password);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to sign up.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: 24, gap: 16 }}
    >
      <View style={{ gap: 8 }}>
        <Text selectable style={{ fontSize: 24, fontWeight: '600' }}>
          Create your account
        </Text>
        <Text selectable style={{ color: '#666' }}>
          Start building your macro-friendly meal plan.
        </Text>
      </View>

      <View style={{ gap: 12 }}>
        <View style={{ gap: 6 }}>
          <Text selectable>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder="you@email.com"
            style={{
              borderWidth: 1,
              borderColor: '#ddd',
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 10,
            }}
          />
        </View>

        <View style={{ gap: 6 }}>
          <Text selectable>Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Create a password"
            style={{
              borderWidth: 1,
              borderColor: '#ddd',
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 10,
            }}
          />
        </View>

        {error ? (
          <Text selectable style={{ color: '#b00020' }}>
            {error}
          </Text>
        ) : null}

        <Pressable
          onPress={handleSubmit}
          disabled={submitting}
          style={{
            backgroundColor: submitting ? '#999' : '#111',
            paddingVertical: 12,
            borderRadius: 12,
            alignItems: 'center',
          }}
        >
          <Text selectable style={{ color: '#fff', fontWeight: '600' }}>
            {submitting ? 'Creating account...' : 'Sign Up'}
          </Text>
        </Pressable>
      </View>

      <Link href="/(auth)/login" asChild>
        <Pressable>
          <Text selectable style={{ color: '#111', textDecorationLine: 'underline' }}>
            Already have an account? Log in
          </Text>
        </Pressable>
      </Link>
    </ScrollView>
  );
}
