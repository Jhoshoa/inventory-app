import { Tabs } from "expo-router";
import { Text } from "react-native";

export default function MainLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="dashboard/index" options={{ title: "Inicio", tabBarIcon: () => <Text>🏠</Text> }} />
      <Tabs.Screen name="products/index" options={{ title: "Productos", tabBarIcon: () => <Text>📦</Text> }} />
      <Tabs.Screen name="sales/index" options={{ title: "Ventas", tabBarIcon: () => <Text>💰</Text> }} />
      <Tabs.Screen name="settings/index" options={{ title: "Ajustes", tabBarIcon: () => <Text>⚙️</Text> }} />
    </Tabs>
  );
}
