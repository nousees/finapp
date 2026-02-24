import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { DashboardStackParamList } from "../types";
import { DashboardHomeScreen } from "@screens/dashboard/DashboardHomeScreen";
import { ReportsScreen } from "@screens/dashboard/ReportsScreen";
import { useDefaultStackOptions } from "./shared";

const Stack = createNativeStackNavigator<DashboardStackParamList>();

export function DashboardStackNavigator() {
  const defaultStackOptions = useDefaultStackOptions();

  return (
    <Stack.Navigator screenOptions={defaultStackOptions}>
      <Stack.Screen name="DashboardHome" component={DashboardHomeScreen} options={{ title: "FinApp" }} />
      <Stack.Screen name="Reports" component={ReportsScreen} options={{ title: "\u041E\u0442\u0447\u0435\u0442\u044B" }} />
    </Stack.Navigator>
  );
}
