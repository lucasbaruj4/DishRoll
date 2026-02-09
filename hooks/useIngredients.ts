import * as React from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from './useAuth';

export type Ingredient = {
  id: string;
  user_id: string;
  name: string;
  quantity: string | null;
  category: string | null;
  is_available: boolean | null;
  created_at: string;
};

type IngredientInput = {
  name: string;
  quantity?: string | null;
  category?: string | null;
};

export function useIngredients() {
  const { user } = useAuth();
  const [ingredients, setIngredients] = React.useState<Ingredient[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchIngredients = React.useCallback(async () => {
    if (!user) {
      setIngredients([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('ingredients')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    setIngredients((data ?? []) as Ingredient[]);
    setLoading(false);
  }, [user]);

  React.useEffect(() => {
    fetchIngredients();
  }, [fetchIngredients]);

  const addIngredient = async (input: IngredientInput) => {
    if (!user) throw new Error('Not authenticated.');

    const payload = {
      user_id: user.id,
      name: input.name.trim(),
      quantity: input.quantity ?? null,
      category: input.category ?? null,
      is_available: true,
    };

    const { data, error: insertError } = await supabase
      .from('ingredients')
      .insert(payload)
      .select('*')
      .single();

    if (insertError) {
      throw insertError;
    }

    if (data) {
      setIngredients((prev) => [data as Ingredient, ...prev]);
    }
  };

  const updateIngredient = async (id: string, updates: Partial<IngredientInput>) => {
    if (!user) throw new Error('Not authenticated.');

    const payload = {
      ...(updates.name !== undefined ? { name: updates.name.trim() } : {}),
      ...(updates.quantity !== undefined ? { quantity: updates.quantity } : {}),
      ...(updates.category !== undefined ? { category: updates.category } : {}),
    };

    const { data, error: updateError } = await supabase
      .from('ingredients')
      .update(payload)
      .eq('id', id)
      .eq('user_id', user.id)
      .select('*')
      .single();

    if (updateError) {
      throw updateError;
    }

    if (data) {
      setIngredients((prev) => prev.map((item) => (item.id === id ? (data as Ingredient) : item)));
    }
  };

  const deleteIngredient = async (id: string) => {
    if (!user) throw new Error('Not authenticated.');

    const previous = ingredients;
    setIngredients((prev) => prev.filter((item) => item.id !== id));

    const { error: deleteError } = await supabase
      .from('ingredients')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (deleteError) {
      setIngredients(previous);
      throw deleteError;
    }
  };

  const toggleAvailability = async (id: string, next: boolean) => {
    if (!user) throw new Error('Not authenticated.');

    const previous = ingredients;
    setIngredients((prev) =>
      prev.map((item) => (item.id === id ? { ...item, is_available: next } : item))
    );

    const { data, error: updateError } = await supabase
      .from('ingredients')
      .update({ is_available: next })
      .eq('id', id)
      .eq('user_id', user.id)
      .select('*')
      .single();

    if (updateError) {
      setIngredients(previous);
      throw updateError;
    }

    if (data) {
      setIngredients((prev) => prev.map((item) => (item.id === id ? (data as Ingredient) : item)));
    }
  };

  return {
    ingredients,
    loading,
    error,
    refresh: fetchIngredients,
    addIngredient,
    updateIngredient,
    deleteIngredient,
    toggleAvailability,
  };
}
