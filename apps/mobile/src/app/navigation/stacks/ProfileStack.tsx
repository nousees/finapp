// @ts-nocheck
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ProfileStackParamList } from "../types";
import { ProfileHomeScreen } from "@screens/profile/ProfileHomeScreen";
import { SettingsScreen } from "@screens/profile/SettingsScreen";
import { useDefaultStackOptions } from "./shared";

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export function ProfileStackNavigator({ onLogout }: { onLogout?: () => void }) {
  const defaultStackOptions = useDefaultStackOptions();

  return (
    <Stack.Navigator screenOptions={defaultStackOptions}>
      <Stack.Screen name="ProfileHome" options={{ headerShown: false }}>
        {(props) => <ProfileHomeScreen {...props} onLogout={onLogout} />}
      </Stack.Screen>
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: "Настройки" }} />
    </Stack.Navigator>
  );
}
