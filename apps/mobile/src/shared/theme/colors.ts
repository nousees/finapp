export type ThemeMode = "light" | "dark";

export type AppColors = {
  background: string;
  backgroundGreen: string;
  backgroundAlt: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  primary: string;
  primaryDark: string;
  primaryLight: string;
  border: string;
  borderStrong: string;
  success: string;
  danger: string;
  warning: string;
  gold: string;
  white: string;
  tabBar: string;
  tabBarBorder: string;
  shadow: string;
};

export const lightColors: AppColors = {
  background: "#F8FAFC",
  backgroundGreen: "#F0FDF4",
  backgroundAlt: "#F0FDF4",
  surface: "#FFFFFF",
  surfaceAlt: "#ECFDF5",
  text: "#111827",
  textSecondary: "#334155",
  textMuted: "#64748B",
  accent: "#1E293B",
  primary: "#22C55E",
  primaryDark: "#16A34A",
  primaryLight: "#86EFAC",
  border: "#D1FAE5",
  borderStrong: "#86EFAC",
  success: "#22C55E",
  danger: "#EF4444",
  warning: "#F59E0B",
  gold: "#F59E0B",
  white: "#FFFFFF",
  tabBar: "#FFFFFFCC",
  tabBarBorder: "#BBF7D0",
  shadow: "#000000",
};

export const darkColors: AppColors = {
  background: "#0F172A",
  backgroundGreen: "#111827",
  backgroundAlt: "#0B1220",
  surface: "#101828",
  surfaceAlt: "#162235",
  text: "#F8FAFC",
  textSecondary: "#E2E8F0",
  textMuted: "#CBD5E1",
  accent: "#E2E8F0",
  primary: "#22C55E",
  primaryDark: "#16A34A",
  primaryLight: "#86EFAC",
  border: "#334155",
  borderStrong: "#22C55E",
  success: "#22C55E",
  danger: "#F87171",
  warning: "#FBBF24",
  gold: "#FBBF24",
  white: "#FFFFFF",
  tabBar: "#0F172AE6",
  tabBarBorder: "#334155",
  shadow: "#000000",
};

export function getColors(mode: ThemeMode): AppColors {
  return mode === "dark" ? darkColors : lightColors;
}

export const colors = lightColors;

export const gradients = {
  success: ["#86EFAC", "#22C55E"] as const,
  successDeep: ["#22C55E", "#16A34A"] as const,
  lightScreen: ["#F0FDF4", "#F8FAFC"] as const,
  darkScreen: ["#0F172A", "#111827"] as const,
};
