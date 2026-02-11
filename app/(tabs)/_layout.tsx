import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs
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
      <Tabs.Screen name="inventory" options={{ title: 'Inventory' }} />
      <Tabs.Screen name="generate" options={{ title: 'Generate' }} />
      <Tabs.Screen name="saved" options={{ title: 'Saved' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
