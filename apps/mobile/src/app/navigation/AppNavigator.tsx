import { MaterialIcons } from "@expo/vector-icons";
import { DarkTheme, DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useMemo } from "react";
import { RootTabParamList } from "./types";
import { DashboardStackNavigator } from "./stacks/DashboardStack";
import { TransactionsStackNavigator } from "./stacks/TransactionsStack";
import { BudgetsStackNavigator } from "./stacks/BudgetsStack";
import { GoalsStackNavigator } from "./stacks/GoalsStack";
import { ProfileStackNavigator } from "./stacks/ProfileStack";
import { useAppTheme } from "@shared/theme/ThemeProvider";

const Tab = createBottomTabNavigator<RootTabParamList>();

export function AppNavigator() {
  const { colors, gradients, isDark } = useAppTheme();
  const navigationTheme = useMemo(
    () => ({
      ...(isDark ? DarkTheme : DefaultTheme),
      colors: {
        ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
        background: colors.background,
        card: colors.surface,
        border: colors.border,
        text: colors.text,
        primary: colors.primary,
      },
    }),
    [colors.background, colors.border, colors.primary, colors.surface, colors.text, isDark],
  );

  return (
    <NavigationContainer theme={navigationTheme}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarHideOnKeyboard: true,
          tabBarActiveTintColor: colors.white,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarShowLabel: true,
          tabBarLabelStyle: styles.label,
          tabBarStyle: [
            styles.tabBar,
            {
              backgroundColor: colors.tabBar,
              borderTopColor: colors.tabBarBorder,
            },
          ],
          tabBarIcon: ({ focused, color }) => {
            const icon = iconName(route.name);

            if (focused) {
              return (
                <LinearGradient colors={gradients.success} style={styles.activeIconWrap}>
                  <MaterialIcons name={icon} size={20} color={colors.white} />
                </LinearGradient>
              );
            }

            return (
              <View style={[styles.inactiveIconWrap, { borderColor: colors.border }]}>
                <MaterialIcons name={icon} size={20} color={color} />
              </View>
            );
          },
        })}
      >
        <Tab.Screen name="Home" component={DashboardStackNavigator} options={{ title: "\u0413\u043B\u0430\u0432\u043D\u0430\u044F" }} />
        <Tab.Screen name="Transactions" component={TransactionsStackNavigator} options={{ title: "\u0422\u0440\u0430\u043D\u0437\u0430\u043A\u0446\u0438\u0438" }} />
        <Tab.Screen name="Budgets" component={BudgetsStackNavigator} options={{ title: "\u0411\u044E\u0434\u0436\u0435\u0442\u044B" }} />
        <Tab.Screen name="Goals" component={GoalsStackNavigator} options={{ title: "\u0426\u0435\u043B\u0438" }} />
        <Tab.Screen name="Profile" component={ProfileStackNavigator} options={{ title: "\u041F\u0440\u043E\u0444\u0438\u043B\u044C" }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

function iconName(routeName: keyof RootTabParamList): keyof typeof MaterialIcons.glyphMap {
  switch (routeName) {
    case "Home":
      return "home";
    case "Transactions":
      return "receipt-long";
    case "Budgets":
      return "account-balance-wallet";
    case "Goals":
      return "emoji-events";
    case "Profile":
      return "person-outline";
    default:
      return "radio-button-unchecked";
  }
}

const styles = StyleSheet.create({
  tabBar: {
    height: 72,
    paddingTop: 8,
    paddingBottom: 8,
    borderTopWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: -2 },
    shadowRadius: 16,
    elevation: 3,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  activeIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  inactiveIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
});
