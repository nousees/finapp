// @ts-nocheck
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DashboardStackParamList } from "@app/navigation/types";
import { getFinancialInsights, listRecommendations } from "@shared/api/analysis";
import { listTransactions } from "@shared/api/transactions";
import { useUser } from "@shared/contexts/UserContext";
import { useAppSettings } from "@shared/settings/AppSettingsContext";
import { useAppTheme } from "@shared/theme/ThemeProvider";

type Props = NativeStackScreenProps<DashboardStackParamList, "DashboardHome">;

const quickActions = [
  { icon: "bar-chart-2", label: "Аналитика", target: "Analytics", gradient: ["#6B46C1", "#8B5CF6"] },
  { icon: "repeat", label: "Подписки", target: "Subscriptions", gradient: ["#059669", "#7ED9B6"] },
  { icon: "file-text", label: "Отчёты", target: "Reports", gradient: ["#2563EB", "#60A5FA"] },
  { icon: "target", label: "Цели", target: "GoalsTab", gradient: ["#D97706", "#FBBF24"] },
];

export function DashboardHomeScreen({ navigation }: Props) {
  const { colors, gradients } = useAppTheme();
  const { formatMoney } = useAppSettings();
  const { user } = useUser();
  const insets = useSafeAreaInsets();
  const [insights, setInsights] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [insightData, txData, recData] = await Promise.all([
        getFinancialInsights(),
        listTransactions({ limit: 5 }),
        listRecommendations().catch(() => []),
      ]);
      setInsights(insightData);
      setTransactions(Array.isArray(txData) ? txData : []);
      setRecommendations(Array.isArray(recData) ? recData.slice(0, 2) : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить дашборд");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void loadData();
    }, [loadData]),
  );

  const summary = insights?.summary;
  const income = Number(summary?.totalIncome || 0);
  const expense = Number(summary?.totalExpenses || 0);
  const grossBalance = Number(summary?.netSavings || income - expense || 0);
  const reservedInGoals = (Array.isArray(insights?.goals) ? insights.goals : []).reduce(
    (sum, goal) => sum + Number(goal.currentAmount || 0),
    0,
  );
  const balance = grossBalance - reservedInGoals;
  const savingsRate = income > 0 ? Math.round(((income - expense) / income) * 100) : 0;

  const categories = useMemo(
    () =>
      (Array.isArray(insights?.categories) ? insights.categories : [])
        .filter((item) => Number(item.amount) > 0)
        .slice(0, 5)
        .map((item, index) => ({
          id: item.categoryId || `category-${index}`,
          name: item.categoryName || "Без категории",
          amount: Number(item.amount || 0),
          percent: Math.round(Number(item.percentage || 0)),
          color: palette[index % palette.length],
        })),
    [insights],
  );

  const topSignals = [
    ...(Array.isArray(insights?.anomalies) ? insights.anomalies : []).slice(0, 1).map((item) => ({
      id: `anomaly-${item.title || item.type}`,
      title: item.title || "Проверьте необычную трату",
      text: item.description || "Сумма отличается от обычного поведения в категории.",
      icon: "alert-triangle",
      gradient: ["#EF4444", "#F97316"],
    })),
    ...recommendations.map((item) => ({
      id: item.id || item.title,
      title: item.title || "Рекомендация FinApp",
      text: item.description || "Посмотрите, где можно снизить расходы.",
      icon: "zap",
      gradient: ["#6B46C1", "#8B5CF6"],
    })),
  ].slice(0, 2);

  const topPt = Platform.OS === "web" ? 42 : insets.top;

  return (
    <ScrollView style={[styles.scroll, { backgroundColor: colors.background }]} contentContainerStyle={{ paddingBottom: 118 }} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={gradients.success} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.header, { paddingTop: topPt + 16 }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Доброе утро</Text>
            <Text style={styles.username} numberOfLines={1}>{user?.full_name || user?.email || "FinApp"}</Text>
          </View>
          <Pressable style={styles.avatar} onPress={() => navigation.getParent()?.navigate("Profile")}>
            <Text style={styles.avatarText}>{initials(user?.full_name || user?.email)}</Text>
          </Pressable>
        </View>

        <View style={styles.balanceBlock}>
          <Text style={styles.balanceLabel}>Общий баланс</Text>
          <Text style={styles.balanceAmount}>{formatMoney(balance, { cents: true })}</Text>
        </View>

        <View style={styles.statsRow}>
          <Metric icon="arrow-down-left" label="Доходы" value={formatShort(income, formatMoney)} color="#A8E6CF" />
          <View style={styles.statDivider} />
          <Metric icon="arrow-up-right" label="Расходы" value={formatShort(expense, formatMoney)} color="#FCA5A5" />
          <View style={styles.statDivider} />
          <Metric icon="percent" label="Сбережения" value={`${savingsRate}%`} color={savingsRate >= 0 ? "#A8E6CF" : "#FCA5A5"} />
        </View>
      </LinearGradient>

      <View style={[styles.body, { backgroundColor: colors.background }]}>
        {loading ? <ActivityIndicator color={colors.primary} size="large" style={styles.loader} /> : null}
        {error ? (
          <Pressable style={[styles.errorCard, { backgroundColor: colors.surfaceAlt }]} onPress={() => void loadData()}>
            <Feather name="refresh-cw" size={18} color={colors.primary} />
            <Text style={[styles.errorText, { color: colors.text }]}>{error}</Text>
          </Pressable>
        ) : null}

        <SectionTitle title="Быстрый доступ" />
        <View style={styles.quickActions}>
          {quickActions.map((action) => (
            <Pressable key={action.label} style={styles.quickAction} onPress={() => action.target === "GoalsTab" ? navigation.getParent()?.navigate("Goals") : navigation.navigate(action.target)}>
              <LinearGradient colors={action.gradient} style={styles.quickIcon}>
                <Feather name={action.icon} size={20} color="#FFFFFF" />
              </LinearGradient>
              <Text style={[styles.quickLabel, { color: colors.text }]}>{action.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <SectionTitle title="За этот месяц" />
          <Pressable onPress={() => navigation.navigate("Analytics")}>
            <Text style={[styles.seeAll, { color: colors.primary }]}>Подробнее</Text>
          </Pressable>
        </View>
        <View style={[styles.chartCard, { backgroundColor: colors.surface }]}>
          <LinearGradient colors={gradients.success} style={styles.chartGradient}>
            <DonutChart data={categories} total={expense} formatMoney={formatMoney} />
          </LinearGradient>
          <View style={styles.legend}>
            {categories.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>Добавьте транзакции, чтобы увидеть структуру расходов.</Text>
            ) : (
              categories.map((item) => (
                <View key={item.id} style={styles.legendRow}>
                  <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                  <Text style={[styles.legendName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                  <Text style={[styles.legendPct, { color: colors.textMuted }]}>{item.percent}%</Text>
                </View>
              ))
            )}
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <SectionTitle title="Последние" />
          <Pressable onPress={() => navigation.getParent()?.navigate("Transactions")}>
            <Text style={[styles.seeAll, { color: colors.primary }]}>Все</Text>
          </Pressable>
        </View>
        {transactions.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface }]}>
            <Feather name="inbox" size={30} color={colors.border} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>Нажмите на микрофон, чтобы добавить первую транзакцию</Text>
          </View>
        ) : (
          transactions.map((item) => <TransactionRow key={item.id} item={item} />)
        )}

        <SectionTitle title="Советы" />
        {(topSignals.length ? topSignals : fallbackSignals).map((item) => (
          <Pressable key={item.id} style={[styles.tipCard, { backgroundColor: colors.surfaceAlt }]} onPress={() => navigation.navigate("Analytics")}>
            <LinearGradient colors={item.gradient} style={styles.tipIcon}>
              <Feather name={item.icon} size={16} color="#FFFFFF" />
            </LinearGradient>
            <View style={styles.tipText}>
              <Text style={[styles.tipTitle, { color: colors.text }]}>{item.title}</Text>
              <Text style={[styles.tipBody, { color: colors.textMuted }]} numberOfLines={2}>{item.text}</Text>
            </View>
            <Feather name="chevron-right" size={16} color={colors.textMuted} />
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

function Metric({ icon, label, value, color }) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statIcon}>
        <Feather name={icon} size={14} color={color} />
      </View>
      <View>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={[styles.statValue, { color }]}>{value}</Text>
      </View>
    </View>
  );
}

function SectionTitle({ title }: { title: string }) {
  const { colors } = useAppTheme();
  return <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>;
}

function DonutChart({ data, total, formatMoney }) {
  const size = 132;
  const stroke = 16;
  const radius = (size - stroke) / 2;
  const circumference = radius * Math.PI * 2;
  let offset = 0;
  return (
    <View style={styles.donutWrap}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke="rgba(255,255,255,0.22)" strokeWidth={stroke} fill="none" />
        {data.map((item) => {
          const dash = total > 0 ? (item.amount / total) * circumference : 0;
          const circle = (
            <Circle key={item.id} cx={size / 2} cy={size / 2} r={radius} stroke={item.color} strokeWidth={stroke} strokeDasharray={`${dash} ${circumference - dash}`} strokeDashoffset={-offset} strokeLinecap="round" fill="none" transform={`rotate(-90 ${size / 2} ${size / 2})`} />
          );
          offset += dash;
          return circle;
        })}
      </Svg>
      <View style={styles.donutCenter}>
        <Text style={styles.donutValue}>{formatShort(total, formatMoney)}</Text>
        <Text style={styles.donutLabel}>расходы</Text>
      </View>
    </View>
  );
}

function TransactionRow({ item }) {
  const { colors } = useAppTheme();
  const { formatMoney } = useAppSettings();
  const isIncome = item.type === "INCOME";
  return (
    <View style={[styles.txRow, { backgroundColor: colors.surface }]}>
      <View style={[styles.txIcon, { backgroundColor: colors.surfaceAlt }]}>
        <Feather name={isIncome ? "arrow-down-left" : item.is_recurring ? "repeat" : "shopping-bag"} size={18} color={colors.primary} />
      </View>
      <View style={styles.txText}>
        <Text style={[styles.txTitle, { color: colors.text }]} numberOfLines={1}>{item.description || item.original_description || "Транзакция"}</Text>
        <Text style={[styles.txMeta, { color: colors.textMuted }]}>{isIncome ? "Доход" : item.is_recurring ? "Подписка" : "Расход"}</Text>
      </View>
      <Text style={[styles.txAmount, { color: isIncome ? colors.success : colors.danger }]}>{formatMoney(isIncome ? item.amount : -item.amount, { sign: true })}</Text>
    </View>
  );
}

function initials(value?: string) {
  return (value || "FA").trim().slice(0, 2).toUpperCase();
}

function formatShort(value: number, formatMoney: (value: number) => string) {
  const amount = Math.abs(Number(value || 0));
  return formatMoney(amount);
}

const palette = ["#F97316", "#3B82F6", "#EC4899", "#8B5CF6", "#10B981"];
const fallbackSignals = [
  { id: "plan", title: "Вы в рамках плана", text: "Расходы ниже среднего уровня. Продолжайте отслеживать категории.", icon: "zap", gradient: ["#6B46C1", "#8B5CF6"] },
  { id: "subs", title: "Проверьте подписки", text: "FinApp найдёт регулярные списания и покажет индекс использования.", icon: "repeat", gradient: ["#059669", "#7ED9B6"] },
];

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 32 },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  greeting: { fontSize: 13, color: "rgba(255,255,255,0.72)", fontFamily: "Inter_400Regular" },
  username: { maxWidth: 260, fontSize: 20, color: "#FFFFFF", fontFamily: "Inter_700Bold" },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#A8E6CF", alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 14, color: "#1A1A2E", fontFamily: "Inter_700Bold" },
  balanceBlock: { alignItems: "center", marginBottom: 24 },
  balanceLabel: { fontSize: 13, color: "rgba(255,255,255,0.72)", fontFamily: "Inter_400Regular", marginBottom: 6 },
  balanceAmount: { fontSize: 34, color: "#FFFFFF", fontFamily: "Inter_700Bold" },
  statsRow: { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 16, padding: 14, gap: 8 },
  statCard: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  statIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  statLabel: { fontSize: 10, color: "rgba(255,255,255,0.65)", fontFamily: "Inter_400Regular" },
  statValue: { fontSize: 13, fontFamily: "Inter_700Bold" },
  statDivider: { width: 1, height: "100%", backgroundColor: "rgba(255,255,255,0.2)" },
  body: { marginTop: -16, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 24, paddingHorizontal: 20, gap: 14 },
  loader: { marginVertical: 20 },
  sectionTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  seeAll: { fontSize: 14, fontFamily: "Inter_500Medium" },
  quickActions: { flexDirection: "row", gap: 12, marginBottom: 6 },
  quickAction: { flex: 1, alignItems: "center", gap: 8 },
  quickIcon: { width: 54, height: 54, borderRadius: 27, alignItems: "center", justifyContent: "center" },
  quickLabel: { fontSize: 11, fontFamily: "Inter_500Medium", textAlign: "center" },
  chartCard: { borderRadius: 20, padding: 18, flexDirection: "row", alignItems: "center", gap: 18 },
  chartGradient: { width: 140, height: 140, borderRadius: 70, alignItems: "center", justifyContent: "center" },
  donutWrap: { width: 132, height: 132, alignItems: "center", justifyContent: "center" },
  donutCenter: { position: "absolute", alignItems: "center" },
  donutValue: { color: "#FFFFFF", fontSize: 16, fontFamily: "Inter_700Bold" },
  donutLabel: { color: "rgba(255,255,255,0.75)", fontSize: 11, fontFamily: "Inter_500Medium" },
  legend: { flex: 1, gap: 10 },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendName: { flex: 1, fontSize: 12, fontFamily: "Inter_500Medium" },
  legendPct: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  txRow: { minHeight: 64, borderRadius: 16, padding: 12, flexDirection: "row", alignItems: "center", gap: 12 },
  txIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  txText: { flex: 1, gap: 2 },
  txTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  txMeta: { fontSize: 12, fontFamily: "Inter_400Regular" },
  txAmount: { fontSize: 14, fontFamily: "Inter_700Bold" },
  tipCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14 },
  tipIcon: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  tipText: { flex: 1, gap: 2 },
  tipTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  tipBody: { fontSize: 12, lineHeight: 18, fontFamily: "Inter_400Regular" },
  emptyCard: { borderRadius: 16, padding: 24, alignItems: "center", gap: 10 },
  emptyText: { fontSize: 13, lineHeight: 19, fontFamily: "Inter_400Regular", textAlign: "center" },
  errorCard: { borderRadius: 14, padding: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  errorText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
});
