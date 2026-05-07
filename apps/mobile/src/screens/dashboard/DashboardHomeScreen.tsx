// @ts-nocheck
import React from "react";
import { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from "react-native-svg";
import { MaterialIcons } from "@expo/vector-icons";
import { DashboardStackParamList } from "@app/navigation/types";
import { getFinancialInsights, listRecommendations } from "@shared/api/analysis";
import { listTransactions } from "@shared/api/transactions";
import { useUser } from "@shared/contexts/UserContext";
import { useAppTheme } from "@shared/theme/ThemeProvider";
import { radius, spacing } from "@shared/theme/spacing";
import { Screen } from "@shared/ui/Screen";
import { SectionCard } from "@shared/ui/SectionCard";

type Props = NativeStackScreenProps<DashboardStackParamList, "DashboardHome">;

export function DashboardHomeScreen({ navigation }: Props) {
  const { colors, gradients, isDark } = useAppTheme();
  const { user } = useUser();
  const [insights, setInsights] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [insightsData, txData, recsData] = await Promise.all([
        getFinancialInsights(),
        listTransactions(),
        listRecommendations().catch(() => []),
      ]);
      setInsights(insightsData);
      setTransactions(txData.slice(0, 5));
      setRecommendations(recsData.slice(0, 3));
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

  const categories = useMemo(
    () =>
      (insights?.categories || [])
        .filter((item) => Number(item.amount) > 0)
        .slice(0, 4)
        .map((item, index) => ({
          id: item.categoryId || `category-${index}`,
          title: item.categoryName || "Без категории",
          percent: Math.round(Number(item.percentage || 0)),
          amount: formatCurrency(item.amount),
          color: chartPalette[index % chartPalette.length],
        })),
    [insights],
  );

  const topGoal = useMemo(() => {
    const goals = [...(insights?.goals || [])];
    goals.sort((a, b) => Number(b.progressPercent || 0) - Number(a.progressPercent || 0));
    return goals[0] || null;
  }, [insights]);

  const alerts = useMemo(() => {
    const anomalyAlerts = (insights?.anomalies || []).slice(0, 2).map((item) => ({
      id: `anomaly-${item.title}`,
      title: item.title,
      tone: item.severity === "HIGH" ? "danger" : "success",
    }));
    const recommendationAlerts = (recommendations || []).slice(0, 2).map((item) => ({
      id: item.id,
      title: item.title,
      tone: Number(item.priority || 0) >= 4 ? "danger" : "success",
    }));
    return [...anomalyAlerts, ...recommendationAlerts].slice(0, 4);
  }, [insights, recommendations]);

  const txCards = useMemo(
    () =>
      (transactions || []).map((item) => ({
        id: item.id,
        amount: `${item.type === "INCOME" ? "+" : "-"}${formatCurrency(item.amount)}`,
        title: item.description || item.original_description || "Транзакция",
        category: item.is_verified ? "Обработано" : "Ожидает обработки",
        icon: item.type === "INCOME" ? "south-west" : "north-east",
      })),
    [transactions],
  );

  const spendingPercent = categories.reduce((sum, item) => sum + item.percent, 0);
  const summary = insights?.summary;

  return (
    <Screen>
      <LinearGradient colors={gradients.success} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
        <Text style={styles.balanceLabel}>
          {user ? `Добро пожаловать, ${user.full_name || user.email}!` : "Добро пожаловать!"}
        </Text>
        <Text style={[styles.balanceValue, { color: colors.white }]}>
          {summary ? formatCurrency(summary.netSavings) : "0 ₽"}
        </Text>
        <Text style={styles.heroMeta}>
          {summary
            ? `Доходы ${formatCurrency(summary.totalIncome)} • Расходы ${formatCurrency(summary.totalExpenses)}`
            : "Добавьте транзакции, чтобы увидеть финансовую картину"}
        </Text>
      </LinearGradient>

      {loading ? (
        <View style={styles.stateWrap}>
          <ActivityIndicator color={colors.primaryDark} size="large" />
        </View>
      ) : null}

      {error ? (
        <SectionCard title="Ошибка загрузки">
          <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
          <Pressable style={[styles.retryButton, { borderColor: colors.borderStrong }]} onPress={() => void loadData()}>
            <Text style={[styles.retryText, { color: colors.primaryDark }]}>Обновить</Text>
          </Pressable>
        </SectionCard>
      ) : null}

      {!loading && !error ? (
        <>
          <SectionCard title="Структура расходов" subtitle="Категории за выбранный период">
            {categories.length === 0 ? (
              <EmptyState text="Пока нет данных о расходах. Добавьте и обработайте транзакции." />
            ) : (
              <>
                <View style={styles.chartRow}>
                  <DonutChart percentage={Math.min(spendingPercent, 100)} />
                  <View style={styles.legendWrap}>
                    {categories.map((item) => (
                      <View key={item.id} style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                        <Text style={[styles.legendText, { color: colors.text }]}>{item.title}</Text>
                        <Text style={[styles.legendPercent, { color: colors.textMuted }]}>{item.percent}%</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </>
            )}
          </SectionCard>

          <SectionCard title="Ближайшая цель">
            {topGoal ? (
              <View style={styles.goalCard}>
                <View style={styles.goalLeft}>
                  <View style={[styles.goalIcon, { backgroundColor: colors.surfaceAlt }]}>
                    <MaterialIcons name="emoji-events" size={22} color={colors.primaryDark} />
                  </View>
                  <View style={styles.goalTextWrap}>
                    <Text style={[styles.goalTitle, { color: colors.text }]}>{topGoal.name}</Text>
                    <Text style={[styles.goalHint, { color: colors.textMuted }]}>
                      {`${formatCurrency(topGoal.currentAmount)} из ${formatCurrency(topGoal.targetAmount)}`}
                    </Text>
                    <Text style={[styles.goalHint, { color: colors.primaryDark }]}>
                      {topGoal.message || `Осталось ${formatCurrency(topGoal.remainingAmount)}`}
                    </Text>
                  </View>
                </View>
                <CircularProgress value={Number(topGoal.progressPercent || 0)} />
              </View>
            ) : (
              <EmptyState text="Пока нет целей. Создайте первую цель во вкладке «Цели»." />
            )}
          </SectionCard>

          <SectionCard title="Последние транзакции">
            {txCards.length === 0 ? (
              <EmptyState text="Транзакции пока не найдены." />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.txRow}>
                  {txCards.map((item) => (
                    <View key={item.id} style={[styles.txCard, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                      <View style={[styles.txIcon, { backgroundColor: colors.background }]}>
                        <MaterialIcons name={item.icon} size={18} color={colors.primaryDark} />
                      </View>
                      <Text style={[styles.txAmount, { color: item.amount.includes("+") ? colors.success : colors.text }]}>{item.amount}</Text>
                      <Text style={[styles.txTitle, { color: colors.text }]} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={[styles.txCategory, { color: colors.textMuted }]}>{item.category}</Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}
          </SectionCard>

          <SectionCard title="Важные сигналы">
            {alerts.length === 0 ? (
              <EmptyState text="Пока нет предупреждений и рекомендаций." />
            ) : (
              alerts.map((item) => <AlertCard key={item.id} title={item.title} tone={item.tone} />)
            )}
            <Pressable style={styles.reportButton} onPress={() => navigation.navigate("Reports")}>
              <Text style={styles.reportButtonText}>Открыть подробные отчеты</Text>
            </Pressable>
          </SectionCard>
        </>
      ) : null}

      <View style={[styles.footerSpacer, { backgroundColor: isDark ? "transparent" : colors.backgroundAlt }]} />
    </Screen>
  );
}

function EmptyState({ text }: { text: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.emptyState}>
      <Text style={[styles.emptyText, { color: colors.textMuted }]}>{text}</Text>
    </View>
  );
}

function DonutChart({ percentage }: { percentage: number }) {
  const { colors, isDark } = useAppTheme();
  const size = 140;
  const stroke = 18;
  const radiusValue = (size - stroke) / 2;
  const circumference = radiusValue * Math.PI * 2;
  const progress = Math.min(percentage / 100, 1);
  const dash = circumference * progress;

  return (
    <View style={styles.donutWrap}>
      <Svg width={size} height={size}>
        <Defs>
          <SvgGradient id="greenGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#86EFAC" />
            <Stop offset="100%" stopColor="#22C55E" />
          </SvgGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={radiusValue} stroke={isDark ? "#334155" : "#DCFCE7"} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radiusValue}
          stroke="url(#greenGradient)"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${dash} ${circumference}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.donutCenter}>
        <Text style={[styles.donutValue, { color: colors.primaryDark }]}>{percentage}%</Text>
        <Text style={[styles.donutLabel, { color: colors.textSecondary }]}>Расходы</Text>
      </View>
    </View>
  );
}

function CircularProgress({ value }: { value: number }) {
  const normalized = Math.max(0, Math.min(Math.round(value), 100));
  const size = 78;
  const stroke = 9;
  const radiusValue = (size - stroke) / 2;
  const circumference = radiusValue * Math.PI * 2;
  const progress = Math.min(normalized / 100, 1);
  const dash = circumference * progress;

  return (
    <View style={styles.progressWrap}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={radiusValue} stroke="#DCFCE7" strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radiusValue}
          stroke="#22C55E"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${dash} ${circumference}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.progressCenter}>
        <Text style={styles.progressLabel}>{normalized}%</Text>
      </View>
    </View>
  );
}

function AlertCard({ title, tone }: { title: string; tone: "success" | "danger" }) {
  const { colors } = useAppTheme();
  const borderColor = tone === "success" ? colors.success : colors.danger;
  const icon = tone === "success" ? "check-circle-outline" : "warning-amber";

  return (
    <View style={[styles.alertCard, { borderColor }]}>
      <MaterialIcons name={icon} size={20} color={borderColor} />
      <Text style={[styles.alertText, { color: colors.text }]}>{title}</Text>
    </View>
  );
}

function formatCurrency(value: number | string | null | undefined): string {
  const numeric = Number(value || 0);
  return `${numeric.toLocaleString("ru-RU", { maximumFractionDigits: 0 })} ₽`;
}

const chartPalette = ["#22C55E", "#16A34A", "#14B8A6", "#0EA5E9"];

const styles = StyleSheet.create({
  heroCard: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 3,
  },
  balanceLabel: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "#ECFDF5",
  },
  balanceValue: {
    fontSize: 36,
    fontFamily: "Inter_700Bold",
  },
  heroMeta: {
    fontSize: 13,
    color: "#ECFDF5",
    fontFamily: "Inter_500Medium",
  },
  stateWrap: {
    paddingVertical: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  retryButton: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  retryText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  chartRow: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "center",
  },
  donutWrap: {
    width: 140,
    height: 140,
    justifyContent: "center",
    alignItems: "center",
  },
  donutCenter: {
    position: "absolute",
    alignItems: "center",
  },
  donutValue: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
  },
  donutLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  legendWrap: {
    flex: 1,
    gap: spacing.xs,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 2,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  legendPercent: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  goalCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  goalLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
  },
  goalIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  goalTextWrap: {
    flex: 1,
    gap: 4,
  },
  goalTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  goalHint: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  progressWrap: {
    width: 78,
    height: 78,
    justifyContent: "center",
    alignItems: "center",
  },
  progressCenter: {
    position: "absolute",
  },
  progressLabel: {
    color: "#16A34A",
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  txRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingRight: spacing.sm,
  },
  txCard: {
    width: 164,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.sm,
    gap: 8,
  },
  txIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  txAmount: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  txTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  txCategory: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  alertCard: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  alertText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Inter_500Medium",
  },
  reportButton: {
    marginTop: spacing.xs,
    alignSelf: "flex-start",
  },
  reportButtonText: {
    color: "#16A34A",
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  emptyState: {
    paddingVertical: spacing.md,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Inter_500Medium",
  },
  footerSpacer: {
    height: 6,
    borderRadius: radius.full,
  },
});
