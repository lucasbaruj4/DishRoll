import * as React from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from './useAuth';

export function useRlsCheck() {
  const { user, session } = useAuth();

  React.useEffect(() => {
    if (!__DEV__) return;
    if (!session || !user) return;

    let cancelled = false;

    const run = async () => {
      const checks = [
        supabase
          .from('profiles')
          .select('id')
          .neq('id', user.id)
          .limit(1),
        supabase
          .from('ingredients')
          .select('id,user_id')
          .neq('user_id', user.id)
          .limit(1),
        supabase
          .from('recipes')
          .select('id,user_id')
          .neq('user_id', user.id)
          .limit(1),
        supabase
          .from('recipe_ratings')
          .select('id,user_id')
          .neq('user_id', user.id)
          .limit(1),
        supabase
          .from('swipe_history')
          .select('id,user_id')
          .neq('user_id', user.id)
          .limit(1),
      ];

      const results = await Promise.all(checks);

      if (cancelled) return;

      results.forEach((result, index) => {
        if (result.error) {
          return;
        }
        if (result.data && result.data.length > 0) {
          const table =
            index === 0
              ? 'profiles'
              : index === 1
              ? 'ingredients'
              : index === 2
              ? 'recipes'
              : index === 3
              ? 'recipe_ratings'
              : 'swipe_history';
          console.error(`RLS check failed: ${table} returned rows for another user.`);
        }
      });
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [session, user]);
}
