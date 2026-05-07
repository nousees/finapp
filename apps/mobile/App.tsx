// @ts-nocheck
import React from "react";
import "react-native-gesture-handler";
import "react-native-reanimated";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SimpleLoginScreen } from "./src/screens/auth/SimpleLoginScreen";
import { AppNavigator } from "./src/app/navigation/AppNavigator";
import { ThemeProvider } from "./src/shared/theme/ThemeProvider";
import { UserProvider } from "./src/shared/contexts/UserContext";
import { apiConfig } from "./src/shared/api/config";

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
      }
      setIsAuthenticated(refreshed);
    } catch (error) {
      console.error("Error checking auth status:", error);
      await clearAuthData();
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
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
      <ThemeProvider>
        <AppNavigator onLogout={handleLogout} />
      </ThemeProvider>
    </UserProvider>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <AppContent />
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
