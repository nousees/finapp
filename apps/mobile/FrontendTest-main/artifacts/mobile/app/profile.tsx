import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useFinance } from "@/context/FinanceContext";
import { useColors } from "@/hooks/useColors";

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { totalBalance, monthIncome, monthExpense, transactions } = useFinance();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const topPt = Platform.OS === "web" ? 67 : insets.top;
  const pb = Platform.OS === "web" ? 34 : insets.bottom;

  const savingsRate = monthIncome > 0
    ? Math.round(((monthIncome - monthExpense) / monthIncome) * 100)
    : 0;
  const healthScore = Math.min(100, Math.max(0,
    40 + (savingsRate > 0 ? Math.min(savingsRate, 30) : 0) + (transactions.length > 5 ? 20 : 10) + 10
  ));

  const getHealthColor = (score: number) => {
    if (score >= 70) return colors.income;
    if (score >= 40) return colors.warning;
    return colors.expense;
  };
  const getHealthLabel = (score: number) => {
    if (score >= 70) return "Отличное";
    if (score >= 40) return "Хорошее";
    return "Требует внимания";
  };

  const SETTINGS_SECTIONS = [
    {
      title: "Основные",
      items: [
        {
          icon: "bell" as const,
          label: "Уведомления",
          toggle: true,
          value: notificationsEnabled,
          onToggle: setNotificationsEnabled,
        },
        {
          icon: "shield" as const,
          label: "Биометрия",
          toggle: true,
          value: biometricEnabled,
          onToggle: setBiometricEnabled,
        },
        {
          icon: "moon" as const,
          label: "Тёмная тема",
          toggle: false,
          arrow: true,
          onPress: () => Alert.alert("Тема", "Управляется системными настройками устройства"),
        },
      ],
    },
    {
      title: "Данные",
      items: [
        {
          icon: "download" as const,
          label: "Экспорт данных",
          toggle: false,
          arrow: true,
          onPress: () => Alert.alert("Экспорт", "Файл CSV будет отправлен на вашу почту"),
        },
        {
          icon: "refresh-cw" as const,
          label: "Синхронизация",
          toggle: false,
          arrow: true,
          onPress: () => Alert.alert("Синхронизация", "Данные синхронизированы"),
        },
        {
          icon: "trash-2" as const,
          label: "Удалить аккаунт",
          toggle: false,
          danger: true,
          arrow: true,
          onPress: () => Alert.alert("Удалить аккаунт", "Это действие нельзя отменить. Все данные будут удалены.", [
            { text: "Отмена", style: "cancel" },
            { text: "Удалить", style: "destructive", onPress: () => {} },
          ]),
        },
      ],
    },
    {
      title: "О приложении",
      items: [
        {
          icon: "star" as const,
          label: "Оценить приложение",
          toggle: false,
          arrow: true,
          onPress: () => Alert.alert("Оценка", "Спасибо! Ваш отзыв очень важен для нас."),
        },
        {
          icon: "help-circle" as const,
          label: "Поддержка",
          toggle: false,
          arrow: true,
          onPress: () => Alert.alert("Поддержка", "Напишите нам: support@finapp.ru"),
        },
        {
          icon: "info" as const,
          label: "Версия приложения",
          toggle: false,
          value: "1.0.0",
          onPress: undefined,
        },
      ],
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.nav, { paddingTop: topPt + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.muted }]}>
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: colors.foreground }]}>Профиль</Text>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.muted }]}>
          <Feather name="edit-2" size={18} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: pb + 40 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.profileHeader}>
          <LinearGradient
            colors={["#6B46C1", "#8B5CF6", "#7ED9B6"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatarLarge}
          >
            <Text style={styles.avatarText}>АЧ</Text>
          </LinearGradient>
          <Text style={[styles.profileName, { color: colors.foreground }]}>Алексей Чен</Text>
          <Text style={[styles.profileEmail, { color: colors.mutedForeground }]}>alex@example.com</Text>
        </View>

        <LinearGradient
          colors={["#6B46C1", "#8B5CF6", "#7ED9B6"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.healthCard}
        >
          <View style={styles.hexBg} pointerEvents="none">
            {[...Array(6)].map((_, i) => (
              <View key={i} style={[styles.hex, { left: (i * 70) % 280 - 20, top: (i * 43) % 80 - 20, opacity: 0.08 }]} />
            ))}
          </View>
          <View style={styles.healthTop}>
            <View>
              <Text style={styles.healthLabel}>Финансовое здоровье</Text>
              <Text style={styles.healthStatus}>{getHealthLabel(healthScore)}</Text>
            </View>
            <View style={styles.scoreCircle}>
              <Text style={styles.scoreNum}>{healthScore}</Text>
              <Text style={styles.scoreMax}>/100</Text>
            </View>
          </View>
          <View style={styles.healthTrack}>
            <View style={[styles.healthFill, { width: `${healthScore}%`, backgroundColor: getHealthColor(healthScore) }]} />
          </View>
          <View style={styles.healthStats}>
            <View style={styles.healthStat}>
              <Text style={styles.healthStatVal}>{transactions.length}</Text>
              <Text style={styles.healthStatLabel}>Транзакций</Text>
            </View>
            <View style={styles.healthStat}>
              <Text style={[styles.healthStatVal, { color: "#A8E6CF" }]}>
                {monthIncome.toLocaleString("ru-RU")} ₽
              </Text>
              <Text style={styles.healthStatLabel}>Доходы</Text>
            </View>
            <View style={styles.healthStat}>
              <Text style={[styles.healthStatVal, { color: savingsRate >= 0 ? "#A8E6CF" : "#FCA5A5" }]}>
                {savingsRate}%
              </Text>
              <Text style={styles.healthStatLabel}>Сбережения</Text>
            </View>
          </View>
        </LinearGradient>

        {SETTINGS_SECTIONS.map((section) => (
          <View key={section.title} style={styles.settingsSection}>
            <Text style={[styles.settingsTitle, { color: colors.mutedForeground }]}>
              {section.title}
            </Text>
            <View style={[styles.settingsCard, { backgroundColor: colors.card }]}>
              {section.items.map((item, i) => (
                <TouchableOpacity
                  key={item.label}
                  style={[
                    styles.settingsRow,
                    i < section.items.length - 1
                      ? { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }
                      : {},
                  ]}
                  onPress={item.onPress}
                  activeOpacity={item.onPress ? 0.7 : 1}
                >
                  <View style={[styles.settingsIcon, {
                    backgroundColor: (item as any).danger
                      ? colors.expense + "20"
                      : colors.secondary,
                  }]}>
                    <Feather
                      name={item.icon}
                      size={16}
                      color={(item as any).danger ? colors.expense : colors.primary}
                    />
                  </View>
                  <Text style={[
                    styles.settingsLabel,
                    { color: (item as any).danger ? colors.expense : colors.foreground },
                  ]}>
                    {item.label}
                  </Text>
                  <View style={styles.settingsRight}>
                    {item.toggle ? (
                      <Switch
                        value={(item as any).value}
                        onValueChange={(item as any).onToggle}
                        trackColor={{ false: colors.border, true: colors.primary + "80" }}
                        thumbColor={(item as any).value ? colors.primary : colors.mutedForeground}
                      />
                    ) : (item as any).value ? (
                      <Text style={[styles.settingsValue, { color: colors.mutedForeground }]}>
                        {(item as any).value}
                      </Text>
                    ) : (item as any).arrow ? (
                      <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
                    ) : null}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <TouchableOpacity
          style={[styles.logoutBtn, { backgroundColor: colors.expense + "15" }]}
          onPress={() => Alert.alert("Выход", "Вы уверены, что хотите выйти?", [
            { text: "Отмена", style: "cancel" },
            { text: "Выйти", style: "destructive", onPress: () => router.replace("/onboarding") },
          ])}
          activeOpacity={0.7}
        >
          <Feather name="log-out" size={18} color={colors.expense} />
          <Text style={[styles.logoutText, { color: colors.expense }]}>Выйти из аккаунта</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  nav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  navTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
  },
  body: { paddingHorizontal: 20, paddingTop: 4 },
  profileHeader: {
    alignItems: "center",
    marginBottom: 20,
    gap: 8,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  avatarText: {
    fontSize: 26,
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
  },
  profileName: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  profileEmail: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  healthCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    overflow: "hidden",
    position: "relative",
  },
  hexBg: { position: "absolute", inset: 0 },
  hex: {
    position: "absolute",
    width: 30,
    height: 34,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
    borderRadius: 4,
    transform: [{ rotate: "30deg" }],
  },
  healthTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  healthLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
    fontFamily: "Inter_400Regular",
    marginBottom: 4,
  },
  healthStatus: {
    fontSize: 20,
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
  },
  scoreCircle: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
  },
  scoreNum: {
    fontSize: 36,
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
  },
  scoreMax: {
    fontSize: 16,
    color: "rgba(255,255,255,0.7)",
    fontFamily: "Inter_400Regular",
  },
  healthTrack: {
    height: 8,
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 16,
  },
  healthFill: {
    height: "100%",
    borderRadius: 4,
  },
  healthStats: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  healthStat: { alignItems: "center", gap: 2 },
  healthStatVal: {
    fontSize: 15,
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
  },
  healthStatLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.65)",
    fontFamily: "Inter_400Regular",
  },
  settingsSection: { marginBottom: 16 },
  settingsTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  settingsCard: {
    borderRadius: 16,
    overflow: "hidden",
  },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 12,
  },
  settingsIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  settingsLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  settingsRight: {
    alignItems: "flex-end",
  },
  settingsValue: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 4,
  },
  logoutText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
});
