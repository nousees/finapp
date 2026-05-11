// @ts-nocheck
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DashboardStackParamList } from "@app/navigation/types";
import { analyzeSubscriptions, ApiSubscription, listSubscriptions } from "@shared/api/subscriptions";
import { useAppTheme } from "@shared/theme/ThemeProvider";

type Props = NativeStackScreenProps<DashboardStackParamList, "Subscriptions">;

export function SubscriptionsScreen({ navigation }: Props) {
  const { colors, gradients } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [subscriptions, setSubscriptions] = useState<ApiSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      setSubscriptions(await listSubscriptions());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить подписки");
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

  const runAnalyze = async () => {
    try {
      setAnalyzing(true);
      setError(null);
      setSubscriptions(await analyzeSubscriptions());
    } catch (analyzeError) {
      setError(analyzeError instanceof Error ? analyzeError.message : "Не удалось запустить анализ подписок");
    } finally {
      setAnalyzing(false);
    }
  };

  const { totalMonthly, unusedCost, rareCost, unused, rare, active } = useMemo(() => {
    const totalMonthly = subscriptions.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const unused = subscriptions.filter((item) => Number(item.usage_index || 0) < 30);
    const rare = subscriptions.filter((item) => Number(item.usage_index || 0) >= 30 && Number(item.usage_index || 0) < 60);
    const active = subscriptions.filter((item) => Number(item.usage_index || 0) >= 60);
    return {
      totalMonthly,
      unused,
      rare,
      active,
      unusedCost: unused.reduce((sum, item) => sum + Number(item.amount || 0), 0),
      rareCost: rare.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    };
  }, [subscriptions]);

  const topPt = Platform.OS === "web" ? 42 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.nav, { paddingTop: topPt + 8 }]}>
        <Pressable onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: colors.backgroundAlt }]}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </Pressable>
        <Text style={[styles.navTitle, { color: colors.text }]}>Подписки</Text>
        <Pressable onPress={runAnalyze} style={[styles.backBtn, { backgroundColor: colors.backgroundAlt }]} disabled={analyzing}>
          {analyzing ? <ActivityIndicator color={colors.primary} /> : <Feather name="refresh-cw" size={18} color={colors.text} />}
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: 120 + insets.bottom }]} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={gradients.success} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Ежемесячные расходы</Text>
          <Text style={styles.summaryAmount}>{formatMoney(totalMonthly)}</Text>
          <Text style={styles.summaryYear}>~{formatMoney(totalMonthly * 12)} в год</Text>
          <View style={styles.summaryStatsRow}>
            <SummaryStat label="Подписок" value={String(subscriptions.length)} color="#A8E6CF" />
            <View style={styles.summaryDivider} />
            <SummaryStat label="Не используются" value={formatMoney(unusedCost)} color="#FCA5A5" />
            <View style={styles.summaryDivider} />
            <SummaryStat label="Редко" value={formatMoney(rareCost)} color="#FDE68A" />
          </View>
        </LinearGradient>

        {loading ? <ActivityIndicator color={colors.primary} size="large" /> : null}
        {error ? (
          <Pressable style={[styles.alertCard, { backgroundColor: "#FEF2F2" }]} onPress={() => void loadData()}>
            <Feather name="alert-circle" size={18} color="#EF4444" />
            <Text style={styles.alertText}>{error}</Text>
          </Pressable>
        ) : null}

        {!loading && subscriptions.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface }]}>
            <Feather name="repeat" size={36} color={colors.border} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Подписки пока не найдены</Text>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              Запустите анализ после импорта транзакций. Сервис ищет регулярные списания без доступа к аккаунтам сервисов.
            </Text>
            <Pressable onPress={runAnalyze}>
              <LinearGradient colors={gradients.successDeep} style={styles.analyzeButton}>
                <Feather name="zap" size={18} color="#FFFFFF" />
                <Text style={styles.analyzeButtonText}>Запустить анализ</Text>
              </LinearGradient>
            </Pressable>
          </View>
        ) : null}

        {(unused.length > 0 || rare.length > 0) && (
          <View style={[styles.recommendCard, { backgroundColor: "#FEF2F2" }]}>
            <Feather name="alert-triangle" size={18} color="#EF4444" />
            <View style={styles.recommendText}>
              <Text style={styles.recommendTitle}>Рекомендация</Text>
              <Text style={styles.recommendBody}>
                Возможно, можно сэкономить {formatMoney(unusedCost + rareCost)} в месяц на подписках с низким индексом использования.
              </Text>
            </View>
          </View>
        )}

        <SubscriptionSection title="Не используются" items={unused} />
        <SubscriptionSection title="Используются редко" items={rare} />
        <SubscriptionSection title="Активные" items={active} />
      </ScrollView>
    </View>
  );
}

function SummaryStat({ label, value, color }) {
  return (
    <View style={styles.summaryStat}>
      <Text style={[styles.summaryStatValue, { color }]} numberOfLines={1}>{value}</Text>
      <Text style={styles.summaryStatLabel}>{label}</Text>
    </View>
  );
}

function SubscriptionSection({ title, items }: { title: string; items: ApiSubscription[] }) {
  const { colors } = useAppTheme();
  if (!items.length) return null;
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      {items.map((item) => <SubscriptionCard key={item.id} item={item} />)}
    </View>
  );
}

function SubscriptionCard({ item }: { item: ApiSubscription }) {
  const { colors } = useAppTheme();
  const usage = Number(item.usage_index || 0);
  const usageColor = usage < 30 ? colors.danger : usage < 60 ? colors.warning : colors.success;
  const icon = usage < 30 ? "alert-circle" : usage < 60 ? "clock" : "check-circle";

  const cancelPrompt = () => {
    Alert.alert(
      `Проверить ${item.name}?`,
      item.recommendation || "FinApp не отменяет подписки автоматически, но показывает кандидатов на экономию.",
      [{ text: "Понятно" }],
    );
  };

  return (
    <View style={[styles.subCard, { backgroundColor: colors.surface }]}>
      <View style={[styles.subIcon, { backgroundColor: `${usageColor}20` }]}>
        <Feather name={icon} size={20} color={usageColor} />
      </View>
      <View style={styles.subInfo}>
        <View style={styles.subNameRow}>
          <Text style={[styles.subName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
          <View style={[styles.usageBadge, { backgroundColor: `${usageColor}20` }]}>
            <Text style={[styles.usageText, { color: usageColor }]}>{usage}%</Text>
          </View>
        </View>
        <Text style={[styles.subDetails, { color: colors.textMuted }]} numberOfLines={2}>
          {item.recurrence || "Регулярно"} · индекс использования {usage}%
        </Text>
      </View>
      <View style={styles.subRight}>
        <Text style={[styles.subAmount, { color: colors.text }]}>{formatMoney(item.amount)}</Text>
        <Text style={[styles.subCycle, { color: colors.textMuted }]}>/{item.currency || "RUB"}</Text>
        {usage < 60 ? (
          <Pressable onPress={cancelPrompt} style={[styles.actionPill, { backgroundColor: `${colors.danger}15` }]}>
            <Text style={[styles.actionPillText, { color: colors.danger }]}>Проверить</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function formatMoney(value) {
  return `${Math.abs(Number(value || 0)).toLocaleString("ru-RU", { maximumFractionDigits: 0 })} ₽`;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  nav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  navTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  body: { paddingHorizontal: 20 },
  summaryCard: { borderRadius: 20, padding: 22, marginBottom: 14, overflow: "hidden" },
  summaryLabel: { fontSize: 12, color: "rgba(255,255,255,0.72)", fontFamily: "Inter_400Regular", marginBottom: 6 },
  summaryAmount: { fontSize: 34, color: "#FFFFFF", fontFamily: "Inter_700Bold", marginBottom: 2 },
  summaryYear: { fontSize: 13, color: "rgba(255,255,255,0.66)", fontFamily: "Inter_400Regular", marginBottom: 18 },
  summaryStatsRow: { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 14, padding: 12 },
  summaryStat: { flex: 1, alignItems: "center", gap: 4 },
  summaryStatValue: { fontSize: 15, fontFamily: "Inter_700Bold" },
  summaryStatLabel: { fontSize: 10, color: "rgba(255,255,255,0.66)", fontFamily: "Inter_400Regular", textAlign: "center" },
  summaryDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.22)", marginVertical: 4 },
  alertCard: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 12, marginBottom: 14 },
  alertText: { flex: 1, color: "#B91C1C", fontSize: 13, fontFamily: "Inter_500Medium" },
  recommendCard: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 14, borderRadius: 12, marginBottom: 16 },
  recommendText: { flex: 1, gap: 3 },
  recommendTitle: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#B91C1C" },
  recommendBody: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#B91C1C", lineHeight: 18 },
  emptyCard: { borderRadius: 18, padding: 24, alignItems: "center", gap: 12, marginBottom: 18 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "center" },
  emptyText: { fontSize: 13, lineHeight: 19, fontFamily: "Inter_400Regular", textAlign: "center" },
  analyzeButton: { minHeight: 46, borderRadius: 16, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 8 },
  analyzeButtonText: { color: "#FFFFFF", fontSize: 14, fontFamily: "Inter_700Bold" },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 10 },
  subCard: { flexDirection: "row", alignItems: "flex-start", borderRadius: 14, padding: 14, marginBottom: 8, gap: 12 },
  subIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  subInfo: { flex: 1, gap: 5 },
  subNameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  subName: { flex: 1, fontSize: 15, fontFamily: "Inter_700Bold" },
  usageBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  usageText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  subDetails: { fontSize: 12, fontFamily: "Inter_400Regular" },
  subRight: { alignItems: "flex-end", gap: 4 },
  subAmount: { fontSize: 15, fontFamily: "Inter_700Bold" },
  subCycle: { fontSize: 11, fontFamily: "Inter_400Regular" },
  actionPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginTop: 2 },
  actionPillText: { fontSize: 12, fontFamily: "Inter_700Bold" },
});
