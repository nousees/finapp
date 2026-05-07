import { useMemo } from "react";
import { NativeStackNavigationOptions } from "@react-navigation/native-stack";
import { useAppTheme } from "@shared/theme/ThemeProvider";

export function useDefaultStackOptions() {
  const { colors } = useAppTheme();

  return useMemo<NativeStackNavigationOptions>(
    () => ({
      headerStyle: { backgroundColor: colors.surface },
      headerTintColor: colors.text,
      headerTitleStyle: { fontSize: 18, fontWeight: "700" },
      headerShadowVisible: false,
      contentStyle: { backgroundColor: colors.background },
    }),
    [colors.background, colors.surface, colors.text],
  );
}
