import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { G, Rect, Text as SvgText } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import DonutChart from "@/components/DonutChart";
import { CATEGORIES, useFinance } from "@/context/FinanceContext";
import { useColors } from "@/hooks/useColors";

type Period = "week" | "month" | "year";

const PERIOD_LABELS: Record<Period, string> = {
  week: "Неделя",
  month: "Месяц",
  year: "Год",
};

const BAR_DATA: Record<Period, { label: string; income: number; expense: number }[]> = {
  week: [
    { label: "Пн", income: 0, expense: 78 },
    { label: "Вт", income: 0, expense: 45 },
    { label: "Ср", income: 850, expense: 230 },
    { label: "Чт", income: 0, expense: 65 },
    { label: "Пт", income: 0, expense: 34 },
    { label: "Сб", income: 0, expense: 120 },
    { label: "Вс", income: 4500, expense: 200 },
  ],
  month: [
    { label: "Янв", income: 4500, expense: 3200 },
    { label: "Фев", income: 5200, expense: 2800 },
    { label: "Мар", income: 4800, expense: 3600 },
    { label: "Апр", income: 6100, expense: 3100 },
    { label: "Май", income: 5350, expense: 1676 },
  ],
  year: [
    { label: "2022", income: 52000, expense: 45000 },
    { label: "2023", income: 65000, expense: 52000 },
    { label: "2024", income: 78000, expense: 60000 },
    { label: "2025", income: 26850, expense: 18476 },
  ],
};

function BarChart({ data, colors }: { data: { label: string; income: number; expense: number }[]; colors: any }) {
  const chartW = Platform.OS === "web" ? 320 : 300;
  const chartH = 140;
  const barW = Math.min(28, (chartW / data.length) - 12);
  const gap = (chartW - barW * 2 * data.length) / (data.length + 1);
  const maxVal = Math.max(...data.flatMap((d) => [d.income, d.expense]), 1);

  return (
    <Svg width={chartW} height={chartH + 24}>
      <G>
        {data.map((d, i) => {
          const x = gap + i * (barW * 2 + gap);
          const ih = (d.income / maxVal) * chartH;
          const eh = (d.expense / maxVal) * chartH;
          return (
            <G key={i}>
              <Rect
                x={x}
                y={chartH - ih}
                width={barW}
                height={Math.max(ih, 2)}
                rx={4}
                fill="#7ED9B6"
                opacity={0.9}
              />
              <Rect
                x={x + barW + 2}
                y={chartH - eh}
                width={barW}
                height={Math.max(eh, 2)}
                rx={4}
                fill="#8B5CF6"
                opacity={0.9}
              />
              <SvgText
                x={x + barW}
                y={chartH + 18}
                textAnchor="middle"
                fontSize={10}
                fill={colors.mutedForeground}
                fontFamily="Inter_400Regular"
              >
                {d.label}
              </SvgText>
            </G>
          );
        })}
      </G>
    </Svg>
  );
}

export default function AnalyticsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { expenseByCategory, monthIncome, monthExpense, transactions } = useFinance();
  const [period, setPeriod] = useState<Period>("month");
  const topPt = Platform.OS === "web" ? 67 : insets.top;
  const pb = Platform.OS === "web" ? 34 : insets.bottom;

  const barData = BAR_DATA[period];
  const totalIncome = barData.reduce((s, d) => s + d.income, 0);
  const totalExpense = barData.reduce((s, d) => s + d.expense, 0);
  const savingsRate = totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.nav, { paddingTop: topPt + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.muted }]}>
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: colors.foreground }]}>Аналитика</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: pb + 40 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.periodRow}>
          {(["week", "month", "year"] as Period[]).map((p) => (
            <TouchableOpacity key={p} onPress={() => setPeriod(p)} activeOpacity={0.7}>
              {period === p ? (
                <LinearGradient colors={["#6B46C1", "#8B5CF6"]} style={styles.periodChip}>
                  <Text style={[styles.periodLabel, { color: "#FFFFFF" }]}>{PERIOD_LABELS[p]}</Text>
                </LinearGradient>
              ) : (
                <View style={[styles.periodChip, { backgroundColor: colors.muted }]}>
                  <Text style={[styles.periodLabel, { color: colors.mutedForeground }]}>{PERIOD_LABELS[p]}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <View style={[styles.statDot, { backgroundColor: "#7ED9B6" + "30" }]}>
              <Feather name="arrow-down-left" size={16} color="#7ED9B6" />
            </View>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Доходы</Text>
            <Text style={[styles.statVal, { color: colors.income }]}>
              {totalIncome.toLocaleString("ru-RU")} ₽
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <View style={[styles.statDot, { backgroundColor: "#8B5CF6" + "30" }]}>
              <Feather name="arrow-up-right" size={16} color="#8B5CF6" />
            </View>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Расходы</Text>
            <Text style={[styles.statVal, { color: colors.expense }]}>
              {totalExpense.toLocaleString("ru-RU")} ₽
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <View style={[styles.statDot, { backgroundColor: "#F59E0B" + "30" }]}>
              <Feather name="percent" size={16} color="#F59E0B" />
            </View>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Сбережения</Text>
            <Text style={[styles.statVal, { color: savingsRate >= 0 ? colors.income : colors.expense }]}>
              {savingsRate}%
            </Text>
          </View>
        </View>

        <View style={[styles.chartCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.chartTitle, { color: colors.foreground }]}>Доходы и расходы</Text>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: "#7ED9B6" }]} />
              <Text style={[styles.legendText, { color: colors.mutedForeground }]}>Доходы</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: "#8B5CF6" }]} />
              <Text style={[styles.legendText, { color: colors.mutedForeground }]}>Расходы</Text>
            </View>
          </View>
          <View style={styles.barWrap}>
            <BarChart data={barData} colors={colors} />
          </View>
        </View>

        {expenseByCategory.length > 0 && (
          <View style={[styles.chartCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.chartTitle, { color: colors.foreground }]}>По категориям</Text>
            <View style={styles.donutRow}>
              <LinearGradient
                colors={["#6B46C1", "#8B5CF6", "#7ED9B6"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.donutGradient}
              >
                <DonutChart
                  data={expenseByCategory.slice(0, 5)}
                  size={130}
                  innerRadius={44}
                  centerLabel={`${expenseByCategory.length}`}
                  centerSub="категорий"
                />
              </LinearGradient>
              <View style={styles.catList}>
                {expenseByCategory.slice(0, 5).map((e) => {
                  const cat = CATEGORIES.find((c) => c.id === e.category);
                  return (
                    <View key={e.category} style={styles.catRow}>
                      <View style={[styles.catDot, { backgroundColor: e.color }]} />
                      <Text style={[styles.catName, { color: colors.foreground }]} numberOfLines={1}>
                        {cat?.name ?? e.category}
                      </Text>
                      <Text style={[styles.catAmt, { color: colors.mutedForeground }]}>
                        {e.amount.toLocaleString("ru-RU")} ₽
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
        )}

        <View style={[styles.insightCard, { backgroundColor: colors.secondary }]}>
          <LinearGradient colors={["#6B46C1", "#8B5CF6"]} style={styles.insightIcon}>
            <Feather name="zap" size={16} color="#FFFFFF" />
          </LinearGradient>
          <View style={styles.insightText}>
            <Text style={[styles.insightTitle, { color: colors.foreground }]}>Финансовый совет</Text>
            <Text style={[styles.insightBody, { color: colors.mutedForeground }]}>
              {savingsRate >= 20
                ? "Отлично! Вы сохраняете более 20% доходов. Рекомендуем инвестировать излишки."
                : savingsRate >= 0
                ? "Попробуйте сократить расходы на 10–15%, чтобы увеличить сбережения."
                : "Расходы превышают доходы. Пересмотрите бюджет и найдите статьи для сокращения."}
            </Text>
          </View>
        </View>

        <View style={[styles.chartCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.chartTitle, { color: colors.foreground }]}>Топ расходов</Text>
          {transactions
            .filter((t) => t.type === "expense")
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5)
            .map((t, i) => {
              const cat = CATEGORIES.find((c) => c.id === t.category);
              return (
                <View key={t.id} style={[styles.topRow, i > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border } : {}]}>
                  <Text style={[styles.topNum, { color: colors.mutedForeground }]}>#{i + 1}</Text>
                  <View style={[styles.topIcon, { backgroundColor: (cat?.color ?? "#6B7280") + "20" }]}>
                    <Feather name={(cat?.icon as any) ?? "circle"} size={14} color={cat?.color ?? "#6B7280"} />
                  </View>
                  <Text style={[styles.topMerchant, { color: colors.foreground }]} numberOfLines={1}>
                    {t.merchant}
                  </Text>
                  <Text style={[styles.topAmt, { color: colors.expense }]}>
                    {t.amount.toLocaleString("ru-RU")} ₽
                  </Text>
                </View>
              );
            })}
        </View>
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
  periodRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  periodChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  periodLabel: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    gap: 6,
  },
  statDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  statVal: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  chartCard: {
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    gap: 14,
  },
  chartTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  legendRow: {
    flexDirection: "row",
    gap: 16,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  barWrap: {
    alignItems: "center",
  },
  donutRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  donutGradient: {
    width: 130,
    height: 130,
    borderRadius: 65,
    alignItems: "center",
    justifyContent: "center",
  },
  catList: {
    flex: 1,
    gap: 8,
  },
  catRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  catDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  catName: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  catAmt: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  insightCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    marginBottom: 14,
  },
  insightIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  insightText: { flex: 1, gap: 4 },
  insightTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  insightBody: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  topNum: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    width: 24,
  },
  topIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  topMerchant: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  topAmt: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
});
