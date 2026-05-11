import { View, Text } from "react-native";

export default function POSSreen() {
  return (
    <View className="flex-1 p-4 bg-gray-50">
      <Text className="text-xl font-bold mb-4">Punto de Venta</Text>
      <Text className="text-gray-500">Escanee un producto para comenzar</Text>
    </View>
  );
}
