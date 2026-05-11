import { View, Text } from "react-native";

export default function ProductsScreen() {
  return (
    <View className="flex-1 p-4 bg-gray-50">
      <Text className="text-xl font-bold mb-4">Productos</Text>
      <Text className="text-gray-500">Sin productos registrados</Text>
    </View>
  );
}
