import { NativeStackNavigationOptions } from "@react-navigation/native-stack";
import { colors } from "@shared/theme/colors";

export const defaultStackOptions: NativeStackNavigationOptions = {
  headerStyle: { backgroundColor: colors.surface },
  headerTintColor: colors.text,
  headerTitleStyle: { fontWeight: "700" },
  contentStyle: { backgroundColor: colors.background },
};
