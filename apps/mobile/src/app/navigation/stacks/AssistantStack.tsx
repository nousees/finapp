import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AssistantStackParamList } from "../types";
import { AssistantHomeScreen } from "@screens/assistant/AssistantHomeScreen";
import { HabitInsightsScreen } from "@screens/assistant/HabitInsightsScreen";
import { useDefaultStackOptions } from "./shared";

const Stack = createNativeStackNavigator<AssistantStackParamList>();

export function AssistantStackNavigator() {
  const defaultStackOptions = useDefaultStackOptions();

  return (
    <Stack.Navigator screenOptions={defaultStackOptions}>
      <Stack.Screen name="AssistantHome" component={AssistantHomeScreen} options={{ title: "\u0424\u0438\u043D\u0430\u043D\u0441\u043E\u0432\u044B\u0439 \u0430\u0441\u0441\u0438\u0441\u0442\u0435\u043D\u0442" }} />
      <Stack.Screen name="HabitInsights" component={HabitInsightsScreen} options={{ title: "\u0424\u0438\u043D\u0430\u043D\u0441\u043E\u0432\u044B\u0435 \u043F\u0440\u0438\u0432\u044B\u0447\u043A\u0438" }} />
    </Stack.Navigator>
  );
}
