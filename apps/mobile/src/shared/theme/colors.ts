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
  background: "#FFFFFF",
  backgroundGreen: "#F8F9FA",
  backgroundAlt: "#F8F9FA",
  surface: "#FFFFFF",
  surfaceAlt: "#F0F4FF",
  text: "#1A1A2E",
  textSecondary: "#374151",
  textMuted: "#6B7280",
  accent: "#A8E6CF",
  primary: "#6B46C1",
  primaryDark: "#6B46C1",
  primaryLight: "#8B5CF6",
  border: "#E5E7EB",
  borderStrong: "#A8E6CF",
  success: "#22C55E",
  danger: "#EF4444",
  warning: "#F59E0B",
  gold: "#F59E0B",
  white: "#FFFFFF",
  tabBar: "#FFFFFFCC",
  tabBarBorder: "#E5E7EB",
  shadow: "#000000",
};

export const darkColors: AppColors = {
  background: "#0D0D1A",
  backgroundGreen: "#16162A",
  backgroundAlt: "#16162A",
  surface: "#16162A",
  surfaceAlt: "#1E1B4B",
  text: "#F9FAFB",
  textSecondary: "#E5E7EB",
  textMuted: "#9CA3AF",
  accent: "#7ED9B6",
  primary: "#8B5CF6",
  primaryDark: "#8B5CF6",
  primaryLight: "#A78BFA",
  border: "#2D2D4A",
  borderStrong: "#7ED9B6",
  success: "#22C55E",
  danger: "#F87171",
  warning: "#FBBF24",
  gold: "#FBBF24",
  white: "#FFFFFF",
  tabBar: "#0F172AE6",
  tabBarBorder: "#2D2D4A",
  shadow: "#000000",
};

export function getColors(mode: ThemeMode): AppColors {
  return mode === "dark" ? darkColors : lightColors;
}

export const colors = lightColors;

export const gradients = {
  success: ["#6B46C1", "#8B5CF6", "#7ED9B6"] as const,
  successDeep: ["#6B46C1", "#8B5CF6"] as const,
  lightScreen: ["#FFFFFF", "#F8F9FA"] as const,
  darkScreen: ["#0D0D1A", "#16162A"] as const,
};
