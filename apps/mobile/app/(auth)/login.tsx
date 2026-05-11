import { View, Text, TextInput, TouchableOpacity } from "react-native";

export default function LoginScreen() {
  return (
    <View className="flex-1 justify-center p-6 bg-white">
      <Text className="text-2xl font-bold text-center mb-8">Inventory App</Text>
      <TextInput className="border border-gray-300 rounded-lg p-3 mb-4" placeholder="Email" keyboardType="email-address" autoCapitalize="none" />
      <TextInput className="border border-gray-300 rounded-lg p-3 mb-6" placeholder="Contraseña" secureTextEntry />
      <TouchableOpacity className="bg-blue-600 rounded-lg p-3">
        <Text className="text-white text-center font-semibold">Iniciar Sesión</Text>
      </TouchableOpacity>
    </View>
  );
}
