// @ts-nocheck
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { G, Rect, Text as SvgText } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DashboardStackParamList } from "@app/navigation/types";
import { getFinancialInsights, listRecommendations } from "@shared/api/analysis";
import { listTransactions } from "@shared/api/transactions";
import { useAppSettings } from "@shared/settings/AppSettingsContext";
import { useAppTheme } from "@shared/theme/ThemeProvider";

type Props = NativeStackScreenProps<DashboardStackParamList, "Analytics">;
type Period = "week" | "month" | "year";

const PERIODS: Array<{ id: Period; label: string }> = [
  { id: "week", label: "Неделя" },
  { id: "month", label: "Месяц" },
  { id: "year", label: "Год" },
];

export function AnalyticsScreen({ navigation }: Props) {
  const { colors, gradients } = useAppTheme();
  const { formatMoney } = useAppSettings();
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState<Period>("month");
  const [insights, setInsights] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [insightData, txData, recData] = await Promise.all([
        getFinancialInsights(),
        listTransactions({ limit: 120 }),
        listRecommendations().catch(() => []),
      ]);
      setInsights(insightData);
      setTransactions(Array.isArray(txData) ? txData : []);
      setRecommendations(Array.isArray(recData) ? recData : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить аналитику");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void loadData();
    }, [loadData]),
  );

  const summary = insights?.summary;
  const income = Number(summary?.totalIncome || totalByType(transactions, "INCOME"));
  const expense = Number(summary?.totalExpenses || totalByType(transactions, "EXPENSE"));
  const savingsRate = income > 0 ? Math.round(((income - expense) / income) * 100) : 0;
  const categories = useMemo(() => normalizeCategories(insights?.categories, transactions), [insights, transactions]);
  const bars = useMemo(() => buildBars(transactions, period, insights?.cashflow), [transactions, period, insights]);
  const topExpenses = (Array.isArray(transactions) ? transactions : []).filter((item) => item.type === "EXPENSE").sort((a, b) => Number(b.amount) - Number(a.amount)).slice(0, 5);
  const topPt = Platform.OS === "web" ? 42 : insets.top;

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.nav, { paddingTop: topPt + 8 }]}>
        <Pressable onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: colors.backgroundAlt }]}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </Pressable>
        <Text style={[styles.navTitle, { color: colors.text }]}>Аналитика</Text>
        <Pressable onPress={handleRefresh} style={[styles.backBtn, { backgroundColor: colors.backgroundAlt }]}>
          <Feather name="refresh-cw" size={18} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: 120 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
      >
        <View style={styles.periodRow}>
          {PERIODS.map((item) => (
            <Pressable key={item.id} onPress={() => setPeriod(item.id)}>
              {period === item.id ? (
                <LinearGradient colors={gradients.successDeep} style={styles.periodChip}>
                  <Text style={styles.periodActiveText}>{item.label}</Text>
                </LinearGradient>
              ) : (
                <View style={[styles.periodChip, { backgroundColor: colors.backgroundAlt }]}>
                  <Text style={[styles.periodText, { color: colors.textMuted }]}>{item.label}</Text>
                </View>
              )}
            </Pressable>
          ))}
        </View>

        {loading ? <ActivityIndicator color={colors.primary} size="large" /> : null}
        {error ? (
          <Pressable style={[styles.errorCard, { backgroundColor: colors.surfaceAlt }]} onPress={() => void loadData()}>
            <Feather name="refresh-cw" size={16} color={colors.primary} />
            <Text style={[styles.errorText, { color: colors.text }]}>{error}</Text>
          </Pressable>
        ) : null}

        <View style={styles.statsRow}>
          <StatCard icon="arrow-down-left" label="Доходы" value={formatMoney(income)} color={colors.success} />
          <StatCard icon="arrow-up-right" label="Расходы" value={formatMoney(expense)} color={colors.danger} />
          <StatCard icon="percent" label="Сбережения" value={`${savingsRate}%`} color={savingsRate >= 0 ? colors.success : colors.danger} />
        </View>

        <View style={[styles.chartCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.chartTitle, { color: colors.text }]}>Доходы и расходы</Text>
          <View style={styles.legendRow}>
            <LegendDot color="#7ED9B6" label="Доходы" />
            <LegendDot color="#8B5CF6" label="Расходы" />
          </View>
          <View style={styles.barWrap}>
            <BarChart data={bars} />
          </View>
        </View>

        {categories.length > 0 ? (
          <View style={[styles.chartCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.chartTitle, { color: colors.text }]}>По категориям</Text>
            <View style={styles.categoryList}>
              {categories.map((item) => (
                <View key={item.name} style={styles.categoryRow}>
                  <View style={[styles.catDot, { backgroundColor: item.color }]} />
                  <Text style={[styles.catName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                  <Text style={[styles.catAmount, { color: colors.textMuted }]}>{formatMoney(item.amount)}</Text>
                  <Text style={[styles.catPct, { color: colors.primary }]}>{item.percent}%</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <View style={[styles.insightCard, { backgroundColor: colors.surfaceAlt }]}>
          <LinearGradient colors={gradients.successDeep} style={styles.insightIcon}>
            <Feather name="zap" size={16} color="#FFFFFF" />
          </LinearGradient>
          <View style={styles.insightText}>
            <Text style={[styles.insightTitle, { color: colors.text }]}>Финансовый совет</Text>
            <Text style={[styles.insightBody, { color: colors.textMuted }]}>
              {recommendations[0]?.description ||
                (savingsRate >= 20
                  ? "Отлично: вы сохраняете больше 20% доходов. Можно усилить цели или резервный фонд."
                  : "Попробуйте снизить регулярные расходы и проверить подписки, чтобы увеличить долю сбережений.")}
            </Text>
          </View>
        </View>

        <View style={[styles.chartCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.chartTitle, { color: colors.text }]}>Топ расходов</Text>
          {topExpenses.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>Пока нет расходов для рейтинга.</Text>
          ) : (
            topExpenses.map((item, index) => (
              <View key={item.id} style={[styles.topRow, index > 0 ? { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth } : null]}>
                <Text style={[styles.topNum, { color: colors.textMuted }]}>#{index + 1}</Text>
                <View style={[styles.topIcon, { backgroundColor: `${colors.primary}20` }]}>
                  <Feather name={item.is_recurring ? "repeat" : "shopping-bag"} size={14} color={colors.primary} />
                </View>
                <Text style={[styles.topName, { color: colors.text }]} numberOfLines={1}>{item.description || item.original_description || "Расход"}</Text>
                <Text style={[styles.topAmount, { color: colors.danger }]}>{formatMoney(item.amount)}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function StatCard({ icon, label, value, color }) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
      <View style={[styles.statIcon, { backgroundColor: `${color}20` }]}>
        <Feather name={icon} size={16} color={color} />
      </View>
      <Text style={[styles.statLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.statValue, { color }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function LegendDot({ color, label }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={[styles.legendText, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

function BarChart({ data }) {
  const { colors } = useAppTheme();
  const chartW = 300;
  const chartH = 140;
  const barW = Math.min(24, chartW / data.length / 3);
  const gap = (chartW - barW * 2 * data.length) / (data.length + 1);
  const maxVal = Math.max(...data.flatMap((item) => [item.income, item.expense]), 1);

  return (
    <Svg width={chartW} height={chartH + 24}>
      <G>
        {data.map((item, index) => {
          const x = gap + index * (barW * 2 + gap);
          const incomeHeight = (item.income / maxVal) * chartH;
          const expenseHeight = (item.expense / maxVal) * chartH;
          return (
            <G key={`${item.label}-${index}`}>
              <Rect x={x} y={chartH - incomeHeight} width={barW} height={Math.max(incomeHeight, 2)} rx={4} fill="#7ED9B6" />
              <Rect x={x + barW + 2} y={chartH - expenseHeight} width={barW} height={Math.max(expenseHeight, 2)} rx={4} fill="#8B5CF6" />
              <SvgText x={x + barW} y={chartH + 18} textAnchor="middle" fontSize={10} fill={colors.textMuted} fontFamily="Inter_400Regular">
                {item.label}
              </SvgText>
            </G>
          );
        })}
      </G>
    </Svg>
  );
}

function totalByType(transactions, type) {
  return transactions.filter((item) => item.type === type).reduce((sum, item) => sum + Number(item.amount || 0), 0);
}

function normalizeCategories(apiCategories, transactions) {
  const palette = ["#F97316", "#3B82F6", "#EC4899", "#8B5CF6", "#10B981"];
  if (Array.isArray(apiCategories) && apiCategories.length > 0) {
    return apiCategories.slice(0, 6).map((item, index) => ({
      name: item.categoryName || "Без категории",
      amount: Number(item.amount || 0),
      percent: Math.round(Number(item.percentage || 0)),
      color: palette[index % palette.length],
    }));
  }
  const amount = totalByType(transactions, "EXPENSE");
  if (!amount) return [];
  return [{ name: "Расходы", amount, percent: 100, color: palette[0] }];
}

function buildBars(transactions, period: Period, cashflow) {
  if (Array.isArray(cashflow) && cashflow.length > 0) {
    return cashflow.slice(period === "week" ? -7 : period === "year" ? -6 : -5).map((item) => ({
      label: new Date(item.date).toLocaleDateString("ru-RU", period === "year" ? { month: "short" } : { day: "numeric", month: "short" }),
      income: Number(item.income || 0),
      expense: Number(item.expenses || 0),
    }));
  }
  const count = period === "week" ? 7 : period === "year" ? 6 : 5;
  const labels = period === "week" ? ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"] : period === "year" ? ["2021", "2022", "2023", "2024", "2025", "2026"] : ["Янв", "Фев", "Мар", "Апр", "Май"];
  const items = Array.isArray(transactions) ? transactions : [];
  return Array.from({ length: count }).map((_, index) => {
    const bucket = items.filter((_, txIndex) => txIndex % count === index);
    return {
      label: labels[index],
      income: totalByType(bucket, "INCOME"),
      expense: totalByType(bucket, "EXPENSE"),
    };
  });
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  nav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  navTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  body: { paddingHorizontal: 20, gap: 14 },
  periodRow: { flexDirection: "row", gap: 8 },
  periodChip: { minHeight: 36, paddingHorizontal: 16, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  periodText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  periodActiveText: { color: "#FFFFFF", fontSize: 14, fontFamily: "Inter_700Bold" },
  statsRow: { flexDirection: "row", gap: 10 },
  statCard: { flex: 1, borderRadius: 16, padding: 12, gap: 6 },
  statIcon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  statValue: { fontSize: 13, fontFamily: "Inter_700Bold" },
  chartCard: { borderRadius: 18, padding: 18, gap: 14 },
  chartTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  legendRow: { flexDirection: "row", gap: 16 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  barWrap: { alignItems: "center" },
  categoryList: { gap: 10 },
  categoryRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  catDot: { width: 8, height: 8, borderRadius: 4 },
  catName: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
  catAmount: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  catPct: { width: 42, textAlign: "right", fontSize: 12, fontFamily: "Inter_700Bold" },
  insightCard: { flexDirection: "row", gap: 12, padding: 14, borderRadius: 14 },
  insightIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  insightText: { flex: 1, gap: 4 },
  insightTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  insightBody: { fontSize: 13, lineHeight: 20, fontFamily: "Inter_400Regular" },
  topRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 9 },
  topNum: { width: 24, fontSize: 12, fontFamily: "Inter_700Bold" },
  topIcon: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  topName: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
  topAmount: { fontSize: 14, fontFamily: "Inter_700Bold" },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  errorCard: { borderRadius: 14, padding: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  errorText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
});
