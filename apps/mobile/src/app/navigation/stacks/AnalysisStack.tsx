import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AnalysisStackParamList } from "../types";
import { AnalysisHomeScreen } from "@screens/analysis/AnalysisHomeScreen";
import { BudgetsScreen } from "@screens/analysis/BudgetsScreen";
import { GoalsScreen } from "@screens/analysis/GoalsScreen";
import { NotificationsScreen } from "@screens/analysis/NotificationsScreen";
import { defaultStackOptions } from "./shared";

const Stack = createNativeStackNavigator<AnalysisStackParamList>();

export function AnalysisStackNavigator() {
  return (
    <Stack.Navigator screenOptions={defaultStackOptions}>
      <Stack.Screen name="AnalysisHome" component={AnalysisHomeScreen} options={{ title: "Анализ и контроль" }} />
      <Stack.Screen name="Budgets" component={BudgetsScreen} options={{ title: "Бюджеты" }} />
      <Stack.Screen name="Goals" component={GoalsScreen} options={{ title: "Цели" }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: "Уведомления" }} />
    </Stack.Navigator>
  );
}
