import { PropsWithChildren, createContext, useContext, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import { AppColors, ThemeMode, getColors, gradients } from "./colors";

type ThemeContextValue = {
  mode: ThemeMode;
  colors: AppColors;
  isDark: boolean;
  gradients: typeof gradients;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: PropsWithChildren) {
  const deviceScheme = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>(deviceScheme === "dark" ? "dark" : "light");

  const value = useMemo<ThemeContextValue>(() => {
    const isDark = mode === "dark";
    return {
      mode,
      colors: getColors(mode),
      isDark,
      gradients,
      setMode,
      toggleMode: () => setMode((prev) => (prev === "dark" ? "light" : "dark")),
    };
  }, [mode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useAppTheme must be used inside ThemeProvider");
  }

  return context;
}
