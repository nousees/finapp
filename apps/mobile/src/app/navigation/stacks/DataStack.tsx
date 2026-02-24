import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { DataStackParamList } from "../types";
import { DataHubScreen } from "@screens/data/DataHubScreen";
import { TransactionsListScreen } from "@screens/data/TransactionsListScreen";
import { TransactionCreateScreen } from "@screens/data/TransactionCreateScreen";
import { ImportCenterScreen } from "@screens/data/ImportCenterScreen";
import { VoiceCaptureScreen } from "@screens/data/VoiceCaptureScreen";
import { defaultStackOptions } from "./shared";

const Stack = createNativeStackNavigator<DataStackParamList>();

export function DataStackNavigator() {
  return (
    <Stack.Navigator screenOptions={defaultStackOptions}>
      <Stack.Screen name="DataHome" component={DataHubScreen} options={{ title: "Сбор данных" }} />
      <Stack.Screen name="TransactionsList" component={TransactionsListScreen} options={{ title: "Транзакции" }} />
      <Stack.Screen name="TransactionCreate" component={TransactionCreateScreen} options={{ title: "Ручной ввод" }} />
      <Stack.Screen name="ImportCenter" component={ImportCenterScreen} options={{ title: "Импорт CSV / Excel" }} />
      <Stack.Screen name="VoiceCapture" component={VoiceCaptureScreen} options={{ title: "Голосовой ввод" }} />
    </Stack.Navigator>
  );
}
