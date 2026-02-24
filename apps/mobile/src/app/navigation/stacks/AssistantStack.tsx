import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AssistantStackParamList } from "../types";
import { AssistantHomeScreen } from "@screens/assistant/AssistantHomeScreen";
import { HabitInsightsScreen } from "@screens/assistant/HabitInsightsScreen";
import { defaultStackOptions } from "./shared";

const Stack = createNativeStackNavigator<AssistantStackParamList>();

export function AssistantStackNavigator() {
  return (
    <Stack.Navigator screenOptions={defaultStackOptions}>
      <Stack.Screen name="AssistantHome" component={AssistantHomeScreen} options={{ title: "Финансовый ассистент" }} />
      <Stack.Screen name="HabitInsights" component={HabitInsightsScreen} options={{ title: "Финансовые привычки" }} />
    </Stack.Navigator>
  );
}
