import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Animated,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

function TabIcon({
  name,
  color,
}: {
  name: string;
  focused: boolean;
  color: string;
}) {
  const { Feather } = require("@expo/vector-icons");
  const icons: Record<string, string> = {
    index: "home",
    transactions: "list",
    budgets: "pie-chart",
    goals: "flag",
  };
  const icon = icons[name] ?? "circle";
  return <Feather name={icon} size={22} color={color} />;
}

const TAB_LABELS: Record<string, string> = {
  index: "Главная",
  transactions: "Транзакции",
  budgets: "Бюджеты",
  goals: "Цели",
};

interface InputModeSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelectMode: (mode: "voice" | "manual" | "file") => void;
}

function InputModeSheet({ visible, onClose, onSelectMode }: InputModeSheetProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { Feather } = require("@expo/vector-icons");

  const modes = [
    { id: "voice" as const, icon: "mic", label: "Голос", desc: "Скажите транзакцию" },
    { id: "manual" as const, icon: "edit-3", label: "Вручную", desc: "Введите текстом" },
    { id: "file" as const, icon: "file-text", label: "Файл", desc: "CSV или Excel" },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: colors.background,
              paddingBottom: Math.max(insets.bottom, 20) + 8,
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
          <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Добавить транзакцию</Text>
          <Text style={[styles.sheetSub, { color: colors.mutedForeground }]}>
            Выберите способ добавления
          </Text>
          <View style={styles.modeGrid}>
            {modes.map((m) => (
              <TouchableOpacity
                key={m.id}
                style={[styles.modeCard, { backgroundColor: colors.muted }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onSelectMode(m.id);
                }}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={["#6B46C1", "#A8E6CF"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.modeIconBg}
                >
                  <Feather name={m.icon} size={22} color="#FFFFFF" />
                </LinearGradient>
                <Text style={[styles.modeLabel, { color: colors.foreground }]}>{m.label}</Text>
                <Text style={[styles.modeDesc, { color: colors.mutedForeground }]}>{m.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [sheetVisible, setSheetVisible] = useState(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressRef = useRef(false);

  const pb = Math.max(insets.bottom, Platform.OS === "web" ? 34 : 8);

  const startPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    ).start();
  };

  const stopPulse = () => {
    pulseAnim.stopAnimation();
    Animated.timing(pulseAnim, { toValue: 1, duration: 150, useNativeDriver: true }).start();
  };

  React.useEffect(() => {
    startPulse();
    return () => stopPulse();
  }, []);

  const handleMicPressIn = () => {
    isLongPressRef.current = false;
    Animated.spring(pulseAnim, {
      toValue: 0.92,
      useNativeDriver: true,
      tension: 200,
      friction: 10,
    }).start();
    longPressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      Animated.spring(pulseAnim, { toValue: 1.15, useNativeDriver: true, tension: 200, friction: 10 }).start();
      setSheetVisible(true);
    }, 500);
  };

  const handleMicPressOut = () => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    Animated.spring(pulseAnim, { toValue: 1, useNativeDriver: true, tension: 150, friction: 10 }).start();
  };

  const handleMicPress = () => {
    if (!isLongPressRef.current) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      router.push("/voice-input");
    }
  };

  const handleSelectMode = (mode: "voice" | "manual" | "file") => {
    setSheetVisible(false);
    setTimeout(() => {
      if (mode === "voice") router.push("/voice-input");
      else if (mode === "manual") router.push("/manual-input");
      else router.push("/file-import");
    }, 200);
  };

  const visibleRoutes = state.routes.slice(0, 4);
  const leftRoutes = visibleRoutes.slice(0, 2);
  const rightRoutes = visibleRoutes.slice(2, 4);

  return (
    <>
      <InputModeSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        onSelectMode={handleSelectMode}
      />
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            paddingBottom: pb,
          },
        ]}
      >
        {leftRoutes.map((route, index) => {
          const isFocused = state.index === index;
          const label = TAB_LABELS[route.name] ?? route.name;
          const tint = isFocused ? colors.primary : colors.mutedForeground;

          return (
            <TouchableOpacity
              key={route.key}
              style={styles.tab}
              onPress={() => {
                if (!isFocused) {
                  Haptics.selectionAsync();
                  navigation.navigate(route.name);
                }
              }}
              activeOpacity={0.7}
            >
              <TabIcon name={route.name} focused={isFocused} color={tint} />
              <Text style={[styles.tabLabel, { color: tint }]}>{label}</Text>
              {isFocused && (
                <View style={[styles.activeIndicator, { backgroundColor: colors.primary }]} />
              )}
            </TouchableOpacity>
          );
        })}

        <View style={styles.micContainer}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <Pressable
              onPressIn={handleMicPressIn}
              onPressOut={handleMicPressOut}
              onPress={handleMicPress}
            >
              <LinearGradient
                colors={["#6B46C1", "#8B5CF6", "#7ED9B6"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.micButton}
              >
                {(() => {
                  const { Feather } = require("@expo/vector-icons");
                  return <Feather name="mic" size={26} color="#FFFFFF" />;
                })()}
              </LinearGradient>
            </Pressable>
          </Animated.View>
          <View style={[styles.micGlow, { backgroundColor: colors.purple + "30" }]} />
        </View>

        {rightRoutes.map((route, index) => {
          const globalIndex = index + 2;
          const isFocused = state.index === globalIndex;
          const label = TAB_LABELS[route.name] ?? route.name;
          const tint = isFocused ? colors.primary : colors.mutedForeground;

          return (
            <TouchableOpacity
              key={route.key}
              style={styles.tab}
              onPress={() => {
                if (!isFocused) {
                  Haptics.selectionAsync();
                  navigation.navigate(route.name);
                }
              }}
              activeOpacity={0.7}
            >
              <TabIcon name={route.name} focused={isFocused} color={tint} />
              <Text style={[styles.tabLabel, { color: tint }]}>{label}</Text>
              {isFocused && (
                <View style={[styles.activeIndicator, { backgroundColor: colors.primary }]} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    minHeight: 50,
    position: "relative",
  },
  tabLabel: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    marginTop: 3,
  },
  activeIndicator: {
    position: "absolute",
    top: 0,
    width: 20,
    height: 2,
    borderRadius: 1,
  },
  micContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    position: "relative",
    marginBottom: 4,
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
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 20,
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
    marginBottom: 24,
  },
  modeGrid: {
    flexDirection: "row",
    gap: 12,
  },
  modeCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    gap: 8,
  },
  modeIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  modeLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  modeDesc: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
});
