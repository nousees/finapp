import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { DataStackParamList } from "../types";
import { DataHubScreen } from "@screens/data/DataHubScreen";
import { TransactionsListScreen } from "@screens/data/TransactionsListScreen";
import { TransactionCreateScreen } from "@screens/data/TransactionCreateScreen";
import { ImportCenterScreen } from "@screens/data/ImportCenterScreen";
import { VoiceCaptureScreen } from "@screens/data/VoiceCaptureScreen";
import { useDefaultStackOptions } from "./shared";

const Stack = createNativeStackNavigator<DataStackParamList>();

export function DataStackNavigator() {
  const defaultStackOptions = useDefaultStackOptions();

  return (
    <Stack.Navigator screenOptions={defaultStackOptions}>
      <Stack.Screen name="DataHome" component={DataHubScreen} options={{ title: "\u0421\u0431\u043E\u0440 \u0434\u0430\u043D\u043D\u044B\u0445" }} />
      <Stack.Screen name="TransactionsList" component={TransactionsListScreen} options={{ title: "\u0422\u0440\u0430\u043D\u0437\u0430\u043A\u0446\u0438\u0438" }} />
      <Stack.Screen name="TransactionCreate" component={TransactionCreateScreen} options={{ title: "\u0420\u0443\u0447\u043D\u043E\u0439 \u0432\u0432\u043E\u0434" }} />
      <Stack.Screen name="ImportCenter" component={ImportCenterScreen} options={{ title: "\u0418\u043C\u043F\u043E\u0440\u0442 CSV / Excel" }} />
      <Stack.Screen name="VoiceCapture" component={VoiceCaptureScreen} options={{ title: "\u0413\u043E\u043B\u043E\u0441\u043E\u0432\u043E\u0439 \u0432\u0432\u043E\u0434" }} />
    </Stack.Navigator>
  );
}
