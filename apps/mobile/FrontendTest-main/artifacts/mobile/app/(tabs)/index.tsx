import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import DonutChart from "@/components/DonutChart";
import TransactionItem from "@/components/TransactionItem";
import { CATEGORIES, useFinance } from "@/context/FinanceContext";
import { useColors } from "@/hooks/useColors";

function formatBalance(n: number) {
  const abs = Math.abs(n);
  return (n < 0 ? "−" : "") + abs.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " ₽";
}

function formatShort(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)} млн ₽`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)} т. ₽`;
  return `${n.toFixed(0)} ₽`;
}

const QUICK_ACTIONS = [
  { icon: "bar-chart-2", label: "Аналитика", route: "/analytics", gradient: ["#6B46C1", "#8B5CF6"] as const },
  { icon: "repeat", label: "Подписки", route: "/subscriptions", gradient: ["#059669", "#7ED9B6"] as const },
  { icon: "user", label: "Профиль", route: "/profile", gradient: ["#2563EB", "#60A5FA"] as const },
  { icon: "target", label: "Цели", route: "/(tabs)/goals", gradient: ["#D97706", "#FBBF24"] as const },
];

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { totalBalance, monthIncome, monthExpense, transactions, expenseByCategory } = useFinance();
  const recent = transactions.slice(0, 5);
  const topPt = Platform.OS === "web" ? 67 : insets.top;

  const savingsRate = monthIncome > 0
    ? Math.round(((monthIncome - monthExpense) / monthIncome) * 100)
    : 0;

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={["#6B46C1", "#8B5CF6", "#7ED9B6"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: topPt + 16 }]}
      >
        <View style={styles.hexPattern} pointerEvents="none">
          {[...Array(20)].map((_, i) => (
            <View
              key={i}
              style={[styles.hex, {
                left: ((i * 73) % 320) - 20,
                top: ((i * 47) % 200) - 20,
                opacity: 0.08 + (i % 3) * 0.03,
              }]}
            />
          ))}
        </View>

        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Доброе утро</Text>
            <Text style={styles.username}>Алексей</Text>
          </View>
          <TouchableOpacity onPress={() => router.push("/profile")}>
            <LinearGradient colors={["#A8E6CF", "#7ED9B6"]} style={styles.avatar}>
              <Text style={styles.avatarText}>АЧ</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={styles.balanceBlock}>
          <Text style={styles.balanceLabel}>Общий баланс</Text>
          <Text style={styles.balanceAmount}>{formatBalance(totalBalance)}</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Feather name="arrow-down-left" size={14} color="#A8E6CF" />
            </View>
            <View>
              <Text style={styles.statLabel}>Доходы</Text>
              <Text style={styles.statValue}>{formatShort(monthIncome)}</Text>
            </View>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: "rgba(239,68,68,0.2)" }]}>
              <Feather name="arrow-up-right" size={14} color="#FCA5A5" />
            </View>
            <View>
              <Text style={styles.statLabel}>Расходы</Text>
              <Text style={styles.statValue}>{formatShort(monthExpense)}</Text>
            </View>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: "rgba(168,230,207,0.2)" }]}>
              <Feather name="percent" size={14} color="#A8E6CF" />
            </View>
            <View>
              <Text style={styles.statLabel}>Сбережения</Text>
              <Text style={[styles.statValue, { color: savingsRate >= 0 ? "#A8E6CF" : "#FCA5A5" }]}>
                {savingsRate}%
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      <View style={[styles.body, { backgroundColor: colors.background }]}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Быстрый доступ</Text>
          <View style={styles.quickActions}>
            {QUICK_ACTIONS.map((action) => (
              <TouchableOpacity
                key={action.route}
                style={styles.quickAction}
                onPress={() => router.push(action.route as any)}
                activeOpacity={0.75}
              >
                <LinearGradient colors={action.gradient} style={styles.quickIcon}>
                  <Feather name={action.icon as any} size={20} color="#FFFFFF" />
                </LinearGradient>
                <Text style={[styles.quickLabel, { color: colors.foreground }]}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {expenseByCategory.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionRow}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>За этот месяц</Text>
              <TouchableOpacity onPress={() => router.push("/analytics")}>
                <Text style={[styles.seeAll, { color: colors.primary }]}>Подробнее</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.chartCard, { backgroundColor: colors.card }]}>
              <LinearGradient
                colors={["#6B46C1", "#8B5CF6", "#7ED9B6"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.chartGradient}
              >
                <DonutChart
                  data={expenseByCategory.slice(0, 5)}
                  size={140}
                  innerRadius={48}
                  centerLabel={formatShort(monthExpense)}
                  centerSub="расходы"
                />
              </LinearGradient>
              <View style={styles.legend}>
                {expenseByCategory.slice(0, 5).map((e) => {
                  const cat = CATEGORIES.find((c) => c.id === e.category);
                  const pct = monthExpense > 0 ? Math.round((e.amount / monthExpense) * 100) : 0;
                  return (
                    <View key={e.category} style={styles.legendRow}>
                      <View style={[styles.legendDot, { backgroundColor: e.color }]} />
                      <Text style={[styles.legendName, { color: colors.foreground }]} numberOfLines={1}>
                        {cat?.name ?? e.category}
                      </Text>
                      <Text style={[styles.legendPct, { color: colors.mutedForeground }]}>{pct}%</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Последние</Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/transactions")}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>Все</Text>
            </TouchableOpacity>
          </View>
          {recent.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
              <Feather name="inbox" size={32} color={colors.border} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                Нажмите на микрофон{"\n"}чтобы добавить транзакцию
              </Text>
            </View>
          ) : (
            recent.map((t) => <TransactionItem key={t.id} transaction={t} />)
          )}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Советы</Text>
          <TouchableOpacity
            style={[styles.tipCard, { backgroundColor: colors.secondary }]}
            onPress={() => router.push("/analytics")}
            activeOpacity={0.8}
          >
            <LinearGradient colors={["#6B46C1", "#8B5CF6"]} style={styles.tipIcon}>
              <Feather name="zap" size={16} color="#FFFFFF" />
            </LinearGradient>
            <View style={styles.tipText}>
              <Text style={[styles.tipTitle, { color: colors.foreground }]}>Вы в рамках плана!</Text>
              <Text style={[styles.tipBody, { color: colors.mutedForeground }]}>
                Расходы на 12% ниже прошлого месяца. Нажмите, чтобы посмотреть аналитику.
              </Text>
            </View>
            <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tipCard, { backgroundColor: colors.secondary }]}
            onPress={() => router.push("/subscriptions")}
            activeOpacity={0.8}
          >
            <LinearGradient colors={["#A8E6CF", "#7ED9B6"]} style={styles.tipIcon}>
              <Feather name="repeat" size={16} color="#1A1A2E" />
            </LinearGradient>
            <View style={styles.tipText}>
              <Text style={[styles.tipTitle, { color: colors.foreground }]}>Проверьте подписки</Text>
              <Text style={[styles.tipBody, { color: colors.mutedForeground }]}>
                У вас 6 активных подписок. 2 из них почти не используются.
              </Text>
            </View>
            <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    position: "relative",
    overflow: "hidden",
  },
  hexPattern: { position: "absolute", inset: 0 },
  hex: {
    position: "absolute",
    width: 40,
    height: 46,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
    borderRadius: 4,
    transform: [{ rotate: "30deg" }],
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  greeting: {
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
    fontFamily: "Inter_400Regular",
  },
  username: {
    fontSize: 20,
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 14,
    color: "#1A1A2E",
    fontFamily: "Inter_700Bold",
  },
  balanceBlock: {
    alignItems: "center",
    marginBottom: 24,
  },
  balanceLabel: {
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
    fontFamily: "Inter_400Regular",
    marginBottom: 6,
  },
  balanceAmount: {
    fontSize: 34,
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
    letterSpacing: -1,
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  statCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(168,230,207,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  statLabel: {
    fontSize: 10,
    color: "rgba(255,255,255,0.65)",
    fontFamily: "Inter_400Regular",
  },
  statValue: {
    fontSize: 13,
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
  },
  statDivider: {
    width: 1,
    height: "100%",
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  body: {
    marginTop: -16,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingHorizontal: 20,
  },
  section: { marginBottom: 24 },
  sectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    marginBottom: 12,
  },
  seeAll: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  quickActions: {
    flexDirection: "row",
    gap: 12,
  },
  quickAction: {
    flex: 1,
    alignItems: "center",
    gap: 8,
  },
  quickIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#6B46C1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  quickLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },
  chartCard: {
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  chartGradient: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: "center",
    justifyContent: "center",
  },
  legend: {
    flex: 1,
    gap: 10,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendName: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  legendPct: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  emptyState: {
    borderRadius: 16,
    padding: 28,
    alignItems: "center",
    gap: 10,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 22,
  },
  tipCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    marginBottom: 8,
  },
  tipIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  tipText: { flex: 1, gap: 2 },
  tipTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  tipBody: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
});
