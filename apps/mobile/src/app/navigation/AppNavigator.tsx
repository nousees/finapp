// @ts-nocheck
import React from 'react';
import { Feather } from "@expo/vector-icons";
import { DarkTheme, DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Animated, Modal, PanResponder, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useRef, useState } from "react";
import { RootTabParamList } from "./types";
import { DashboardStackNavigator } from "./stacks/DashboardStack";
import { TransactionsStackNavigator } from "./stacks/TransactionsStack";
import { BudgetsStackNavigator } from "./stacks/BudgetsStack";
import { GoalsStackNavigator } from "./stacks/GoalsStack";
import { ProfileStackNavigator } from "./stacks/ProfileStack";
import { useAppSettings } from "@shared/settings/AppSettingsContext";
import { useAppTheme } from "@shared/theme/ThemeProvider";

const Tab = createBottomTabNavigator();

type InputModeId = "import" | "voice" | "manual";
type SwipeDirection = "left" | "right";

const INPUT_MODES: Array<{ id: InputModeId; screen: "ImportCenter" | "VoiceCapture" | "TransactionCreate"; icon: keyof typeof Feather.glyphMap }> = [
  { id: "import", screen: "ImportCenter", icon: "file-text" },
  { id: "voice", screen: "VoiceCapture", icon: "mic" },
  { id: "manual", screen: "TransactionCreate", icon: "edit-3" },
];

const SWIPE_DISTANCE_THRESHOLD = 28;
const SWIPE_VELOCITY_THRESHOLD = 0.35;

function getAdjacentInputMode(currentMode: InputModeId, direction: SwipeDirection): InputModeId {
  const currentIndex = Math.max(0, INPUT_MODES.findIndex((mode) => mode.id === currentMode));
  const nextIndex = direction === "right" ? currentIndex + 1 : currentIndex - 1;
  const clampedIndex = Math.min(Math.max(nextIndex, 0), INPUT_MODES.length - 1);

  return INPUT_MODES[clampedIndex].id;
}

export function AppNavigator({ onLogout }: { onLogout?: () => void }) {
  const { colors, gradients, isDark } = useAppTheme();
  const { t } = useAppSettings();
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
          tabBarActiveTintColor: colors.primary,
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
          tabBarIcon: ({ color }) => <Feather name={iconName(route.name)} size={22} color={color} />,
        })}
        tabBar={(props) => <FinAppTabBar {...props} />}
      >
        <Tab.Screen name="Home" component={DashboardStackNavigator} options={{ title: t("home") }} />
        <Tab.Screen name="Transactions" component={TransactionsStackNavigator} options={{ title: t("transactions") }} />
        <Tab.Screen name="Budgets" component={BudgetsStackNavigator} options={{ title: t("budgets") }} />
        <Tab.Screen name="Goals" component={GoalsStackNavigator} options={{ title: t("goals") }} />
        <Tab.Screen name="Profile" options={{ title: t("profile") }}>
          {() => <ProfileStackNavigator onLogout={onLogout} />}
        </Tab.Screen>
      </Tab.Navigator>
    </NavigationContainer>
  );
}

function FinAppTabBar({ state, descriptors, navigation }) {
  const { colors, gradients } = useAppTheme();
  const pulse = useRef(new Animated.Value(1)).current;
  const [sheetVisible, setSheetVisible] = useState(false);
  const [inputMode, setInputMode] = useState<InputModeId>("voice");

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  const renderTab = (route) => {
    const index = state.routes.findIndex((item) => item.key === route.key);
    const isFocused = state.index === index;
    const options = descriptors[route.key].options;
    const label = options.title ?? route.name;
    const tint = isFocused ? colors.primary : colors.textMuted;

    return (
      <Pressable
        key={route.key}
        style={styles.tabItem}
        onPress={() => {
          if (route.name === "Home") {
            navigation.navigate("Home", { screen: "DashboardHome" });
            return;
          }
          if (route.name === "Transactions") {
            navigation.navigate("Transactions", { screen: "TransactionsList" });
            return;
          }
          if (!isFocused) navigation.navigate(route.name);
        }}
      >
        <Feather name={iconName(route.name)} size={22} color={tint} />
        <Text style={[styles.tabLabel, { color: tint }]} numberOfLines={1}>
          {label}
        </Text>
        {isFocused ? <View style={[styles.activeIndicator, { backgroundColor: colors.primary }]} /> : null}
      </Pressable>
    );
  };

  const visibleRoutes = state.routes.filter((route) => route.name !== "Profile");
  const left = visibleRoutes.slice(0, 2);
  const right = visibleRoutes.slice(2);
  const inputModes = INPUT_MODES;
  const activeInput = inputModes.find((mode) => mode.id === inputMode) || inputModes[1];
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 14 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderRelease: (_, gesture) => {
          const isIntentionalSwipe =
            Math.abs(gesture.dx) >= SWIPE_DISTANCE_THRESHOLD || Math.abs(gesture.vx) >= SWIPE_VELOCITY_THRESHOLD;

          if (!isIntentionalSwipe) {
            return;
          }

          setInputMode((currentMode) => getAdjacentInputMode(currentMode, gesture.dx > 0 ? "right" : "left"));
        },
      }),
    [],
  );

  return (
    <View style={[styles.tabBar, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
      {left.map((route) => renderTab(route))}
      <View style={styles.micSlot} {...panResponder.panHandlers}>
        <Animated.View style={{ transform: [{ scale: pulse }] }}>
          <Pressable
            onPress={() => navigation.navigate("Transactions", { screen: activeInput.screen })}
            onLongPress={() => setSheetVisible(true)}
            delayLongPress={350}
          >
            <LinearGradient colors={gradients.success} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.micButton}>
              <Feather name={activeInput.icon} size={26} color="#FFFFFF" />
            </LinearGradient>
          </Pressable>
        </Animated.View>
        <View style={styles.inputDots}>
          {inputModes.map((mode) => (
            <Pressable
              key={mode.id}
              onPress={() => setInputMode(mode.id)}
              style={[
                styles.inputDot,
                {
                  backgroundColor: mode.id === inputMode ? colors.primary : colors.borderStrong || colors.border,
                  opacity: mode.id === inputMode ? 1 : 0.65,
                },
              ]}
            />
          ))}
        </View>
        <View style={[styles.micGlow, { backgroundColor: `${colors.primary}30` }]} />
      </View>
      {right.map((route) => renderTab(route))}
      <InputModeSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        onSelect={(screen) => {
          setSheetVisible(false);
          navigation.navigate("Transactions", { screen });
        }}
      />
    </View>
  );
}

function InputModeSheet({ visible, onClose, onSelect }) {
  const { colors, gradients } = useAppTheme();
  const { t } = useAppSettings();
  const modes = [
    { screen: "VoiceCapture", icon: "mic", label: t("voice"), desc: t("voiceDesc") },
    { screen: "TransactionCreate", icon: "edit-3", label: t("manual"), desc: t("manualDesc") },
    { screen: "ImportCenter", icon: "file-text", label: t("file"), desc: t("fileDesc") },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: colors.background }]} onPress={(event) => event.stopPropagation()}>
          <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
          <Text style={[styles.sheetTitle, { color: colors.text }]}>{t("addTransaction")}</Text>
          <Text style={[styles.sheetSub, { color: colors.textMuted }]}>{t("inputMode")}</Text>
          <View style={styles.modeGrid}>
            {modes.map((mode) => (
              <Pressable
                key={mode.screen}
                style={[styles.modeCard, { backgroundColor: colors.backgroundAlt }]}
                onPress={() => onSelect(mode.screen)}
              >
                <LinearGradient colors={gradients.success} style={styles.modeIcon}>
                  <Feather name={mode.icon} size={22} color="#FFFFFF" />
                </LinearGradient>
                <Text style={[styles.modeLabel, { color: colors.text }]}>{mode.label}</Text>
                <Text style={[styles.modeDesc, { color: colors.textMuted }]}>{mode.desc}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function iconName(routeName: keyof RootTabParamList): keyof typeof Feather.glyphMap {
  switch (routeName) {
    case "Home":
      return "home";
    case "Transactions":
      return "list";
    case "Budgets":
      return "pie-chart";
    case "Goals":
      return "flag";
    case "Profile":
      return "user";
    default:
      return "circle";
  }
}

const styles = StyleSheet.create({
  tabBar: {
    minHeight: 78,
    flexDirection: "row",
    alignItems: "flex-end",
    paddingTop: 8,
    paddingBottom: 10,
    borderTopWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: -2 },
    shadowRadius: 12,
    elevation: 8,
  },
  tabItem: {
    flex: 1,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    gap: 3,
  },
  tabLabel: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
  },
  activeIndicator: {
    position: "absolute",
    top: 0,
    width: 20,
    height: 2,
    borderRadius: 1,
  },
  micSlot: {
    width: 74,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
    gap: 4,
  },
  micButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#6B46C1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  micGlow: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    bottom: -10,
    zIndex: -1,
  },
  inputDots: {
    flexDirection: "row",
    gap: 4,
    height: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  inputDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.48)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 34,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
  },
  sheetSub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    marginBottom: 22,
  },
  modeGrid: {
    flexDirection: "row",
    gap: 12,
  },
  modeCard: {
    flex: 1,
    minHeight: 128,
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  modeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  modeLabel: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  modeDesc: {
    fontSize: 11,
    lineHeight: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
});
