// @ts-nocheck
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { createBudget, deleteBudget, getFinancialInsights, listBudgets, updateBudget } from "@shared/api/analysis";
import { EXPENSE_CATEGORIES } from "@shared/constants/categories";
import { useAppSettings } from "@shared/settings/AppSettingsContext";
import { useAppTheme } from "@shared/theme/ThemeProvider";

const emptyForm = {
  id: null,
  categoryId: EXPENSE_CATEGORIES[0].id,
  amountLimit: "",
};

export function BudgetsScreen() {
  const { colors, gradients } = useAppTheme();
  const { settings, formatMoney } = useAppSettings();
  const insets = useSafeAreaInsets();
  const [budgets, setBudgets] = useState([]);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [budgetItems, insightData] = await Promise.all([listBudgets(), getFinancialInsights()]);
      setBudgets(Array.isArray(budgetItems) ? budgetItems : []);
      setInsights(insightData);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить бюджеты");
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

  const cards = useMemo(() => {
    const insightMap = new Map((Array.isArray(insights?.budgets) ? insights.budgets : []).map((item) => [item.budgetId, item]));
    return budgets.map((item, index) => {
      const insight = insightMap.get(item.id);
      const category = EXPENSE_CATEGORIES.find((cat) => cat.id === item.categoryId) || EXPENSE_CATEGORIES[index % EXPENSE_CATEGORIES.length];
      const spent = Number(insight?.spentAmount ?? item.spentAmount ?? 0);
      const limit = Number(insight?.amountLimit ?? item.amountLimit ?? 0);
      return { ...item, name: insight?.categoryName || category.name, icon: category.icon, color: category.color, spent, limit, progress: limit > 0 ? spent / limit : 0 };
    });
  }, [budgets, insights]);

  const totalLimit = cards.reduce((sum, item) => sum + item.limit, 0);
  const totalSpent = cards.reduce((sum, item) => sum + item.spent, 0);
  const remaining = totalLimit - totalSpent;
  const totalProgress = totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : 0;

  const openCreate = () => {
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (item) => {
    setForm({ id: item.id, categoryId: item.categoryId, amountLimit: String(Number(item.amountLimit || item.limit || 0)) });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setForm(emptyForm);
    setError(null);
  };

  const saveBudget = async () => {
    const parsed = Number(form.amountLimit.replace(",", "."));
    if (!form.categoryId || !parsed || parsed <= 0) {
      setError("Выберите категорию и укажите лимит.");
      return;
    }
    const today = new Date();
    const periodStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
    const periodEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);
    const payload = { categoryId: form.categoryId, amountLimit: parsed, period: "MONTHLY", periodStart, periodEnd, currency: settings.currency };

    try {
      setError(null);
      if (form.id) {
        await updateBudget(form.id, payload);
      } else {
        await createBudget(payload);
      }
      closeForm();
      await loadData();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Не удалось сохранить бюджет");
    }
  };

  const removeBudget = async (id: string) => {
    Alert.alert("Удалить бюджет?", "Лимит по категории будет удалён.", [
      { text: "Отмена", style: "cancel" },
      {
        text: "Удалить",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteBudget(id);
            await loadData();
          } catch (deleteError) {
            setError(deleteError instanceof Error ? deleteError.message : "Не удалось удалить бюджет");
          }
        },
      },
    ]);
  };

  return (
    <ScrollView style={[styles.scroll, { backgroundColor: colors.background }]} contentContainerStyle={[styles.content, { paddingTop: insets.top + 18, paddingBottom: 120 + insets.bottom }]} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.pageTitle, { color: colors.text }]}>Бюджеты</Text>
          <Text style={[styles.pageDate, { color: colors.textMuted }]}>{new Date().toLocaleDateString("ru-RU", { month: "long", year: "numeric" })}</Text>
        </View>
        <Pressable onPress={openCreate}>
          <LinearGradient colors={gradients.successDeep} style={styles.roundAction}>
            <Feather name="plus" size={20} color="#FFFFFF" />
          </LinearGradient>
        </Pressable>
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

      {showForm ? (
        <View style={[styles.formCard, { backgroundColor: colors.surface }]}>
          <View style={styles.formHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{form.id ? "Редактирование бюджета" : "Новый бюджет"}</Text>
            <Pressable onPress={closeForm}>
              <Feather name="x" size={18} color={colors.textMuted} />
            </Pressable>
          </View>
          <View style={styles.categoryGrid}>
            {EXPENSE_CATEGORIES.map((cat) => (
              <Pressable
                key={cat.id}
                onPress={() => setForm((current) => ({ ...current, categoryId: cat.id }))}
                style={[
                  styles.categoryChip,
                  {
                    backgroundColor: form.categoryId === cat.id ? `${cat.color}20` : colors.surfaceAlt,
                    borderColor: form.categoryId === cat.id ? cat.color : "transparent",
                  },
                ]}
              >
                <Feather name={cat.icon as any} size={15} color={form.categoryId === cat.id ? cat.color : colors.textMuted} />
                <Text style={[styles.categoryText, { color: form.categoryId === cat.id ? cat.color : colors.textMuted }]}>{cat.name}</Text>
              </Pressable>
            ))}
          </View>
          <TextInput value={form.amountLimit} onChangeText={(value) => setForm((current) => ({ ...current, amountLimit: value }))} keyboardType="numeric" placeholder="Лимит, например 15000" placeholderTextColor={colors.textMuted} style={[styles.input, { backgroundColor: colors.surfaceAlt, color: colors.text }]} />
          <Pressable onPress={saveBudget} style={[styles.actionButton, { backgroundColor: colors.primary }]}>
            <Text style={styles.actionText}>{form.id ? "Сохранить изменения" : "Сохранить бюджет"}</Text>
          </Pressable>
        </View>
      ) : null}

      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
      {loading ? <ActivityIndicator color={colors.primary} size="large" style={styles.loader} /> : null}

      <Text style={[styles.sectionTitle, { color: colors.text }]}>По категориям</Text>
      {cards.length === 0 && !loading ? <Text style={[styles.empty, { color: colors.textMuted }]}>Бюджетов пока нет. Создайте первый лимит по категории.</Text> : null}
      {cards.map((item) => <BudgetCard key={item.id} item={item} onEdit={() => openEdit(item)} onDelete={() => removeBudget(item.id)} />)}
    </ScrollView>
  );
}

function BudgetCard({ item, onEdit, onDelete }) {
  const { colors } = useAppTheme();
  const { formatMoney } = useAppSettings();
  const isOver = item.progress >= 1;
  const progressColor = isOver ? colors.danger : item.progress >= 0.85 ? colors.warning : item.color;
  return (
    <Pressable style={[styles.budgetCard, { backgroundColor: colors.surface }]} onPress={onEdit}>
      <View style={styles.budgetRow}>
        <View style={[styles.budgetIcon, { backgroundColor: `${item.color}20` }]}>
          <Feather name={item.icon as any} size={18} color={item.color} />
        </View>
        <View style={styles.budgetInfo}>
          <Text style={[styles.budgetName, { color: colors.text }]}>{item.name}</Text>
          <Text style={[styles.budgetSub, { color: colors.textMuted }]}>{formatMoney(item.spent)} из {formatMoney(item.limit)}</Text>
        </View>
        <Text style={[styles.budgetPct, { color: progressColor }]}>{Math.round(item.progress * 100)}%</Text>
        <Pressable
          onPress={(event) => {
            event.stopPropagation();
            onDelete();
          }}
          style={[styles.deleteButton, { backgroundColor: colors.surfaceAlt }]}
        >
          <Feather name="trash-2" size={15} color={colors.danger} />
        </Pressable>
      </View>
      <View style={[styles.budgetTrack, { backgroundColor: colors.border }]}>
        <View style={[styles.budgetFill, { width: `${Math.min(item.progress * 100, 100)}%`, backgroundColor: progressColor }]} />
      </View>
    </Pressable>
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

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20 },
  header: { marginBottom: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  pageTitle: { fontSize: 28, fontFamily: "Inter_700Bold" },
  pageDate: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 2 },
  roundAction: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  summaryCard: { borderRadius: 20, padding: 20, marginBottom: 16 },
  summaryRow: { flexDirection: "row", marginBottom: 16 },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryLabel: { fontSize: 11, color: "rgba(255,255,255,0.72)", fontFamily: "Inter_400Regular", marginBottom: 4 },
  summaryValue: { fontSize: 16, color: "#FFFFFF", fontFamily: "Inter_700Bold" },
  summaryDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.22)", marginVertical: 4 },
  track: { height: 8, backgroundColor: "rgba(255,255,255,0.25)", borderRadius: 4, overflow: "hidden", marginBottom: 8 },
  fill: { height: "100%", borderRadius: 4 },
  summaryHint: { fontSize: 12, color: "rgba(255,255,255,0.75)", fontFamily: "Inter_400Regular" },
  formCard: { borderRadius: 18, padding: 16, gap: 12, marginBottom: 16 },
  formHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
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
  deleteButton: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  budgetTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
  budgetFill: { height: "100%", borderRadius: 3 },
});
