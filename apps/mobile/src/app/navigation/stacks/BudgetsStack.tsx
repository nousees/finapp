import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { BudgetsStackParamList } from "../types";
import { BudgetsScreen } from "@screens/analysis/BudgetsScreen";
import { NotificationsScreen } from "@screens/analysis/NotificationsScreen";
import { useDefaultStackOptions } from "./shared";

const Stack = createNativeStackNavigator<BudgetsStackParamList>();

export function BudgetsStackNavigator() {
  const defaultStackOptions = useDefaultStackOptions();

  return (
    <Stack.Navigator screenOptions={defaultStackOptions}>
      <Stack.Screen name="BudgetsHome" component={BudgetsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: "\u0423\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u044F" }} />
    </Stack.Navigator>
  );
}
