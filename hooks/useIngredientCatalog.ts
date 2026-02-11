import * as React from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from './useAuth';

export type IngredientCatalogItem = {
  id: string;
  slug: string;
  name: string;
  category: string;
  search_terms: string[] | null;
  icon_key: string;
  sort_order: number;
};

export function useIngredientCatalog() {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = React.useState<IngredientCatalogItem[]>([]);
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
      .from('ingredient_catalog')
      .select('id, slug, name, category, search_terms, icon_key, sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    setItems((data ?? []) as IngredientCatalogItem[]);
    setLoading(false);
  }, [authLoading, user]);

  React.useEffect(() => {
    if (authLoading) return;
    refresh();
  }, [authLoading, refresh]);

  return {
    items,
    loading,
    error,
    refresh,
  };
}
