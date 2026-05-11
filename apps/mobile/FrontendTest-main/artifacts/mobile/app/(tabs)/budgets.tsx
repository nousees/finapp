import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import BudgetCard from "@/components/BudgetCard";
import { useFinance } from "@/context/FinanceContext";
import { useColors } from "@/hooks/useColors";

export default function BudgetsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { budgets } = useFinance();
  const topPt = Platform.OS === "web" ? 67 : insets.top;

  const totalLimit = budgets.reduce((s, b) => s + b.limit, 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);
  const overBudget = budgets.filter((b) => b.spent > b.limit);
  const remaining = totalLimit - totalSpent;

  const now = new Date();
  const monthName = now.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.header, { paddingTop: topPt + 16 }]}>
        <Text style={[styles.pageTitle, { color: colors.foreground }]}>Бюджеты</Text>
        <Text style={[styles.pageDate, { color: colors.mutedForeground }]}>{monthName}</Text>
      </View>

      <View style={{ paddingHorizontal: 20 }}>
        <LinearGradient
          colors={["#6B46C1", "#8B5CF6", "#A8E6CF"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.summaryCard}
        >
          <View style={styles.hexBg} pointerEvents="none">
            {[...Array(8)].map((_, i) => (
              <View key={i} style={[styles.hex, { left: (i * 60) % 280 - 20, top: (i * 37) % 80 - 20, opacity: 0.1 }]} />
            ))}
          </View>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Лимит</Text>
              <Text style={styles.summaryValue}>{totalLimit.toLocaleString("ru-RU")} ₽</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Потрачено</Text>
              <Text style={styles.summaryValue}>{totalSpent.toLocaleString("ru-RU")} ₽</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Остаток</Text>
              <Text style={[styles.summaryValue, { color: remaining < 0 ? "#FCA5A5" : "#A8E6CF" }]}>
                {Math.abs(remaining).toLocaleString("ru-RU")} ₽
              </Text>
            </View>
          </View>

          <View style={styles.overallTrack}>
            <View
              style={[
                styles.overallFill,
                {
                  width: `${Math.min((totalSpent / totalLimit) * 100, 100)}%`,
                  backgroundColor: totalSpent > totalLimit ? "#EF4444" : "#A8E6CF",
                },
              ]}
            />
          </View>
          <Text style={styles.overallPct}>
            {Math.round((totalSpent / totalLimit) * 100)}% месячного бюджета использовано
          </Text>
        </LinearGradient>

        {overBudget.length > 0 && (
          <View style={[styles.alertCard, { backgroundColor: "#FEF2F2" }]}>
            <Feather name="alert-triangle" size={18} color="#EF4444" />
            <Text style={styles.alertText}>
              Превышен лимит по{" "}
              {overBudget.length === 1 ? "категории" : `${overBudget.length} категориям`}:{" "}
              {overBudget.map((b) => b.name).join(", ")}
            </Text>
          </View>
        )}

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>По категориям</Text>
        {budgets.map((b) => (
          <BudgetCard key={b.id} budget={b} />
        ))}

        <View style={[styles.insightCard, { backgroundColor: colors.card }]}>
          <View style={styles.insightHeader}>
            <LinearGradient colors={["#6B46C1", "#8B5CF6"]} style={styles.insightIcon}>
              <Feather name="bar-chart-2" size={16} color="#FFFFFF" />
            </LinearGradient>
            <Text style={[styles.insightTitle, { color: colors.foreground }]}>Совет месяца</Text>
          </View>
          <Text style={[styles.insightText, { color: colors.mutedForeground }]}>
            Ваша главная статья расходов — еда и напитки. Попробуйте готовить дома — это поможет сократить расходы на 30%.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  pageTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
  },
  pageDate: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  summaryCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    overflow: "hidden",
    position: "relative",
  },
  hexBg: {
    position: "absolute",
    inset: 0,
  },
  hex: {
    position: "absolute",
    width: 30,
    height: 34,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
    borderRadius: 4,
    transform: [{ rotate: "30deg" }],
  },
  summaryRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.7)",
    fontFamily: "Inter_400Regular",
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
  },
  summaryDivider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.2)",
    marginVertical: 4,
  },
  overallTrack: {
    height: 8,
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  overallFill: {
    height: "100%",
    borderRadius: 4,
  },
  overallPct: {
    fontSize: 12,
    color: "rgba(255,255,255,0.75)",
    fontFamily: "Inter_400Regular",
  },
  alertCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  alertText: {
    flex: 1,
    fontSize: 13,
    color: "#B91C1C",
    fontFamily: "Inter_500Medium",
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    marginBottom: 12,
  },
  insightCard: {
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    gap: 12,
  },
  insightHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  insightIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  insightTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  insightText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
});
