// @ts-nocheck
import React from 'react';
import { createContext, useContext, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import { AppColors, ThemeMode, getColors, gradients } from "./colors";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const deviceScheme = useColorScheme();
  const [mode, setMode] = useState(deviceScheme === "dark" ? "dark" : "light");

  const value = useMemo(() => {
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
