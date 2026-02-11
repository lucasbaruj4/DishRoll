import * as React from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from './useAuth';

export type DietaryRestrictionCatalogItem = {
  id: string;
  slug: string;
  name: string;
  kind: 'allergy' | 'dislike';
  search_terms: string[] | null;
  sort_order: number;
};

export function useDietaryRestrictionCatalog() {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = React.useState<DietaryRestrictionCatalogItem[]>([]);
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
      .from('dietary_restriction_catalog')
      .select('id, slug, name, kind, search_terms, sort_order')
      .eq('is_active', true)
      .order('kind', { ascending: true })
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    setItems((data ?? []) as DietaryRestrictionCatalogItem[]);
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
