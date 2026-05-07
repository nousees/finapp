import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AnalysisStackParamList } from "../types";
import { AnalysisHomeScreen } from "@screens/analysis/AnalysisHomeScreen";
import { BudgetsScreen } from "@screens/analysis/BudgetsScreen";
import { GoalsScreen } from "@screens/analysis/GoalsScreen";
import { NotificationsScreen } from "@screens/analysis/NotificationsScreen";
import { useDefaultStackOptions } from "./shared";

const Stack = createNativeStackNavigator<AnalysisStackParamList>();

export function AnalysisStackNavigator() {
  const defaultStackOptions = useDefaultStackOptions();

  return (
    <Stack.Navigator screenOptions={defaultStackOptions}>
      <Stack.Screen name="AnalysisHome" component={AnalysisHomeScreen} options={{ title: "\u0410\u043D\u0430\u043B\u0438\u0437 \u0438 \u043A\u043E\u043D\u0442\u0440\u043E\u043B\u044C" }} />
      <Stack.Screen name="Budgets" component={BudgetsScreen} options={{ title: "\u0411\u044E\u0434\u0436\u0435\u0442\u044B" }} />
      <Stack.Screen name="Goals" component={GoalsScreen} options={{ title: "\u0426\u0435\u043B\u0438" }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: "\u0423\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u044F" }} />
    </Stack.Navigator>
  );
}
