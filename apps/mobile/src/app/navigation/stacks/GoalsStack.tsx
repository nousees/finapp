import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { GoalsStackParamList } from "../types";
import { GoalsScreen } from "@screens/analysis/GoalsScreen";
import { useDefaultStackOptions } from "./shared";

const Stack = createNativeStackNavigator<GoalsStackParamList>();

export function GoalsStackNavigator() {
  const defaultStackOptions = useDefaultStackOptions();

  return (
    <Stack.Navigator screenOptions={defaultStackOptions}>
      <Stack.Screen name="GoalsHome" component={GoalsScreen} options={{ title: "\u0426\u0435\u043B\u0438" }} />
    </Stack.Navigator>
  );
}
