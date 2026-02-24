import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ProfileStackParamList } from "../types";
import { ProfileHomeScreen } from "@screens/profile/ProfileHomeScreen";
import { SettingsScreen } from "@screens/profile/SettingsScreen";
import { useDefaultStackOptions } from "./shared";

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export function ProfileStackNavigator() {
  const defaultStackOptions = useDefaultStackOptions();

  return (
    <Stack.Navigator screenOptions={defaultStackOptions}>
      <Stack.Screen name="ProfileHome" component={ProfileHomeScreen} options={{ title: "\u041F\u0440\u043E\u0444\u0438\u043B\u044C" }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: "\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438" }} />
    </Stack.Navigator>
  );
}
