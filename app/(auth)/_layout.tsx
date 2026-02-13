import { Stack } from 'expo-router/stack';
import { Link } from 'expo-router';
import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function AuthLayout() {
  const renderOnboardingBack = () => (
    <Link replace href="/(auth)/onboarding" asChild>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back"
        hitSlop={10}
        style={{ paddingHorizontal: 4, paddingVertical: 2 }}
      >
        <Ionicons name="chevron-back" size={26} color="#f4f4f4" />
      </Pressable>
    </Link>
  );

  return (
    <Stack
      screenOptions={{
        headerTitleAlign: 'center',
        headerStyle: { backgroundColor: '#050506' },
        headerTintColor: '#f4f4f4',
        headerTitleStyle: { color: '#f4f4f4' },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: '#050506' },
      }}
    >
      <Stack.Screen
        name="onboarding"
        options={{
          headerShown: false,
          animationTypeForReplace: 'pop',
        }}
      />
      <Stack.Screen
        name="login"
        options={{
          title: 'Log In',
          headerBackTitle: '',
          headerBackButtonDisplayMode: 'minimal',
          animationTypeForReplace: 'push',
          headerLeft: renderOnboardingBack,
        }}
      />
      <Stack.Screen
        name="signup"
        options={{
          title: 'Sign Up',
          headerBackTitle: '',
          headerBackButtonDisplayMode: 'minimal',
          animationTypeForReplace: 'push',
          headerLeft: renderOnboardingBack,
        }}
      />
      <Stack.Screen
        name="initial_questionaire/ingredients"
        options={{
          title: 'Initial Questionnaire',
          animationTypeForReplace: 'push',
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="initial_questionaire/allergies"
        options={{
          title: 'Initial Questionnaire',
          animationTypeForReplace: 'push',
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="initial_questionaire/cooking-level"
        options={{
          title: 'Initial Questionnaire',
          animationTypeForReplace: 'push',
          gestureEnabled: false,
        }}
      />
      <Stack.Screen name="kitchen" options={{ title: 'Your Kitchen' }} />
    </Stack>
  );
}
