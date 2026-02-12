import * as React from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from './useAuth';

export type UserIngredient = {
  id: string;
  user_id: string;
  catalog_id: string;
  is_available: boolean;
  source: 'questionnaire' | 'manual';
};

export function useUserIngredients() {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = React.useState<UserIngredient[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    if (authLoading) return;
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('user_ingredients')
      .select('id, user_id, catalog_id, is_available, source')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    setItems((data ?? []) as UserIngredient[]);
    setLoading(false);
  }, [authLoading, user]);

  React.useEffect(() => {
    if (authLoading) return;
    refresh();
  }, [authLoading, refresh]);

  const setAvailability = async (catalogId: string, next: boolean) => {
    if (!user) throw new Error('Not authenticated.');

    const existing = items.find((item) => item.catalog_id === catalogId);

    if (existing) {
      const { data, error: updateError } = await supabase
        .from('user_ingredients')
        .update({ is_available: next })
        .eq('id', existing.id)
        .eq('user_id', user.id)
        .select('id, user_id, catalog_id, is_available, source')
        .single();

      if (updateError) throw updateError;

      setItems((prev) =>
        prev.map((item) =>
          item.id === existing.id ? ((data as UserIngredient | null) ?? item) : item
        )
      );
      return;
    }

    const { data, error: insertError } = await supabase
      .from('user_ingredients')
      .insert({
        user_id: user.id,
        catalog_id: catalogId,
        is_available: next,
        source: 'manual',
      })
      .select('id, user_id, catalog_id, is_available, source')
      .single();

    if (insertError) throw insertError;
    if (data) {
      setItems((prev) => [data as UserIngredient, ...prev]);
    }
  };

  const availableCatalogIds = React.useMemo(() => {
    const set = new Set<string>();
    for (const item of items) {
      if (item.is_available) set.add(item.catalog_id);
    }
    return set;
  }, [items]);

  return {
    items,
    availableCatalogIds,
    loading,
    error,
    refresh,
    setAvailability,
  };
}
