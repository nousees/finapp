import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { Circle, G, Rect, Text as SvgText } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DashboardStackParamList } from "@app/navigation/types";
import {
  CashflowPoint,
  CategoryInsight,
  FinancialInsight,
  getFinancialInsights,
  listRecommendations,
  Recommendation,
} from "@shared/api/analysis";
import { ApiTransaction, listTransactions } from "@shared/api/transactions";
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
  const [insights, setInsights] = useState<FinancialInsight | null>(null);
  const [transactions, setTransactions] = useState<ApiTransaction[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
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
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Не удалось загрузить аналитику",
      );
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
  const income = Number(
    summary?.totalIncome || totalByType(transactions, "INCOME"),
  );
  const expense = Number(
    summary?.totalExpenses || totalByType(transactions, "EXPENSE"),
  );
  const savingsRate =
    income > 0 ? Math.round(((income - expense) / income) * 100) : 0;
  const categories = useMemo(
    () => normalizeCategories(insights?.categories, transactions),
    [insights, transactions],
  );
  const bars = useMemo(
    () => buildBars(transactions, period, insights?.cashflow),
    [transactions, period, insights],
  );
  const financialHealth = useMemo(
    () =>
      buildFinancialHealth({
        income,
        expense,
        savingsRate,
        transactions,
        period,
      }),
    [expense, income, period, savingsRate, transactions],
  );
  const monthlyForecast = useMemo(
    () => buildMonthlyForecast({ income, expense, transactions }),
    [expense, income, transactions],
  );
  const topExpenses = (Array.isArray(transactions) ? transactions : [])
    .filter((item) => item.type === "EXPENSE")
    .sort((a, b) => Number(b.amount) - Number(a.amount))
    .slice(0, 5);
  const topPt = Platform.OS === "web" ? 42 : insets.top;

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.nav, { paddingTop: topPt + 8 }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={[styles.backBtn, { backgroundColor: colors.backgroundAlt }]}
        >
          <Feather name="arrow-left" size={20} color={colors.text} />
        </Pressable>
        <Text style={[styles.navTitle, { color: colors.text }]}>Аналитика</Text>
        <Pressable
          onPress={handleRefresh}
          style={[styles.backBtn, { backgroundColor: colors.backgroundAlt }]}
        >
          <Feather name="refresh-cw" size={18} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.body,
          { paddingBottom: 120 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.periodRow}>
          {PERIODS.map((item) => (
            <Pressable key={item.id} onPress={() => setPeriod(item.id)}>
              {period === item.id ? (
                <LinearGradient
                  colors={gradients.successDeep}
                  style={styles.periodChip}
                >
                  <Text style={styles.periodActiveText}>{item.label}</Text>
                </LinearGradient>
              ) : (
                <View
                  style={[
                    styles.periodChip,
                    { backgroundColor: colors.backgroundAlt },
                  ]}
                >
                  <Text
                    style={[styles.periodText, { color: colors.textMuted }]}
                  >
                    {item.label}
                  </Text>
                </View>
              )}
            </Pressable>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} size="large" />
        ) : null}
        {error ? (
          <Pressable
            style={[styles.errorCard, { backgroundColor: colors.surfaceAlt }]}
            onPress={() => void loadData()}
          >
            <Feather name="refresh-cw" size={16} color={colors.primary} />
            <Text style={[styles.errorText, { color: colors.text }]}>
              {error}
            </Text>
          </Pressable>
        ) : null}

        <View style={styles.statsRow}>
          <StatCard
            icon="arrow-down-left"
            label="Доходы"
            value={formatMoney(income)}
            color={colors.success}
          />
          <StatCard
            icon="arrow-up-right"
            label="Расходы"
            value={formatMoney(expense)}
            color={colors.danger}
          />
          <StatCard
            icon="percent"
            label="Сбережения"
            value={`${savingsRate}%`}
            color={savingsRate >= 0 ? colors.success : colors.danger}
          />
        </View>

        <FinancialHealthCard
          health={financialHealth}
          formatMoney={formatMoney}
        />

        <MonthlyForecastCard
          forecast={monthlyForecast}
          formatMoney={formatMoney}
        />

        <View style={[styles.chartCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.chartTitle, { color: colors.text }]}>
            Доходы и расходы
          </Text>
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
            <Text style={[styles.chartTitle, { color: colors.text }]}>
              По категориям
            </Text>
            <View style={styles.categoryList}>
              {categories.map((item) => (
                <View key={item.name} style={styles.categoryRow}>
                  <View
                    style={[styles.catDot, { backgroundColor: item.color }]}
                  />
                  <Text
                    style={[styles.catName, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                  <Text style={[styles.catAmount, { color: colors.textMuted }]}>
                    {formatMoney(item.amount)}
                  </Text>
                  <Text style={[styles.catPct, { color: colors.primary }]}>
                    {item.percent}%
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <View
          style={[styles.insightCard, { backgroundColor: colors.surfaceAlt }]}
        >
          <LinearGradient
            colors={gradients.successDeep}
            style={styles.insightIcon}
          >
            <Feather name="zap" size={16} color="#FFFFFF" />
          </LinearGradient>
          <View style={styles.insightText}>
            <Text style={[styles.insightTitle, { color: colors.text }]}>
              Финансовый совет
            </Text>
            <Text style={[styles.insightBody, { color: colors.textMuted }]}>
              {recommendations[0]?.description ||
                (savingsRate >= 20
                  ? "Отлично: вы сохраняете больше 20% доходов. Можно усилить цели или резервный фонд."
                  : "Попробуйте снизить регулярные расходы и проверить подписки, чтобы увеличить долю сбережений.")}
            </Text>
          </View>
        </View>

        <View style={[styles.chartCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.chartTitle, { color: colors.text }]}>
            Топ расходов
          </Text>
          {topExpenses.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              Пока нет расходов для рейтинга.
            </Text>
          ) : (
            topExpenses.map((item, index) => (
              <View
                key={item.id}
                style={[
                  styles.topRow,
                  index > 0
                    ? {
                        borderTopColor: colors.border,
                        borderTopWidth: StyleSheet.hairlineWidth,
                      }
                    : null,
                ]}
              >
                <Text style={[styles.topNum, { color: colors.textMuted }]}>
                  #{index + 1}
                </Text>
                <View
                  style={[
                    styles.topIcon,
                    { backgroundColor: `${colors.primary}20` },
                  ]}
                >
                  <Feather
                    name={item.is_recurring ? "repeat" : "shopping-bag"}
                    size={14}
                    color={colors.primary}
                  />
                </View>
                <Text
                  style={[styles.topName, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {item.description || item.original_description || "Расход"}
                </Text>
                <Text style={[styles.topAmount, { color: colors.danger }]}>
                  {formatMoney(item.amount)}
                </Text>
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
      <Text style={[styles.statLabel, { color: colors.textMuted }]}>
        {label}
      </Text>
      <Text style={[styles.statValue, { color }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function LegendDot({ color, label }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={[styles.legendText, { color: colors.textMuted }]}>
        {label}
      </Text>
    </View>
  );
}

function FinancialHealthCard({ health, formatMoney }) {
  const scoreColor =
    health.score >= 70 ? "#A8E6CF" : health.score >= 55 ? "#FDE68A" : "#FCA5A5";

  return (
    <LinearGradient
      colors={["#2E1065", "#6B46C1", "#8B5CF6"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.healthCard}
    >
      <View style={styles.healthGlow} />
      <View style={styles.healthHeader}>
        <View style={styles.healthCopy}>
          <Text style={styles.healthEyebrow}>Финансовое здоровье</Text>
          <Text style={styles.healthStatus}>{health.status}</Text>
          <Text style={styles.healthSummary}>{health.summary}</Text>
        </View>
        <ScoreRing score={health.score} color={scoreColor} />
      </View>

      <View style={styles.healthFactorGrid}>
        {health.factors.map((factor) => (
          <View key={factor.id} style={styles.healthFactorCard}>
            <View
              style={[
                styles.healthFactorIcon,
                { backgroundColor: `${factor.color}24` },
              ]}
            >
              <Feather
                name={factor.icon as any}
                size={15}
                color={factor.color}
              />
            </View>
            <View style={styles.healthFactorCopy}>
              <Text style={styles.healthFactorLabel}>{factor.label}</Text>
              <Text style={styles.healthFactorValue}>{factor.value}</Text>
              <Text style={styles.healthFactorDetail} numberOfLines={2}>
                {factor.detail}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.healthForecast}>
        <View style={styles.healthForecastIcon}>
          <Feather name="trending-up" size={15} color="#1A1A2E" />
        </View>
        <Text style={styles.healthForecastText}>
          Если темп сохранится, расходы периода составят около{" "}
          {formatMoney(health.projectedExpense)}.
        </Text>
      </View>
    </LinearGradient>
  );
}

function ScoreRing({ score, color }) {
  const size = 118;
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(score, 100)) / 100;

  return (
    <View style={styles.scoreRingWrap}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255,255,255,0.18)"
          strokeWidth={stroke}
          fill="transparent"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          fill="transparent"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - progress)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.scoreRingCenter}>
        <Text style={styles.scoreValue}>{score}</Text>
        <Text style={styles.scoreMax}>/100</Text>
      </View>
    </View>
  );
}

function MonthlyForecastCard({
  forecast,
  formatMoney,
}: {
  forecast: MonthlyForecast;
  formatMoney: (value: number) => string;
}) {
  const { colors } = useAppTheme();
  const riskColor =
    forecast.risk === "green"
      ? colors.success
      : forecast.risk === "yellow"
        ? colors.warning
        : colors.danger;
  const riskLabel =
    forecast.risk === "green"
      ? "В норме"
      : forecast.risk === "yellow"
        ? "Следить"
        : "Риск перерасхода";

  return (
    <View style={[styles.forecastCard, { backgroundColor: colors.surface }]}>
      <View style={styles.forecastHeader}>
        <View style={styles.forecastTitleWrap}>
          <Text style={[styles.forecastEyebrow, { color: colors.textMuted }]}>
            Прогноз до конца месяца
          </Text>
          <Text style={[styles.forecastTitle, { color: colors.text }]}>
            Что будет, если темп сохранится
          </Text>
        </View>
        <View
          style={[
            styles.forecastRiskBadge,
            { backgroundColor: `${riskColor}18` },
          ]}
        >
          <View
            style={[styles.forecastRiskDot, { backgroundColor: riskColor }]}
          />
          <Text style={[styles.forecastRiskText, { color: riskColor }]}>
            {riskLabel}
          </Text>
        </View>
      </View>

      <View style={styles.forecastMetrics}>
        <ForecastMetric
          icon="trending-up"
          label="Прогноз расходов"
          value={formatMoney(forecast.projectedExpense)}
          color={colors.danger}
        />
        <ForecastMetric
          icon="credit-card"
          label="Ожидаемый остаток"
          value={formatMoney(forecast.expectedBalance)}
          color={forecast.expectedBalance >= 0 ? colors.success : colors.danger}
        />
      </View>

      <View
        style={[
          styles.forecastPaceCard,
          { backgroundColor: colors.backgroundAlt },
        ]}
      >
        <View
          style={[
            styles.forecastPaceIcon,
            { backgroundColor: `${riskColor}18` },
          ]}
        >
          <Feather
            name={forecast.paceDeltaPercent > 0 ? "activity" : "check-circle"}
            size={16}
            color={riskColor}
          />
        </View>
        <View style={styles.forecastPaceCopy}>
          <Text style={[styles.forecastPaceTitle, { color: colors.text }]}>
            {forecast.paceText}
          </Text>
          <Text
            style={[styles.forecastPaceDetail, { color: colors.textMuted }]}
          >
            {forecast.detail}
          </Text>
        </View>
      </View>
    </View>
  );
}

function ForecastMetric({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: string;
  color: string;
}) {
  const { colors } = useAppTheme();
  return (
    <View
      style={[styles.forecastMetric, { backgroundColor: colors.backgroundAlt }]}
    >
      <View
        style={[styles.forecastMetricIcon, { backgroundColor: `${color}18` }]}
      >
        <Feather name={icon as any} size={15} color={color} />
      </View>
      <Text style={[styles.forecastMetricLabel, { color: colors.textMuted }]}>
        {label}
      </Text>
      <Text style={[styles.forecastMetricValue, { color }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function BarChart({ data }) {
  const { colors } = useAppTheme();
  const chartW = 300;
  const chartH = 140;
  const barW = Math.min(24, chartW / data.length / 3);
  const gap = (chartW - barW * 2 * data.length) / (data.length + 1);
  const maxVal = Math.max(
    ...data.flatMap((item) => [item.income, item.expense]),
    1,
  );

  return (
    <Svg width={chartW} height={chartH + 24}>
      <G>
        {data.map((item, index) => {
          const x = gap + index * (barW * 2 + gap);
          const incomeHeight = (item.income / maxVal) * chartH;
          const expenseHeight = (item.expense / maxVal) * chartH;
          return (
            <G key={`${item.label}-${index}`}>
              <Rect
                x={x}
                y={chartH - incomeHeight}
                width={barW}
                height={Math.max(incomeHeight, 2)}
                rx={4}
                fill="#7ED9B6"
              />
              <Rect
                x={x + barW + 2}
                y={chartH - expenseHeight}
                width={barW}
                height={Math.max(expenseHeight, 2)}
                rx={4}
                fill="#8B5CF6"
              />
              <SvgText
                x={x + barW}
                y={chartH + 18}
                textAnchor="middle"
                fontSize={10}
                fill={colors.textMuted}
                fontFamily="Inter_400Regular"
              >
                {item.label}
              </SvgText>
            </G>
          );
        })}
      </G>
    </Svg>
  );
}

type FinancialHealthFactor = {
  id: string;
  icon: string;
  label: string;
  value: string;
  detail: string;
  color: string;
};

type FinancialHealth = {
  score: number;
  status: string;
  summary: string;
  projectedExpense: number;
  factors: FinancialHealthFactor[];
};

type MonthlyForecast = {
  projectedExpense: number;
  expectedBalance: number;
  paceDeltaPercent: number;
  paceText: string;
  detail: string;
  risk: "green" | "yellow" | "red";
};

function buildMonthlyForecast({
  income,
  expense,
  transactions,
}: {
  income: number;
  expense: number;
  transactions: ApiTransaction[];
}): MonthlyForecast {
  const items = Array.isArray(transactions) ? transactions : [];
  const currentRange = getPeriodRange("month", 0);
  const previousRange = getPeriodRange("month", -1);
  const currentItems = filterTransactionsByDate(items, currentRange);
  const previousItems = filterTransactionsByDate(items, previousRange);
  const currentIncome = totalByType(currentItems, "INCOME") || income;
  const currentExpense = totalByType(currentItems, "EXPENSE") || expense;
  const previousExpense = totalByType(previousItems, "EXPENSE");
  const projectedExpense =
    currentItems.length > 0
      ? projectExpense(currentExpense, currentRange, "month")
      : currentExpense;
  const expectedBalance = currentIncome - projectedExpense;
  const elapsedDays = getElapsedDaysInRange(currentRange);
  const currentDailyExpense = currentExpense / elapsedDays;
  const baselineDailyExpense = getForecastBaselineDailyExpense({
    currentIncome,
    previousExpense,
    range: currentRange,
  });
  const paceDeltaPercent =
    baselineDailyExpense > 0
      ? Math.round(
          ((currentDailyExpense - baselineDailyExpense) /
            baselineDailyExpense) *
            100,
        )
      : 0;
  const risk =
    expectedBalance < 0 || paceDeltaPercent > 25
      ? "red"
      : expectedBalance < currentIncome * 0.1 || paceDeltaPercent > 10
        ? "yellow"
        : "green";
  const paceText =
    paceDeltaPercent > 0
      ? `Темп расходов выше нормы на ${paceDeltaPercent}%`
      : paceDeltaPercent < 0
        ? `Темп расходов ниже нормы на ${Math.abs(paceDeltaPercent)}%`
        : "Темп расходов в пределах нормы";
  const detail =
    previousExpense > 0
      ? "Норма рассчитана по прошлому месяцу."
      : "Норма рассчитана от безопасного уровня расходов — до 80% доходов.";

  return {
    projectedExpense,
    expectedBalance,
    paceDeltaPercent,
    paceText,
    detail,
    risk,
  };
}

function getElapsedDaysInRange(range: { start: Date; end: Date }) {
  const now = new Date();
  if (now < range.start) return 1;
  if (now > range.end)
    return Math.max(
      1,
      Math.ceil((range.end.getTime() - range.start.getTime()) / 86400000) + 1,
    );
  return Math.max(
    1,
    Math.ceil((startOfDay(now).getTime() - range.start.getTime()) / 86400000) +
      1,
  );
}

function getForecastBaselineDailyExpense({
  currentIncome,
  previousExpense,
  range,
}: {
  currentIncome: number;
  previousExpense: number;
  range: { start: Date; end: Date };
}) {
  if (previousExpense > 0) {
    const previousMonthDays = Math.max(
      1,
      new Date(range.start.getFullYear(), range.start.getMonth(), 0).getDate(),
    );
    return previousExpense / previousMonthDays;
  }
  const daysInMonth = Math.max(
    1,
    Math.ceil((range.end.getTime() - range.start.getTime()) / 86400000) + 1,
  );
  return currentIncome > 0 ? (currentIncome * 0.8) / daysInMonth : 0;
}

function buildFinancialHealth({
  income,
  expense,
  savingsRate,
  transactions,
  period,
}) {
  const items = Array.isArray(transactions) ? transactions : [];
  const currentRange = getPeriodRange(period, 0);
  const previousRange = getPeriodRange(period, -1);
  const currentItems = filterTransactionsByDate(items, currentRange);
  const previousItems = filterTransactionsByDate(items, previousRange);
  const hasCurrentPeriodData = currentItems.length > 0;
  const periodIncome = hasCurrentPeriodData
    ? totalByType(currentItems, "INCOME")
    : income;
  const periodExpense = hasCurrentPeriodData
    ? totalByType(currentItems, "EXPENSE")
    : expense;
  const previousExpense = totalByType(previousItems, "EXPENSE");
  const currentSavingsRate =
    periodIncome > 0
      ? Math.round(((periodIncome - periodExpense) / periodIncome) * 100)
      : savingsRate;
  const largestExpense = currentItems
    .filter((item) => item.type === "EXPENSE")
    .sort((a, b) => Number(b.amount) - Number(a.amount))[0];
  const largestExpenseAmount = Number(largestExpense?.amount || 0);
  const recurringExpense = currentItems
    .filter((item) => item.type === "EXPENSE" && item.is_recurring)
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const expenseTrend =
    previousExpense > 0
      ? Math.round(((periodExpense - previousExpense) / previousExpense) * 100)
      : periodExpense > 0
        ? 100
        : 0;
  const projectedExpense = hasCurrentPeriodData
    ? projectExpense(periodExpense, currentRange, period)
    : periodExpense;
  const incomeBase = Math.max(periodIncome, income, 1);
  const expenseRatio =
    periodIncome > 0
      ? periodExpense / periodIncome
      : periodExpense > 0
        ? 1.2
        : 0;
  const largeExpenseRatio = largestExpenseAmount / incomeBase;
  const recurringRatio =
    periodExpense > 0 ? recurringExpense / periodExpense : 0;
  const riskPenalty =
    (largeExpenseRatio > 0.35 ? 8 : 0) + (recurringRatio > 0.3 ? 5 : 0);
  const score = clampScore(
    50 +
      scoreSavings(currentSavingsRate) +
      scoreBalance(expenseRatio) +
      scoreTrend(expenseTrend) +
      (riskPenalty === 0 ? 5 : -riskPenalty),
  );
  const status = getHealthStatus(score);
  const balanceDetail =
    periodIncome > 0
      ? `Расходы занимают ${Math.round(expenseRatio * 100)}% доходов.`
      : "Доходов за период пока не найдено.";
  const riskDetail =
    largestExpenseAmount > 0 || recurringExpense > 0
      ? buildRiskDetail(largestExpenseAmount, recurringExpense, periodExpense)
      : "Крупных и регулярных расходов не видно.";

  return {
    score,
    status: status.label,
    summary: buildHealthSummary(
      currentSavingsRate,
      expenseTrend,
      riskPenalty,
      status.label,
    ),
    projectedExpense,
    factors: [
      {
        id: "savings",
        icon: "shield",
        label: "Доля сбережений",
        value: `${currentSavingsRate}%`,
        detail:
          currentSavingsRate >= 20
            ? "Отличный запас для целей и резерва."
            : currentSavingsRate >= 0
              ? "Есть запас, но его можно усилить."
              : "Расходы выше доходов — нужен контроль.",
        color:
          currentSavingsRate >= 20
            ? "#A8E6CF"
            : currentSavingsRate >= 0
              ? "#FDE68A"
              : "#FCA5A5",
      },
      {
        id: "balance",
        icon: "pie-chart",
        label: "Баланс",
        value:
          periodIncome > 0
            ? `${Math.round(expenseRatio * 100)}%`
            : "нет доходов",
        detail: balanceDetail,
        color:
          expenseRatio <= 0.8
            ? "#A8E6CF"
            : expenseRatio <= 1
              ? "#FDE68A"
              : "#FCA5A5",
      },
      {
        id: "risk",
        icon: recurringRatio > 0.3 ? "repeat" : "alert-triangle",
        label: "Крупные траты",
        value: riskPenalty === 0 ? "низкий риск" : "проверьте",
        detail: riskDetail,
        color: riskPenalty === 0 ? "#A8E6CF" : "#FDE68A",
      },
      {
        id: "trend",
        icon: expenseTrend <= 0 ? "trending-down" : "trending-up",
        label: "Динамика",
        value:
          previousExpense > 0
            ? `${expenseTrend > 0 ? "+" : ""}${expenseTrend}%`
            : "новый период",
        detail:
          previousExpense > 0
            ? expenseTrend <= 0
              ? "Расходы ниже прошлого периода."
              : "Расходы выше прошлого периода."
            : "Недостаточно данных для сравнения.",
        color:
          expenseTrend <= 5
            ? "#A8E6CF"
            : expenseTrend <= 20
              ? "#FDE68A"
              : "#FCA5A5",
      },
    ],
  };
}

function scoreSavings(savingsRate) {
  if (savingsRate >= 30) return 25;
  if (savingsRate >= 20) return 20;
  if (savingsRate >= 10) return 12;
  if (savingsRate >= 0) return 4;
  return -15;
}

function scoreBalance(expenseRatio) {
  if (expenseRatio <= 0.7) return 15;
  if (expenseRatio <= 0.9) return 8;
  if (expenseRatio <= 1) return 0;
  return -10;
}

function scoreTrend(expenseTrend) {
  if (expenseTrend <= -10) return 8;
  if (expenseTrend <= 5) return 4;
  if (expenseTrend <= 20) return -2;
  return -8;
}

function getHealthStatus(score) {
  if (score >= 85) return { label: "Отличное" };
  if (score >= 70) return { label: "Хорошее" };
  if (score >= 55) return { label: "Стабильное" };
  if (score >= 40) return { label: "Требует внимания" };
  return { label: "Зона риска" };
}

function buildHealthSummary(savingsRate, expenseTrend, riskPenalty, status) {
  const savingsText = `Сбережения ${savingsRate}%`;
  if (status === "Отличное" || status === "Хорошее") {
    return `${savingsText}, расходы под контролем. Продолжайте держать темп и усиливайте цели.`;
  }
  if (expenseTrend > 20) {
    return `${savingsText}, но расходы заметно выросли к прошлому периоду. Проверьте крупные покупки и подписки.`;
  }
  if (riskPenalty > 0) {
    return `${savingsText}. Есть крупные или регулярные траты — стоит проверить, все ли они нужны.`;
  }
  return `${savingsText}. Баланс можно улучшить: сократите необязательные расходы и зафиксируйте лимиты.`;
}

function buildRiskDetail(
  largestExpenseAmount,
  recurringExpense,
  periodExpense,
) {
  const parts = [];
  if (largestExpenseAmount > 0)
    parts.push(`крупная операция ${formatCompactNumber(largestExpenseAmount)}`);
  if (recurringExpense > 0)
    parts.push(
      `регулярные ${Math.round((recurringExpense / Math.max(periodExpense, 1)) * 100)}% расходов`,
    );
  return parts.length > 0
    ? parts.join(" · ")
    : "Крупных и регулярных расходов не видно.";
}

function projectExpense(periodExpense, range, period) {
  if (period === "week") return periodExpense;
  const now = new Date();
  if (now < range.start || now > range.end) return periodExpense;
  const elapsedDays = Math.max(
    1,
    Math.ceil((startOfDay(now).getTime() - range.start.getTime()) / 86400000) +
      1,
  );
  const totalDays = Math.max(
    1,
    Math.ceil((range.end.getTime() - range.start.getTime()) / 86400000) + 1,
  );
  return Math.round((periodExpense / elapsedDays) * totalDays);
}

function getPeriodRange(period: Period, offset = 0) {
  const now = new Date();
  if (period === "week") {
    const end = startOfDay(now);
    end.setDate(end.getDate() + offset * 7);
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    return { start, end: endOfDay(end) };
  }
  if (period === "year") {
    const year = now.getFullYear() + offset;
    return {
      start: new Date(year, 0, 1),
      end: endOfDay(new Date(year, 11, 31)),
    };
  }
  const monthStart = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);
  return { start: monthStart, end: endOfDay(monthEnd) };
}

function filterTransactionsByDate(transactions, range) {
  return transactions.filter((item) => {
    const date = new Date(item.date);
    if (Number.isNaN(date.getTime())) return false;
    return date >= range.start && date <= range.end;
  });
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfDay(date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function formatCompactNumber(value) {
  const amount = Math.abs(Number(value || 0));
  if (amount >= 1000000) return `${Math.round(amount / 10000) / 100} млн`;
  if (amount >= 1000) return `${Math.round(amount / 100) / 10} тыс.`;
  return String(Math.round(amount));
}

function totalByType(transactions, type) {
  return transactions
    .filter((item) => item.type === type)
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
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
    return cashflow
      .slice(period === "week" ? -7 : period === "year" ? -6 : -5)
      .map((item) => ({
        label: new Date(item.date).toLocaleDateString(
          "ru-RU",
          period === "year"
            ? { month: "short" }
            : { day: "numeric", month: "short" },
        ),
        income: Number(item.income || 0),
        expense: Number(item.expenses || 0),
      }));
  }
  const count = period === "week" ? 7 : period === "year" ? 6 : 5;
  const labels =
    period === "week"
      ? ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]
      : period === "year"
        ? ["2021", "2022", "2023", "2024", "2025", "2026"]
        : ["Янв", "Фев", "Мар", "Апр", "Май"];
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
  navTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  body: { paddingHorizontal: 20, gap: 14 },
  periodRow: { flexDirection: "row", gap: 8 },
  periodChip: {
    minHeight: 36,
    paddingHorizontal: 16,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  periodText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  periodActiveText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  statsRow: { flexDirection: "row", gap: 10 },
  statCard: { flex: 1, borderRadius: 16, padding: 12, gap: 6 },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  statValue: { fontSize: 13, fontFamily: "Inter_700Bold" },
  healthCard: { borderRadius: 28, padding: 20, overflow: "hidden", gap: 18 },
  healthGlow: {
    position: "absolute",
    right: -42,
    top: -54,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(168,230,207,0.22)",
  },
  healthHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  healthCopy: { flex: 1, gap: 7 },
  healthEyebrow: {
    color: "rgba(255,255,255,0.68)",
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  healthStatus: { color: "#FFFFFF", fontSize: 28, fontFamily: "Inter_700Bold" },
  healthSummary: {
    color: "rgba(255,255,255,0.76)",
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "Inter_500Medium",
  },
  scoreRingWrap: {
    width: 118,
    height: 118,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreRingCenter: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  scoreValue: { color: "#FFFFFF", fontSize: 30, fontFamily: "Inter_700Bold" },
  scoreMax: {
    color: "rgba(255,255,255,0.62)",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    marginTop: -3,
  },
  healthFactorGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  healthFactorCard: {
    width: "48%",
    minHeight: 112,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    padding: 12,
    gap: 8,
  },
  healthFactorIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  healthFactorCopy: { flex: 1, gap: 2 },
  healthFactorLabel: {
    color: "rgba(255,255,255,0.62)",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  healthFactorValue: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  healthFactorDetail: {
    color: "rgba(255,255,255,0.68)",
    fontSize: 11,
    lineHeight: 15,
    fontFamily: "Inter_400Regular",
  },
  healthForecast: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: "rgba(168,230,207,0.18)",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  healthForecastIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#A8E6CF",
    alignItems: "center",
    justifyContent: "center",
  },
  healthForecastText: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 12,
    lineHeight: 17,
    fontFamily: "Inter_600SemiBold",
  },
  forecastCard: { borderRadius: 22, padding: 18, gap: 14 },
  forecastHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  forecastTitleWrap: { flex: 1, gap: 4 },
  forecastEyebrow: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  forecastTitle: { fontSize: 17, lineHeight: 22, fontFamily: "Inter_700Bold" },
  forecastRiskBadge: {
    minHeight: 30,
    borderRadius: 15,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  forecastRiskDot: { width: 7, height: 7, borderRadius: 4 },
  forecastRiskText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  forecastMetrics: { flexDirection: "row", gap: 10 },
  forecastMetric: { flex: 1, borderRadius: 16, padding: 12, gap: 6 },
  forecastMetricIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  forecastMetricLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  forecastMetricValue: { fontSize: 15, fontFamily: "Inter_700Bold" },
  forecastPaceCard: {
    borderRadius: 16,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  forecastPaceIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  forecastPaceCopy: { flex: 1, gap: 2 },
  forecastPaceTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  forecastPaceDetail: {
    fontSize: 12,
    lineHeight: 17,
    fontFamily: "Inter_400Regular",
  },
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
  catPct: {
    width: 42,
    textAlign: "right",
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  insightCard: { flexDirection: "row", gap: 12, padding: 14, borderRadius: 14 },
  insightIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  insightText: { flex: 1, gap: 4 },
  insightTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  insightBody: { fontSize: 13, lineHeight: 20, fontFamily: "Inter_400Regular" },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 9,
  },
  topNum: { width: 24, fontSize: 12, fontFamily: "Inter_700Bold" },
  topIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  topName: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
  topAmount: { fontSize: 14, fontFamily: "Inter_700Bold" },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  errorCard: {
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  errorText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
});
