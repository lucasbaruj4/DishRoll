import * as React from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from './useAuth';

export type CookingLevelCatalogItem = {
  id: string;
  code: string;
  label: string;
  description: string;
  rank: number;
};

export function useCookingLevelCatalog() {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = React.useState<CookingLevelCatalogItem[]>([]);
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
      .from('cooking_level_catalog')
      .select('id, code, label, description, rank')
      .eq('is_active', true)
      .order('rank', { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    setItems((data ?? []) as CookingLevelCatalogItem[]);
    setLoading(false);
  }, [authLoading, user]);

  React.useEffect(() => {
    if (authLoading) return;
    refresh();
  }, [authLoading, refresh]);

  return { items, loading, error, refresh };
}

