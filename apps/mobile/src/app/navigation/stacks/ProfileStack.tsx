import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ProfileStackParamList } from "../types";
import { ProfileHomeScreen } from "@screens/profile/ProfileHomeScreen";
import { SettingsScreen } from "@screens/profile/SettingsScreen";
import { defaultStackOptions } from "./shared";

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export function ProfileStackNavigator() {
  return (
    <Stack.Navigator screenOptions={defaultStackOptions}>
      <Stack.Screen name="ProfileHome" component={ProfileHomeScreen} options={{ title: "Профиль" }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: "Настройки" }} />
    </Stack.Navigator>
  );
}
