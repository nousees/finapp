import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

type Usage = "active" | "rare" | "unused";

interface Subscription {
  id: string;
  name: string;
  icon: string;
  amount: number;
  cycle: string;
  category: string;
  color: string;
  usage: Usage;
  nextDate: string;
}

const SUBSCRIPTIONS: Subscription[] = [
  { id: "s1", name: "Netflix", icon: "film", amount: 999, cycle: "месяц", category: "Развлечения", color: "#E50914", usage: "active", nextDate: "15 июня" },
  { id: "s2", name: "Яндекс.Музыка", icon: "music", amount: 299, cycle: "месяц", category: "Музыка", color: "#FFCC00", usage: "active", nextDate: "8 июня" },
  { id: "s3", name: "Яндекс 360", icon: "cloud", amount: 199, cycle: "месяц", category: "Хранилище", color: "#FC3F1D", usage: "rare", nextDate: "20 июня" },
  { id: "s4", name: "Adobe Creative Cloud", icon: "aperture", amount: 3490, cycle: "месяц", category: "Работа", color: "#FF0000", usage: "active", nextDate: "1 июля" },
  { id: "s5", name: "Duolingo Plus", icon: "book", amount: 449, cycle: "месяц", category: "Образование", color: "#58CC02", usage: "unused", nextDate: "12 июня" },
  { id: "s6", name: "Headspace", icon: "heart", amount: 590, cycle: "месяц", category: "Здоровье", color: "#FF6B35", usage: "unused", nextDate: "25 июня" },
];

const USAGE_LABELS: Record<Usage, string> = {
  active: "Активно",
  rare: "Редко",
  unused: "Не используется",
};

const USAGE_COLORS: Record<Usage, string> = {
  active: "#10B981",
  rare: "#F59E0B",
  unused: "#EF4444",
};

export default function SubscriptionsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [subs, setSubs] = useState(SUBSCRIPTIONS);
  const topPt = Platform.OS === "web" ? 67 : insets.top;
  const pb = Platform.OS === "web" ? 34 : insets.bottom;

  const totalMonthly = subs.reduce((s, sub) => s + sub.amount, 0);
  const unusedCost = subs.filter((s) => s.usage === "unused").reduce((s, sub) => s + sub.amount, 0);
  const rareCost = subs.filter((s) => s.usage === "rare").reduce((s, sub) => s + sub.amount, 0);

  const handleCancel = (id: string, name: string) => {
    Alert.alert(
      `Отменить ${name}?`,
      "Это действие нельзя отменить. Подписка будет деактивирована.",
      [
        { text: "Назад", style: "cancel" },
        {
          text: "Отменить подписку",
          style: "destructive",
          onPress: () => setSubs((prev) => prev.filter((s) => s.id !== id)),
        },
      ]
    );
  };

  const unused = subs.filter((s) => s.usage === "unused");
  const rare = subs.filter((s) => s.usage === "rare");
  const active = subs.filter((s) => s.usage === "active");

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.nav, { paddingTop: topPt + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.muted }]}>
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: colors.foreground }]}>Подписки</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: pb + 40 }]} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={["#6B46C1", "#8B5CF6", "#7ED9B6"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.summaryCard}
        >
          <View style={styles.hexBg} pointerEvents="none">
            {[...Array(6)].map((_, i) => (
              <View key={i} style={[styles.hex, { left: (i * 70) % 280 - 20, top: (i * 43) % 80 - 20, opacity: 0.08 }]} />
            ))}
          </View>
          <Text style={styles.summaryLabel}>Ежемесячные расходы</Text>
          <Text style={styles.summaryAmount}>{totalMonthly.toLocaleString("ru-RU")} ₽</Text>
          <Text style={styles.summaryYear}>~{(totalMonthly * 12).toLocaleString("ru-RU")} ₽ в год</Text>

          <View style={styles.summaryStatsRow}>
            <View style={styles.summaryStat}>
              <Text style={[styles.summaryStatVal, { color: "#A8E6CF" }]}>{subs.length}</Text>
              <Text style={styles.summaryStatLabel}>Подписок</Text>
            </View>
            <View style={styles.summaryStatDivider} />
            <View style={styles.summaryStat}>
              <Text style={[styles.summaryStatVal, { color: "#FCA5A5" }]}>{unusedCost.toLocaleString("ru-RU")} ₽</Text>
              <Text style={styles.summaryStatLabel}>Не используется</Text>
            </View>
            <View style={styles.summaryStatDivider} />
            <View style={styles.summaryStat}>
              <Text style={[styles.summaryStatVal, { color: "#FDE68A" }]}>{rareCost.toLocaleString("ru-RU")} ₽</Text>
              <Text style={styles.summaryStatLabel}>Редко</Text>
            </View>
          </View>
        </LinearGradient>

        {(unused.length > 0 || rare.length > 0) && (
          <View style={[styles.alertCard, { backgroundColor: "#FEF2F2" }]}>
            <Feather name="alert-circle" size={18} color="#EF4444" />
            <View style={styles.alertText}>
              <Text style={styles.alertTitle}>Рекомендация</Text>
              <Text style={styles.alertBody}>
                Вы тратите {(unusedCost + rareCost).toLocaleString("ru-RU")} ₽/мес на{" "}
                {unused.length + rare.length} подписок, которые вы почти не используете.
              </Text>
            </View>
          </View>
        )}

        {unused.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Не используются
            </Text>
            {unused.map((sub) => (
              <SubCard key={sub.id} sub={sub} colors={colors} onCancel={handleCancel} />
            ))}
          </View>
        )}

        {rare.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Используются редко</Text>
            {rare.map((sub) => (
              <SubCard key={sub.id} sub={sub} colors={colors} onCancel={handleCancel} />
            ))}
          </View>
        )}

        {active.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Активные</Text>
            {active.map((sub) => (
              <SubCard key={sub.id} sub={sub} colors={colors} onCancel={handleCancel} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function SubCard({
  sub,
  colors,
  onCancel,
}: {
  sub: Subscription;
  colors: any;
  onCancel: (id: string, name: string) => void;
}) {
  const { Feather } = require("@expo/vector-icons");
  const usageColor = USAGE_COLORS[sub.usage];

  return (
    <View style={[styles.subCard, { backgroundColor: colors.card }]}>
      <View style={[styles.subIcon, { backgroundColor: sub.color + "20" }]}>
        <Feather name={sub.icon} size={20} color={sub.color} />
      </View>
      <View style={styles.subInfo}>
        <View style={styles.subNameRow}>
          <Text style={[styles.subName, { color: colors.foreground }]}>{sub.name}</Text>
          <View style={[styles.usageBadge, { backgroundColor: usageColor + "20" }]}>
            <Text style={[styles.usageText, { color: usageColor }]}>
              {USAGE_LABELS[sub.usage]}
            </Text>
          </View>
        </View>
        <View style={styles.subDetails}>
          <Text style={[styles.subCategory, { color: colors.mutedForeground }]}>
            {sub.category} · следующий платёж {sub.nextDate}
          </Text>
        </View>
      </View>
      <View style={styles.subRight}>
        <Text style={[styles.subAmount, { color: colors.foreground }]}>
          {sub.amount.toLocaleString("ru-RU")} ₽
        </Text>
        <Text style={[styles.subCycle, { color: colors.mutedForeground }]}>/{sub.cycle}</Text>
        {sub.usage !== "active" && (
          <TouchableOpacity
            onPress={() => onCancel(sub.id, sub.name)}
            style={[styles.cancelBtn, { backgroundColor: "#EF4444" + "15" }]}
          >
            <Text style={[styles.cancelText, { color: "#EF4444" }]}>Отменить</Text>
          </TouchableOpacity>
        )}
      </View>
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
  summaryCard: {
    borderRadius: 20,
    padding: 22,
    marginBottom: 14,
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
  summaryLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
    fontFamily: "Inter_400Regular",
    marginBottom: 6,
  },
  summaryAmount: {
    fontSize: 34,
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
    marginBottom: 2,
  },
  summaryYear: {
    fontSize: 13,
    color: "rgba(255,255,255,0.6)",
    fontFamily: "Inter_400Regular",
    marginBottom: 18,
  },
  summaryStatsRow: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 14,
    padding: 12,
  },
  summaryStat: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  summaryStatVal: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  summaryStatLabel: {
    fontSize: 10,
    color: "rgba(255,255,255,0.65)",
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  summaryStatDivider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.2)",
    marginVertical: 4,
  },
  alertCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  alertText: { flex: 1 },
  alertTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#B91C1C",
    marginBottom: 3,
  },
  alertBody: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#B91C1C",
    lineHeight: 18,
  },
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    marginBottom: 10,
  },
  subCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  subIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  subInfo: {
    flex: 1,
    gap: 5,
  },
  subNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  subName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  usageBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  usageText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  subDetails: {},
  subCategory: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  subRight: {
    alignItems: "flex-end",
    gap: 4,
    flexShrink: 0,
  },
  subAmount: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  subCycle: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  cancelBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 2,
  },
  cancelText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
});
