// @ts-nocheck
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { createBudget, getFinancialInsights, listBudgets } from "@shared/api/analysis";
import { useAppTheme } from "@shared/theme/ThemeProvider";

const systemCategories = [
  { id: "11111111-1111-1111-1111-111111111111", name: "Продукты", icon: "shopping-cart", color: "#F97316" },
  { id: "55555555-5555-5555-5555-555555555555", name: "Транспорт", icon: "navigation", color: "#3B82F6" },
  { id: "44444444-4444-4444-4444-444444444444", name: "Кафе", icon: "coffee", color: "#EC4899" },
  { id: "66666666-6666-6666-6666-666666666666", name: "Развлечения", icon: "film", color: "#8B5CF6" },
  { id: "77777777-7777-7777-7777-777777777777", name: "Здоровье", icon: "heart", color: "#10B981" },
];

export function BudgetsScreen() {
  const { colors, gradients } = useAppTheme();
  const [budgets, setBudgets] = useState([]);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [categoryId, setCategoryId] = useState(systemCategories[0].id);
  const [amountLimit, setAmountLimit] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [budgetItems, insightData] = await Promise.all([listBudgets(), getFinancialInsights()]);
      setBudgets(budgetItems || []);
      setInsights(insightData);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить бюджеты");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    void loadData();
  }, [loadData]));

  const cards = useMemo(() => {
    const insightMap = new Map((insights?.budgets || []).map((item) => [item.budgetId, item]));
    return (budgets || []).map((item, index) => {
      const insight = insightMap.get(item.id);
      const category = systemCategories.find((cat) => cat.id === item.categoryId) || systemCategories[index % systemCategories.length];
      const spent = Number(insight?.spentAmount ?? item.spentAmount ?? 0);
      const limit = Number(insight?.amountLimit ?? item.amountLimit ?? 0);
      return { id: item.id, name: insight?.categoryName || category.name, icon: category.icon, color: category.color, spent, limit, progress: limit > 0 ? spent / limit : 0 };
    });
  }, [budgets, insights]);

  const totalLimit = cards.reduce((sum, item) => sum + item.limit, 0);
  const totalSpent = cards.reduce((sum, item) => sum + item.spent, 0);
  const remaining = totalLimit - totalSpent;
  const totalProgress = totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : 0;

  const saveBudget = async () => {
    const parsed = Number(amountLimit.replace(",", "."));
    if (!categoryId || !parsed) {
      setError("Выберите категорию и укажите лимит.");
      return;
    }
    const today = new Date();
    const periodStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
    const periodEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);
    try {
      await createBudget({ categoryId, amountLimit: parsed, period: "MONTHLY", periodStart, periodEnd, currency: "RUB" });
      setAmountLimit("");
      setShowForm(false);
      await loadData();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Не удалось создать бюджет");
    }
  };

  return (
    <ScrollView style={[styles.scroll, { backgroundColor: colors.background }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={[styles.pageTitle, { color: colors.text }]}>Бюджеты</Text>
        <Text style={[styles.pageDate, { color: colors.textMuted }]}>{new Date().toLocaleDateString("ru-RU", { month: "long", year: "numeric" })}</Text>
      </View>

      <LinearGradient colors={gradients.success} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Summary label="Лимит" value={formatMoney(totalLimit)} />
          <Divider />
          <Summary label="Потрачено" value={formatMoney(totalSpent)} />
          <Divider />
          <Summary label="Остаток" value={formatMoney(Math.abs(remaining))} accent={remaining >= 0} />
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${Math.min(totalProgress, 100)}%`, backgroundColor: remaining < 0 ? "#EF4444" : "#A8E6CF" }]} />
        </View>
        <Text style={styles.summaryHint}>{totalProgress}% месячного бюджета использовано</Text>
      </LinearGradient>

      <Pressable onPress={() => setShowForm((value) => !value)}>
        <LinearGradient colors={gradients.successDeep} style={styles.createButton}>
          <Feather name={showForm ? "chevron-up" : "plus"} size={19} color="#FFFFFF" />
          <Text style={styles.createText}>{showForm ? "Скрыть форму" : "Новый бюджет"}</Text>
        </LinearGradient>
      </Pressable>

      {showForm ? (
        <View style={[styles.formCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Создание бюджета</Text>
          <View style={styles.categoryGrid}>
            {systemCategories.map((cat) => (
              <Pressable key={cat.id} onPress={() => setCategoryId(cat.id)} style={[styles.categoryChip, { backgroundColor: categoryId === cat.id ? `${cat.color}20` : colors.surfaceAlt, borderColor: categoryId === cat.id ? cat.color : "transparent" }]}>
                <Feather name={cat.icon} size={15} color={categoryId === cat.id ? cat.color : colors.textMuted} />
                <Text style={[styles.categoryText, { color: categoryId === cat.id ? cat.color : colors.textMuted }]}>{cat.name}</Text>
              </Pressable>
            ))}
          </View>
          <TextInput value={amountLimit} onChangeText={setAmountLimit} keyboardType="numeric" placeholder="Лимит, например 15000" placeholderTextColor={colors.textMuted} style={[styles.input, { backgroundColor: colors.surfaceAlt, color: colors.text }]} />
          <Pressable onPress={saveBudget} style={[styles.actionButton, { backgroundColor: colors.primary }]}>
            <Text style={styles.actionText}>Сохранить бюджет</Text>
          </Pressable>
        </View>
      ) : null}

      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
      {loading ? <ActivityIndicator color={colors.primary} size="large" style={styles.loader} /> : null}

      <Text style={[styles.sectionTitle, { color: colors.text }]}>По категориям</Text>
      {cards.length === 0 && !loading ? <Text style={[styles.empty, { color: colors.textMuted }]}>Бюджетов пока нет. Создайте первый лимит по категории.</Text> : null}
      {cards.map((item) => <BudgetCard key={item.id} item={item} />)}

      <View style={[styles.tipCard, { backgroundColor: colors.surface }]}>
        <LinearGradient colors={gradients.successDeep} style={styles.tipIcon}>
          <Feather name="bar-chart-2" size={16} color="#FFFFFF" />
        </LinearGradient>
        <View style={styles.tipText}>
          <Text style={[styles.tipTitle, { color: colors.text }]}>Совет месяца</Text>
          <Text style={[styles.tipBody, { color: colors.textMuted }]}>Следите за категориями с прогрессом выше 80%: они первыми приводят к перерасходу.</Text>
        </View>
      </View>
    </ScrollView>
  );
}

function BudgetCard({ item }) {
  const { colors } = useAppTheme();
  const isOver = item.progress >= 1;
  const progressColor = isOver ? colors.danger : item.progress >= 0.85 ? colors.warning : item.color;
  return (
    <View style={[styles.budgetCard, { backgroundColor: colors.surface }]}>
      <View style={styles.budgetRow}>
        <View style={[styles.budgetIcon, { backgroundColor: `${item.color}20` }]}>
          <Feather name={item.icon} size={18} color={item.color} />
        </View>
        <View style={styles.budgetInfo}>
          <Text style={[styles.budgetName, { color: colors.text }]}>{item.name}</Text>
          <Text style={[styles.budgetSub, { color: colors.textMuted }]}>{formatMoney(item.spent)} из {formatMoney(item.limit)}</Text>
        </View>
        <Text style={[styles.budgetPct, { color: progressColor }]}>{Math.round(item.progress * 100)}%</Text>
      </View>
      <View style={[styles.budgetTrack, { backgroundColor: colors.border }]}>
        <View style={[styles.budgetFill, { width: `${Math.min(item.progress * 100, 100)}%`, backgroundColor: progressColor }]} />
      </View>
    </View>
  );
}

function Summary({ label, value, accent = false }) {
  return (
    <View style={styles.summaryItem}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, accent ? { color: "#A8E6CF" } : null]}>{value}</Text>
    </View>
  );
}

function Divider() {
  return <View style={styles.summaryDivider} />;
}

function formatMoney(value: number) {
  return `${Number(value || 0).toLocaleString("ru-RU", { maximumFractionDigits: 0 })} ₽`;
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 120 },
  header: { marginBottom: 16 },
  pageTitle: { fontSize: 28, fontFamily: "Inter_700Bold" },
  pageDate: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 2 },
  summaryCard: { borderRadius: 20, padding: 20, marginBottom: 16 },
  summaryRow: { flexDirection: "row", marginBottom: 16 },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryLabel: { fontSize: 11, color: "rgba(255,255,255,0.72)", fontFamily: "Inter_400Regular", marginBottom: 4 },
  summaryValue: { fontSize: 16, color: "#FFFFFF", fontFamily: "Inter_700Bold" },
  summaryDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.22)", marginVertical: 4 },
  track: { height: 8, backgroundColor: "rgba(255,255,255,0.25)", borderRadius: 4, overflow: "hidden", marginBottom: 8 },
  fill: { height: "100%", borderRadius: 4 },
  summaryHint: { fontSize: 12, color: "rgba(255,255,255,0.75)", fontFamily: "Inter_400Regular" },
  createButton: { height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 7, marginBottom: 16 },
  createText: { color: "#FFFFFF", fontSize: 15, fontFamily: "Inter_700Bold" },
  formCard: { borderRadius: 18, padding: 16, gap: 12, marginBottom: 16 },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  categoryChip: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8 },
  categoryText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  input: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  actionButton: { height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  actionText: { color: "#FFFFFF", fontSize: 15, fontFamily: "Inter_700Bold" },
  error: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 12 },
  loader: { marginVertical: 20 },
  sectionTitle: { fontSize: 18, fontFamily: "Inter_700Bold", marginBottom: 12 },
  empty: { fontSize: 14, lineHeight: 20, marginBottom: 16 },
  budgetCard: { padding: 16, borderRadius: 16, marginBottom: 10, gap: 12 },
  budgetRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  budgetIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  budgetInfo: { flex: 1, gap: 2 },
  budgetName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  budgetSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  budgetPct: { fontSize: 14, fontFamily: "Inter_700Bold" },
  budgetTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
  budgetFill: { height: "100%", borderRadius: 3 },
  tipCard: { borderRadius: 16, padding: 16, marginTop: 8, flexDirection: "row", gap: 12 },
  tipIcon: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  tipText: { flex: 1, gap: 4 },
  tipTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  tipBody: { fontSize: 13, lineHeight: 19, fontFamily: "Inter_400Regular" },
});
