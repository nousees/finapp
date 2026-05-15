// @ts-nocheck
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DashboardStackParamList } from "@app/navigation/types";
import { deleteRecommendation, generateRecommendations, getFinancialInsights, listRecommendations, listReports } from "@shared/api/analysis";
import { useAppSettings } from "@shared/settings/AppSettingsContext";
import { useAppTheme } from "@shared/theme/ThemeProvider";

type Props = NativeStackScreenProps<DashboardStackParamList, "Reports">;

export function ReportsScreen({ navigation }: Props) {
  const { colors, gradients } = useAppTheme();
  const { formatMoney } = useAppSettings();
  const insets = useSafeAreaInsets();
  const [insights, setInsights] = useState(null);
  const [reports, setReports] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [insightData, reportItems, recommendationItems] = await Promise.all([
        getFinancialInsights(),
        listReports().catch(() => []),
        listRecommendations().catch(() => []),
      ]);
      setInsights(insightData);
      setReports(reportItems || []);
      setRecommendations(recommendationItems || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить отчёты");
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

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      setError(null);
      await generateRecommendations();
      await loadData();
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : "Не удалось сформировать рекомендации");
    } finally {
      setGenerating(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  const removeRecommendation = async (id: string) => {
    try {
      await deleteRecommendation(id);
      setRecommendations((current) => current.filter((item) => item.id !== id));
    } catch (deleteError) {
      Alert.alert("Ошибка", deleteError instanceof Error ? deleteError.message : "Не удалось удалить рекомендацию");
    }
  };

  const categories = Array.isArray(insights?.categories) ? insights.categories : [];
  const budgets = Array.isArray(insights?.budgets) ? insights.budgets : [];
  const goals = Array.isArray(insights?.goals) ? insights.goals : [];
  const goalsSaved = goals.reduce((sum, item) => sum + Number(item.currentAmount || 0), 0);
  const goalsTarget = goals.reduce((sum, item) => sum + Number(item.targetAmount || 0), 0);
  const topPt = Platform.OS === "web" ? 42 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.nav, { paddingTop: topPt + 8 }]}>
        <Pressable onPress={() => navigation.goBack()} style={[styles.iconButton, { backgroundColor: colors.backgroundAlt }]}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </Pressable>
        <Text style={[styles.navTitle, { color: colors.text }]}>Отчёты</Text>
        <Pressable onPress={handleRefresh} style={[styles.iconButton, { backgroundColor: colors.backgroundAlt }]}>
          <Feather name="refresh-cw" size={18} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 120 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
      >
        <LinearGradient colors={gradients.success} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Сводка периода</Text>
          <Text style={styles.summaryValue}>{formatMoney(insights?.summary?.netSavings)}</Text>
          <Text style={styles.summaryText}>
            {formatMoney(insights?.summary?.totalIncome)} доходов · {formatMoney(insights?.summary?.totalExpenses)} расходов
          </Text>
          <View style={styles.summaryStats}>
            <MiniMetric label="Категорий" value={String(categories.length)} />
            <MiniMetric label="Бюджетов" value={String(budgets.length)} />
            <MiniMetric label="Целей" value={String(goals.length)} />
          </View>
          <Text style={styles.summaryText}>
            В целях: {formatMoney(goalsSaved)} из {formatMoney(goalsTarget)}
          </Text>
        </LinearGradient>

        {loading ? <ActivityIndicator color={colors.primary} size="large" /> : null}
        {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

        <Panel title="Структура расходов">
          {categories.length === 0 ? (
            <EmptyText text="Пока нет данных по категориям." />
          ) : (
            categories.slice(0, 6).map((item, index) => (
              <ProgressRow
                key={item.categoryId || item.categoryName || index}
                label={item.categoryName || "Без категории"}
                value={`${Math.round(Number(item.percentage || 0))}%`}
                width={Math.min(Math.round(Number(item.percentage || 0)), 100)}
                color={palette[index % palette.length]}
              />
            ))
          )}
        </Panel>

        <Panel title="Цели">
          {goals.length === 0 ? (
            <EmptyText text="Цели пока не созданы." />
          ) : (
            goals.slice(0, 5).map((item) => (
              <InfoCard
                key={item.goalId}
                icon="target"
                title={item.name || "Цель"}
                text={`${formatMoney(item.currentAmount)} из ${formatMoney(item.targetAmount)} · ${Math.round(Number(item.progressPercent || 0))}%`}
              />
            ))
          )}
        </Panel>

        <Panel title="Статус бюджетов">
          {budgets.length === 0 ? (
            <EmptyText text="Бюджеты ещё не созданы." />
          ) : (
            budgets.slice(0, 5).map((item) => (
              <InfoCard key={item.budgetId} icon="pie-chart" title={item.categoryName || "Бюджет"} text={item.message || `${Math.round(Number(item.progressPercent || 0))}% использовано`} />
            ))
          )}
        </Panel>

        <Panel title="Рекомендации">
          {recommendations.length === 0 ? (
            <EmptyText text="Рекомендаций пока нет." />
          ) : (
            recommendations.slice(0, 5).map((item) => <InfoCard key={item.id} icon="zap" title={item.title} text={item.description} onDelete={() => removeRecommendation(item.id)} />)
          )}
          <Pressable onPress={handleGenerate} disabled={generating}>
            <LinearGradient colors={gradients.successDeep} style={styles.actionButton}>
              {generating ? <ActivityIndicator color="#FFFFFF" /> : <Feather name="refresh-cw" size={18} color="#FFFFFF" />}
              <Text style={styles.actionText}>{generating ? "Формирование..." : "Сформировать заново"}</Text>
            </LinearGradient>
          </Pressable>
        </Panel>

        <Panel title="История отчётов">
          {reports.length === 0 ? (
            <EmptyText text="Готовых отчётов пока нет." />
          ) : (
            reports.map((item) => (
              <InfoCard key={item.id} icon="file-text" title={item.reportType || "Отчёт"} text={`${item.periodStart} - ${item.periodEnd}`} />
            ))
          )}
        </Panel>
      </ScrollView>
    </View>
  );
}

function Panel({ title, children }) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.panel, { backgroundColor: colors.surface }]}>
      <Text style={[styles.panelTitle, { color: colors.text }]}>{title}</Text>
      {children}
    </View>
  );
}

function MiniMetric({ label, value }) {
  return (
    <View style={styles.miniMetric}>
      <Text style={styles.miniValue}>{value}</Text>
      <Text style={styles.miniLabel}>{label}</Text>
    </View>
  );
}

function ProgressRow({ label, value, width, color }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.progressItem}>
      <View style={styles.progressHead}>
        <Text style={[styles.progressLabel, { color: colors.text }]} numberOfLines={1}>{label}</Text>
        <Text style={[styles.progressValue, { color: colors.textMuted }]}>{value}</Text>
      </View>
      <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
        <View style={[styles.progressFill, { width: `${width}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function InfoCard({ icon, title, text, onDelete }) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.infoCard, { backgroundColor: colors.backgroundAlt }]}>
      <View style={[styles.infoIcon, { backgroundColor: `${colors.primary}20` }]}>
        <Feather name={icon} size={16} color={colors.primary} />
      </View>
      <View style={styles.infoText}>
        <Text style={[styles.infoTitle, { color: colors.text }]} numberOfLines={1}>{title}</Text>
        <Text style={[styles.infoBody, { color: colors.textMuted }]} numberOfLines={3}>{text || "Нет описания"}</Text>
      </View>
      {onDelete ? (
        <Pressable onPress={onDelete} style={styles.deleteButton}>
          <Feather name="x" size={16} color={colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

function EmptyText({ text }) {
  const { colors } = useAppTheme();
  return <Text style={[styles.empty, { color: colors.textMuted }]}>{text}</Text>;
}

const palette = ["#F97316", "#3B82F6", "#EC4899", "#8B5CF6", "#10B981", "#F59E0B"];

const styles = StyleSheet.create({
  container: { flex: 1 },
  nav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 12 },
  iconButton: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  navTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  content: { paddingHorizontal: 20, gap: 14 },
  summaryCard: { borderRadius: 20, padding: 22, gap: 8 },
  summaryLabel: { color: "rgba(255,255,255,0.72)", fontSize: 12, fontFamily: "Inter_400Regular" },
  summaryValue: { color: "#FFFFFF", fontSize: 34, fontFamily: "Inter_700Bold" },
  summaryText: { color: "rgba(255,255,255,0.74)", fontSize: 13, fontFamily: "Inter_400Regular" },
  summaryStats: { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.13)", borderRadius: 14, padding: 12, marginTop: 8 },
  miniMetric: { flex: 1, alignItems: "center", gap: 3 },
  miniValue: { color: "#FFFFFF", fontSize: 18, fontFamily: "Inter_700Bold" },
  miniLabel: { color: "rgba(255,255,255,0.68)", fontSize: 11, fontFamily: "Inter_400Regular" },
  panel: { borderRadius: 18, padding: 16, gap: 12 },
  panelTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  progressItem: { gap: 7 },
  progressHead: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  progressLabel: { flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold" },
  progressValue: { fontSize: 13, fontFamily: "Inter_700Bold" },
  progressTrack: { height: 8, borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 4 },
  infoCard: { flexDirection: "row", gap: 12, borderRadius: 14, padding: 12 },
  infoIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  infoText: { flex: 1, gap: 2 },
  deleteButton: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  infoTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  infoBody: { fontSize: 12, lineHeight: 18, fontFamily: "Inter_400Regular" },
  actionButton: { minHeight: 48, borderRadius: 16, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  actionText: { color: "#FFFFFF", fontSize: 15, fontFamily: "Inter_700Bold" },
  empty: { fontSize: 13, lineHeight: 19, fontFamily: "Inter_400Regular" },
  error: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
