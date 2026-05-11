import { View, Text } from "react-native";

export default function DashboardScreen() {
  return (
    <View className="flex-1 p-4 bg-gray-50">
      <Text className="text-xl font-bold mb-4">Dashboard</Text>
      <View className="bg-white rounded-xl p-4 shadow-sm mb-3">
        <Text className="text-gray-500">Productos</Text>
        <Text className="text-2xl font-bold">0</Text>
      </View>
      <View className="bg-white rounded-xl p-4 shadow-sm mb-3">
        <Text className="text-gray-500">Ventas hoy</Text>
        <Text className="text-2xl font-bold">Bs 0</Text>
      </View>
      <View className="bg-white rounded-xl p-4 shadow-sm mb-3">
        <Text className="text-gray-500">Stock bajo</Text>
        <Text className="text-2xl font-bold text-red-500">0</Text>
      </View>
    </View>
  );
}
