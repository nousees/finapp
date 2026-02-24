import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { DashboardStackParamList } from "../types";
import { DashboardHomeScreen } from "@screens/dashboard/DashboardHomeScreen";
import { ReportsScreen } from "@screens/dashboard/ReportsScreen";
import { defaultStackOptions } from "./shared";

const Stack = createNativeStackNavigator<DashboardStackParamList>();

export function DashboardStackNavigator() {
  return (
    <Stack.Navigator screenOptions={defaultStackOptions}>
      <Stack.Screen name="DashboardHome" component={DashboardHomeScreen} options={{ title: "FinApp" }} />
      <Stack.Screen name="Reports" component={ReportsScreen} options={{ title: "Отчеты" }} />
    </Stack.Navigator>
  );
}
