import * as React from 'react';
import { ScrollView, Text, TextInput, Pressable, View, Switch } from 'react-native';
import { useIngredients } from '../../hooks/useIngredients';

export default function InventoryScreen() {
  const { ingredients, loading, error, addIngredient, deleteIngredient, toggleAvailability } =
    useIngredients();
  const [name, setName] = React.useState('');
  const [quantity, setQuantity] = React.useState('');
  const [category, setCategory] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);

  const handleAdd = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    setSubmitting(true);
    setActionError(null);
    try {
      await addIngredient({
        name: trimmed,
        quantity: quantity.trim() ? quantity.trim() : null,
        category: category.trim() ? category.trim() : null,
      });
      setName('');
      setQuantity('');
      setCategory('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to add ingredient.';
      setActionError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setActionError(null);
    try {
      await deleteIngredient(id);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to delete ingredient.';
      setActionError(message);
    }
  };

  const handleToggle = async (id: string, next: boolean) => {
    setActionError(null);
    try {
      await toggleAvailability(id, next);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to update ingredient.';
      setActionError(message);
    }
  };

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: '#0b0b0f' }}
      contentContainerStyle={{ padding: 24, gap: 16, flexGrow: 1 }}
    >
      <View style={{ gap: 6 }}>
        <Text selectable style={{ fontSize: 20, fontWeight: '600', color: '#f5f5f5' }}>
          Inventory
        </Text>
        <Text selectable style={{ color: '#b3b3b3' }}>
          Track what you have on hand.
        </Text>
      </View>

      <View style={{ gap: 10 }}>
        <Text selectable style={{ fontWeight: '600', color: '#f5f5f5' }}>
          Add ingredient
        </Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Name (e.g. chicken)"
          style={{
            borderWidth: 1,
            borderColor: '#24242b',
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 10,
            color: '#f5f5f5',
          }}
          placeholderTextColor="#6c6c75"
        />
        <TextInput
          value={quantity}
          onChangeText={setQuantity}
          placeholder="Quantity (e.g. 2 lb)"
          style={{
            borderWidth: 1,
            borderColor: '#24242b',
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 10,
            color: '#f5f5f5',
          }}
          placeholderTextColor="#6c6c75"
        />
        <TextInput
          value={category}
          onChangeText={setCategory}
          placeholder="Category (optional)"
          style={{
            borderWidth: 1,
            borderColor: '#24242b',
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 10,
            color: '#f5f5f5',
          }}
          placeholderTextColor="#6c6c75"
        />
        <Pressable
          onPress={handleAdd}
          disabled={submitting}
          style={{
            backgroundColor: submitting ? '#6c6c75' : '#f5f5f5',
            paddingVertical: 12,
            borderRadius: 12,
            alignItems: 'center',
          }}
        >
          <Text selectable style={{ color: '#0b0b0f', fontWeight: '600' }}>
            {submitting ? 'Adding...' : 'Add ingredient'}
          </Text>
        </Pressable>
      </View>

      {loading ? <Text selectable style={{ color: '#f5f5f5' }}>Loading ingredients...</Text> : null}
      {error ? (
        <Text selectable style={{ color: '#ff6b6b' }}>
          {error}
        </Text>
      ) : null}
      {actionError ? (
        <Text selectable style={{ color: '#ff6b6b' }}>
          {actionError}
        </Text>
      ) : null}

      <View style={{ gap: 12 }}>
        {ingredients.map((item) => (
          <View
            key={item.id}
            style={{
              borderWidth: 1,
              borderColor: '#24242b',
              borderRadius: 14,
              padding: 12,
              gap: 8,
              backgroundColor: '#14141a',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ gap: 4, flex: 1 }}>
                <Text selectable style={{ fontSize: 16, fontWeight: '600', color: '#f5f5f5' }}>
                  {item.name}
                </Text>
                {item.quantity ? (
                  <Text selectable style={{ color: '#b3b3b3' }}>{item.quantity}</Text>
                ) : null}
                {item.category ? (
                  <Text selectable style={{ color: '#b3b3b3' }}>{item.category}</Text>
                ) : null}
              </View>
              <Switch
                value={item.is_available ?? true}
                onValueChange={(next) => handleToggle(item.id, next)}
              />
            </View>

            <Pressable
              onPress={() => handleDelete(item.id)}
              style={{
                alignSelf: 'flex-start',
                paddingVertical: 6,
                paddingHorizontal: 10,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: '#24242b',
              }}
            >
              <Text selectable style={{ color: '#f5f5f5' }}>
                Delete
              </Text>
            </Pressable>
          </View>
        ))}

        {!loading && ingredients.length === 0 ? (
          <Text selectable style={{ color: '#b3b3b3' }}>
            No ingredients yet. Add your first one above.
          </Text>
        ) : null}
      </View>
    </ScrollView>
  );
}
