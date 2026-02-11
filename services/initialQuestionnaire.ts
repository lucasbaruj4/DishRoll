import { supabase } from './supabase';

export type InitialQuestionnaireStep =
  | 'ingredients'
  | 'allergies'
  | 'cooking_level'
  | 'complete';

function asError(error: unknown, fallback: string) {
  if (error instanceof Error) return error;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.length > 0) {
      return new Error(message);
    }
  }
  return new Error(fallback);
}

export async function ensureQuestionnaireProfile(userId: string) {
  const { error } = await supabase.from('profiles').upsert({ id: userId }, { onConflict: 'id' });
  if (error) throw asError(error, 'Unable to initialize profile.');
}

export async function getQuestionnaireCompletion(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('initial_questionnaire_completed')
    .eq('id', userId)
    .single();

  if (error) throw asError(error, 'Unable to load questionnaire status.');
  return Boolean(data?.initial_questionnaire_completed);
}

export async function getQuestionnaireProgress(userId: string): Promise<{
  completed: boolean;
  step: InitialQuestionnaireStep | 'level';
}> {
  const { data, error } = await supabase
    .from('profiles')
    .select('initial_questionnaire_completed, initial_questionnaire_step')
    .eq('id', userId)
    .single();

  if (error) throw asError(error, 'Unable to load questionnaire progress.');

  return {
    completed: Boolean(data?.initial_questionnaire_completed),
    step: (data?.initial_questionnaire_step ?? 'ingredients') as
      | InitialQuestionnaireStep
      | 'level',
  };
}

export async function setQuestionnaireStep(userId: string, step: InitialQuestionnaireStep) {
  const writeStep = async (value: string) =>
    supabase.from('profiles').upsert(
      {
        id: userId,
        initial_questionnaire_step: value,
        initial_questionnaire_completed: step === 'complete',
      },
      { onConflict: 'id' }
    );

  const { error } = await writeStep(step);

  // Backward compatibility for projects that have not yet run migration 0005.
  if (
    error &&
    step === 'cooking_level' &&
    typeof error.message === 'string' &&
    error.message.includes('profiles_initial_questionnaire_step_check')
  ) {
    const legacy = await writeStep('level');
    if (legacy.error) {
      throw asError(legacy.error, 'Unable to save questionnaire step.');
    }
    return;
  }

  if (error) throw asError(error, 'Unable to save questionnaire step.');
}

export async function completeQuestionnaireWithCookingLevel(
  userId: string,
  cookingLevelId: string
) {
  const { error } = await supabase.from('profiles').upsert(
    {
      id: userId,
      cooking_level_id: cookingLevelId,
      initial_questionnaire_step: 'complete',
      initial_questionnaire_completed: true,
    },
    { onConflict: 'id' }
  );

  if (error) throw asError(error, 'Unable to save cooking level.');
}

export async function saveQuestionnaireIngredients(userId: string, catalogIds: string[]) {
  const { error: clearError } = await supabase
    .from('user_ingredients')
    .delete()
    .eq('user_id', userId)
    .eq('source', 'questionnaire');

  if (clearError) throw asError(clearError, 'Unable to clear selected ingredients.');

  if (catalogIds.length === 0) return;

  const rows = catalogIds.map((catalogId) => ({
    user_id: userId,
    catalog_id: catalogId,
    is_available: true,
    source: 'questionnaire' as const,
  }));

  const { error: insertError } = await supabase.from('user_ingredients').insert(rows);
  if (insertError) throw asError(insertError, 'Unable to save selected ingredients.');
}

export async function saveUserDietaryRestrictions(userId: string, restrictionIds: string[]) {
  const { error: clearError } = await supabase
    .from('user_dietary_restrictions')
    .delete()
    .eq('user_id', userId);

  if (clearError) throw asError(clearError, 'Unable to clear selected dietary restrictions.');

  if (restrictionIds.length === 0) return;

  const rows = restrictionIds.map((restrictionId) => ({
    user_id: userId,
    restriction_id: restrictionId,
  }));

  const { error: insertError } = await supabase.from('user_dietary_restrictions').insert(rows);
  if (insertError) throw asError(insertError, 'Unable to save selected dietary restrictions.');
}
