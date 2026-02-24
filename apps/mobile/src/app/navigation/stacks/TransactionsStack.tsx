import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { TransactionsStackParamList } from "../types";
import { TransactionsListScreen } from "@screens/data/TransactionsListScreen";
import { TransactionCreateScreen } from "@screens/data/TransactionCreateScreen";
import { VoiceCaptureScreen } from "@screens/data/VoiceCaptureScreen";
import { ImportCenterScreen } from "@screens/data/ImportCenterScreen";
import { useDefaultStackOptions } from "./shared";

const Stack = createNativeStackNavigator<TransactionsStackParamList>();

export function TransactionsStackNavigator() {
  const defaultStackOptions = useDefaultStackOptions();

  return (
    <Stack.Navigator screenOptions={defaultStackOptions}>
      <Stack.Screen name="TransactionsList" component={TransactionsListScreen} options={{ title: "\u0422\u0440\u0430\u043D\u0437\u0430\u043A\u0446\u0438\u0438" }} />
      <Stack.Screen name="TransactionCreate" component={TransactionCreateScreen} options={{ title: "\u041D\u043E\u0432\u0430\u044F \u0442\u0440\u0430\u043D\u0437\u0430\u043A\u0446\u0438\u044F" }} />
      <Stack.Screen name="VoiceCapture" component={VoiceCaptureScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ImportCenter" component={ImportCenterScreen} options={{ title: "\u0418\u043C\u043F\u043E\u0440\u0442 \u043E\u043F\u0435\u0440\u0430\u0446\u0438\u0439" }} />
    </Stack.Navigator>
  );
}
