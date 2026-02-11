import { Stack } from 'expo-router/stack';

export default function AuthLayout() {
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
      <Stack.Screen name="login" options={{ title: 'Log In' }} />
      <Stack.Screen name="signup" options={{ title: 'Sign Up' }} />
      <Stack.Screen
        name="initial_questionaire/ingredients"
        options={{
          title: 'Initial Questionnaire',
          animationTypeForReplace: 'pop',
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="initial_questionaire/allergies"
        options={{
          title: 'Initial Questionnaire',
          animationTypeForReplace: 'pop',
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="initial_questionaire/cooking-level"
        options={{
          title: 'Initial Questionnaire',
          animationTypeForReplace: 'pop',
          gestureEnabled: false,
        }}
      />
      <Stack.Screen name="kitchen" options={{ title: 'Your Kitchen' }} />
    </Stack>
  );
}
