// @ts-nocheck
import React from "react";
import "react-native-gesture-handler";
import "react-native-reanimated";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as LocalAuthentication from "expo-local-authentication";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SimpleLoginScreen } from "./src/screens/auth/SimpleLoginScreen";
import { AppNavigator } from "./src/app/navigation/AppNavigator";
import { ThemeProvider } from "./src/shared/theme/ThemeProvider";
import { UserProvider } from "./src/shared/contexts/UserContext";
import { AppSettingsProvider } from "./src/shared/settings/AppSettingsContext";
import { apiConfig } from "./src/shared/api/config";
import { ErrorBoundary } from "./src/shared/ui/ErrorBoundary";

const AUTH_KEYS = ["access_token", "refresh_token", "user_data"];

function AppContent() {
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    void checkAuthStatus();
  }, []);

  const clearAuthData = async () => {
    await Promise.all(AUTH_KEYS.map((key) => AsyncStorage.removeItem(key)));
  };

  const refreshSession = async (refreshToken: string): Promise<boolean> => {
    try {
      const response = await fetch(`${apiConfig.authBaseUrl}/api/v1/auth/refresh`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.access_token) {
        return false;
      }

      await AsyncStorage.setItem("access_token", String(payload.access_token));
      if (payload.refresh_token) {
        await AsyncStorage.setItem("refresh_token", String(payload.refresh_token));
      }
      return true;
    } catch (error) {
      console.error("Session refresh failed:", error);
      return false;
    }
  };

  const checkAuthStatus = async () => {
    try {
      const [token, refreshToken, userData] = await Promise.all([
        AsyncStorage.getItem("access_token"),
        AsyncStorage.getItem("refresh_token"),
        AsyncStorage.getItem("user_data"),
      ]);

      if (!token || !refreshToken || !userData) {
        await clearAuthData();
        setIsAuthenticated(false);
        return;
      }

      const refreshed = await refreshSession(refreshToken);
      if (!refreshed) {
        await clearAuthData();
        setIsAuthenticated(false);
        return;
      }

      const biometricPassed = await verifyBiometricIfEnabled();
      if (!biometricPassed) {
        setIsAuthenticated(false);
        return;
      }
      setIsAuthenticated(true);
    } catch (error) {
      console.error("Error checking auth status:", error);
      await clearAuthData();
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const verifyBiometricIfEnabled = async (): Promise<boolean> => {
    try {
      const settingsRaw = await AsyncStorage.getItem("app_settings");
      const settings = settingsRaw ? JSON.parse(settingsRaw) : null;
      if (!settings?.biometricEnabled) return true;
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Вход в FinApp",
        cancelLabel: "Выйти",
        disableDeviceFallback: false,
      });
      return result.success;
    } catch (error) {
      console.error("Biometric auth failed:", error);
      return true;
    }
  };

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    try {
      await clearAuthData();
      setIsAuthenticated(false);
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Загрузка...</Text>
      </View>
    );
  }

  if (!isAuthenticated) {
    return <SimpleLoginScreen onLogin={handleLogin} />;
  }

  return (
    <UserProvider>
      <AppSettingsProvider>
        <ThemeProvider>
          <AppNavigator onLogout={handleLogout} />
        </ThemeProvider>
      </AppSettingsProvider>
    </UserProvider>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ErrorBoundary onError={(error, stack) => console.error("App error boundary:", error, stack)}>
          <AppContent />
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
