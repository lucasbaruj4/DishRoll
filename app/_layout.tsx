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
  const [hasSyncedInitialQuestionnaireRoute, setHasSyncedInitialQuestionnaireRoute] =
    React.useState(false);

  React.useEffect(() => {
    const syncQuestionnaireStatus = async () => {
      if (loading) return;

      if (!session || !user) {
        setQuestionnaireDone(null);
        setQuestionnaireStep(null);
        setHasSyncedInitialQuestionnaireRoute(false);
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
    if (loading || !session || !user) return;

    let active = true;
    const syncProgressOnRouteChange = async () => {
      try {
        const progress = await getQuestionnaireProgress(user.id);
        if (!active) return;
        setQuestionnaireDone(progress.completed);
        setQuestionnaireStep(progress.step);
      } catch {
        // Keep existing state when refresh fails.
      }
    };

    syncProgressOnRouteChange();

    return () => {
      active = false;
    };
  }, [segments, loading, session, user]);

  React.useEffect(() => {
    if (loading) return;
    if (session && questionnaireDone === null) return;
    if (session && questionnaireStep === null) return;
    const [firstSegment] = segments;
    const secondSegment = segments.slice(1, 2)[0];
    const thirdSegment = segments.slice(2, 3)[0];
    const inAuthGroup = firstSegment === '(auth)';
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
      const inInitialQuestionnaire =
        inAuthGroup && secondSegment === 'initial_questionaire';
      const inOnboarding = inAuthGroup && secondSegment === 'onboarding';

      if (inOnboarding) {
        // Allow users to back out to onboarding; re-entry will sync to persisted step.
        if (hasSyncedInitialQuestionnaireRoute) {
          setHasSyncedInitialQuestionnaireRoute(false);
        }
        return;
      }

      if (!inAuthGroup) {
        router.replace(target);
        return;
      }

      if (!inInitialQuestionnaire) {
        router.replace('/(auth)/onboarding');
        return;
      }

      if (!hasSyncedInitialQuestionnaireRoute) {
        const expectedSubroute = target.endsWith('/allergies')
          ? 'allergies'
          : target.endsWith('/cooking-level')
            ? 'cooking-level'
            : 'ingredients';
        const isOnExpectedQuestionnaireStep =
          secondSegment === 'initial_questionaire' && thirdSegment === expectedSubroute;

        if (!isOnExpectedQuestionnaireStep) {
          router.replace(target);
          return;
        }

        setHasSyncedInitialQuestionnaireRoute(true);
      }

      return;
    }

    if (session && questionnaireDone === true && inAuthGroup) {
      router.replace('/(tabs)/generate');
    }
  }, [
    loading,
    session,
    questionnaireDone,
    questionnaireStep,
    segments,
    router,
    hasSyncedInitialQuestionnaireRoute,
  ]);

  return null;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AuthGate />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#050506' },
        }}
      >
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </AuthProvider>
  );
}
