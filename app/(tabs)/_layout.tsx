import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabsLayout() {
  return (
    <Tabs
      initialRouteName="generate"
      screenOptions={{
        headerTitleAlign: 'center',
        headerStyle: { backgroundColor: '#050506' },
        headerTintColor: '#f4f4f4',
        headerTitleStyle: { color: '#f4f4f4' },
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: '#050506' },
        tabBarStyle: {
          backgroundColor: '#050506',
          borderTopColor: '#1f1f26',
        },
        tabBarActiveTintColor: '#f4f4f4',
        tabBarInactiveTintColor: '#8f8f98',
      }}
    >
      <Tabs.Screen
        name="generate"
        options={{
          title: 'Generate',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'sparkles' : 'sparkles-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: 'Inventory',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'basket' : 'basket-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: 'Saved',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'bookmark' : 'bookmark-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
