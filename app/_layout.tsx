import * as React from 'react';
import { Stack } from 'expo-router/stack';
import { useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '../hooks/useAuth';
import { useRlsCheck } from '../hooks/useRlsCheck';
import {
  ensureQuestionnaireProfile,
  getQuestionnaireProgress,
} from '../services/initialQuestionnaire';

function AuthGate() {
  const { session, user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  useRlsCheck();
  const [questionnaireDone, setQuestionnaireDone] = React.useState<boolean | null>(null);
  const [questionnaireStep, setQuestionnaireStep] = React.useState<
    'ingredients' | 'allergies' | 'cooking_level' | 'complete' | 'level' | null
  >(null);

  React.useEffect(() => {
    const syncQuestionnaireStatus = async () => {
      if (loading) return;

      if (!session || !user) {
        setQuestionnaireDone(null);
        setQuestionnaireStep(null);
        return;
      }

      try {
        await ensureQuestionnaireProfile(user.id);
        const progress = await getQuestionnaireProgress(user.id);
        setQuestionnaireDone(progress.completed);
        setQuestionnaireStep(progress.step);
      } catch {
        setQuestionnaireDone(false);
        setQuestionnaireStep('ingredients');
      }
    };

    syncQuestionnaireStatus();
  }, [loading, session, user]);

  React.useEffect(() => {
    if (loading) return;
    if (session && questionnaireDone === null) return;
    if (session && questionnaireStep === null) return;
    const [firstSegment] = segments;
    const secondSegment = segments.slice(1, 2)[0];
    const inAuthGroup = firstSegment === '(auth)';
    const thirdSegment = segments.slice(2, 3)[0];
    const isOnboarding =
      inAuthGroup &&
      (secondSegment === 'onboarding' ||
        secondSegment === 'kitchen' ||
        secondSegment === 'initial_questionaire');
    const currentQuestionnaireSubroute =
      secondSegment === 'initial_questionaire' ? thirdSegment : null;

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/onboarding');
      return;
    }

    if (session && questionnaireDone === false) {
      const target =
        questionnaireStep === 'allergies'
          ? '/(auth)/initial_questionaire/allergies'
          : questionnaireStep === 'cooking_level' || questionnaireStep === 'level'
            ? '/(auth)/initial_questionaire/cooking-level'
            : '/(auth)/initial_questionaire/ingredients';

      if (!isOnboarding) {
        router.replace(target);
        return;
      }

      if (
        secondSegment === 'initial_questionaire' &&
        ((target.endsWith('/ingredients') && currentQuestionnaireSubroute !== 'ingredients') ||
          (target.endsWith('/allergies') && currentQuestionnaireSubroute !== 'allergies') ||
          (target.endsWith('/cooking-level') &&
            currentQuestionnaireSubroute !== 'cooking-level'))
      ) {
        router.replace(target);
      }

      return;
    }

    if (session && inAuthGroup && !isOnboarding) {
      router.replace('/(tabs)/inventory');
    }
  }, [loading, session, questionnaireDone, questionnaireStep, segments, router]);

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
