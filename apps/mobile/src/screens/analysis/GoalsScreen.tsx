// @ts-nocheck
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { addFundsToGoal, createGoal, deleteGoal, getFinancialInsights, listGoals, updateGoal } from "@shared/api/analysis";
import { listTransactions } from "@shared/api/transactions";
import { useAppSettings } from "@shared/settings/AppSettingsContext";
import { DatePickerField, formatISODate, tomorrow } from "@shared/ui/DatePickerField";
import { useAppTheme } from "@shared/theme/ThemeProvider";

const goalColors = ["#10B981", "#8B5CF6", "#3B82F6", "#F97316", "#EC4899", "#F59E0B"];
const goalIcons = ["shield", "map-pin", "monitor", "trending-up", "star", "gift"];
const emptyForm = { id: null, name: "", targetAmount: "", deadline: formatISODate(tomorrow()), icon: goalIcons[0], color: goalColors[0] };

export function GoalsScreen() {
  const { colors, gradients } = useAppTheme();
  const { formatMoney } = useAppSettings();
  const insets = useSafeAreaInsets();
  const [goals, setGoals] = useState([]);
  const [insights, setInsights] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [goalItems, insightData, transactionItems] = await Promise.all([
        listGoals(),
        getFinancialInsights(),
        listTransactions({ limit: 500 }).catch(() => []),
      ]);
      setGoals(Array.isArray(goalItems) ? goalItems : []);
      setInsights(insightData);
      setTransactions(Array.isArray(transactionItems) ? transactionItems : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить цели");
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
    const insightMap = new Map((Array.isArray(insights?.goals) ? insights.goals : []).map((item) => [item.goalId, item]));
    return goals.map((goal, index) => {
      const insight = insightMap.get(goal.id);
      const target = Number(insight?.targetAmount ?? goal.targetAmount ?? 0);
      const current = Number(insight?.currentAmount ?? goal.currentAmount ?? 0);
      return {
        ...goal,
        target,
        current,
        deadline: goal.deadline,
        message: insight?.message,
        percent: Number(insight?.progressPercent ?? (target > 0 ? (current / target) * 100 : 0)),
        color: goal.color || goalColors[index % goalColors.length],
        icon: goal.icon || goalIcons[index % goalIcons.length],
      };
    });
  }, [goals, insights]);

  const completed = cards.filter((item) => item.current >= item.target);
  const active = cards.filter((item) => item.current < item.target);
  const totalSaved = cards.reduce((sum, item) => sum + item.current, 0);
  const totalTarget = cards.reduce((sum, item) => sum + item.target, 0);
  const totalProgress = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;
  const transactionBalance = transactions.reduce((sum, item) => {
    const amount = Number(item.amount || 0);
    return item.type === "INCOME" ? sum + amount : sum - amount;
  }, 0);
  const summaryBalance = Number(insights?.summary?.netSavings ?? NaN);
  const availableBalance = Math.max(0, Number.isFinite(summaryBalance) ? summaryBalance : transactionBalance, transactionBalance);

  const openCreate = () => {
    const index = goals.length % goalColors.length;
    setForm({ ...emptyForm, icon: goalIcons[index], color: goalColors[index] });
    setModalVisible(true);
  };

  const openEdit = (goal) => {
    setForm({
      id: goal.id,
      name: goal.name || "",
      targetAmount: String(Number(goal.target || goal.targetAmount || 0)),
      deadline: String(goal.deadline || formatISODate(tomorrow())).slice(0, 10),
      icon: goal.icon || goalIcons[0],
      color: goal.color || goalColors[0],
    });
    setModalVisible(true);
  };

  const closeForm = () => {
    setModalVisible(false);
    setForm(emptyForm);
    setError(null);
  };

  const saveGoal = async () => {
    const parsed = Number(form.targetAmount.replace(",", "."));
    const selectedDeadline = parseISODate(form.deadline);
    if (!form.name.trim() || !parsed || !form.deadline.trim()) {
      setError("Укажите название, сумму и дату цели.");
      return;
    }
    if (!selectedDeadline || selectedDeadline < tomorrow()) {
      setError("Для цели можно выбрать только будущую дату.");
      return;
    }
    const payload = {
      name: form.name.trim(),
      targetAmount: parsed,
      deadline: form.deadline,
      goalType: "SAVING",
      priority: 1,
      currency: "RUB",
      icon: form.icon,
      color: form.color,
    };

    try {
      setError(null);
      if (form.id) {
        await updateGoal(form.id, payload);
      } else {
        await createGoal(payload);
      }
      closeForm();
      await loadData();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Не удалось сохранить цель");
    }
  };

  const contribute = async (goal, amount: number) => {
    const remaining = Math.max(0, goal.target - goal.current);
    const safeAmount = Math.min(amount, remaining);
    if (safeAmount <= 0) {
      setError("Цель уже закрыта.");
      return;
    }
    if (safeAmount > availableBalance) {
      Alert.alert("Недостаточно средств", `Доступно для целей: ${formatMoney(availableBalance)}. Пополнение не выполнено.`);
      return;
    }
    try {
      setError(null);
      await addFundsToGoal(goal.id, safeAmount);
      await loadData();
    } catch (fundError) {
      setError(fundError instanceof Error ? fundError.message : "Не удалось пополнить цель");
    }
  };

  const removeGoal = async (id: string) => {
    Alert.alert("Удалить цель?", "Прогресс цели будет удалён.", [
      { text: "Отмена", style: "cancel" },
      {
        text: "Удалить",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteGoal(id);
            await loadData();
          } catch (deleteError) {
            setError(deleteError instanceof Error ? deleteError.message : "Не удалось удалить цель");
          }
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 18, paddingBottom: 120 + insets.bottom }]} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.pageTitle, { color: colors.text }]}>Цели</Text>
            <Text style={[styles.balanceText, { color: colors.textMuted }]}>Доступно для целей: {formatMoney(availableBalance)}</Text>
          </View>
          <Pressable onPress={openCreate}>
            <LinearGradient colors={gradients.successDeep} style={styles.addButton}>
              <Feather name="plus" size={20} color="#FFFFFF" />
            </LinearGradient>
          </Pressable>
        </View>

        <LinearGradient colors={["#7ED9B6", "#A8E6CF", "#6B46C1"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.overviewCard}>
          <Text style={styles.overviewLabel}>Всего накоплено</Text>
          <Text style={styles.overviewAmount}>{formatMoney(totalSaved)}</Text>
          <Text style={styles.overviewSub}>из {formatMoney(totalTarget)} · {totalProgress}%</Text>
          <View style={styles.overviewTrack}>
            <View style={[styles.overviewFill, { width: `${Math.min(totalProgress, 100)}%` }]} />
          </View>
          <View style={styles.overviewStats}>
            <OverviewStat value={active.length} label="Активных" />
            <OverviewStat value={completed.length} label="Выполнено" />
            <OverviewStat value={cards.length} label="Всего" />
          </View>
        </LinearGradient>

        {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
        {loading ? <ActivityIndicator color={colors.primary} size="large" style={styles.loader} /> : null}

        {active.length > 0 ? <Text style={[styles.sectionTitle, { color: colors.text }]}>В процессе</Text> : null}
        {active.map((goal) => <GoalCard key={goal.id} goal={goal} onEdit={() => openEdit(goal)} onDelete={() => removeGoal(goal.id)} onContribute={(amount) => contribute(goal, amount)} />)}
        {completed.length > 0 ? <Text style={[styles.sectionTitle, { color: colors.text }]}>Выполненные</Text> : null}
        {completed.map((goal) => <GoalCard key={goal.id} goal={goal} onEdit={() => openEdit(goal)} onDelete={() => removeGoal(goal.id)} onContribute={(amount) => contribute(goal, amount)} />)}
        {cards.length === 0 && !loading ? <Text style={[styles.empty, { color: colors.textMuted }]}>Целей пока нет. Создайте первую финансовую цель.</Text> : null}
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={closeForm}>
        <Pressable style={styles.overlay} onPress={closeForm}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.background, paddingBottom: 20 + insets.bottom }]} onPress={(event) => event.stopPropagation()}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.text }]}>{form.id ? "Редактировать цель" : "Новая цель"}</Text>
            <Field label="Название" placeholder="Например, резервный фонд" value={form.name} onChangeText={(value) => setForm((current) => ({ ...current, name: value }))} />
            <Field label="Целевая сумма" placeholder="100000" value={form.targetAmount} onChangeText={(value) => setForm((current) => ({ ...current, targetAmount: value }))} keyboardType="numeric" />
            <DatePickerField
              label="Дата завершения"
              value={form.deadline}
              onChange={(value) => setForm((current) => ({ ...current, deadline: value }))}
              minimumDate={tomorrow()}
              helper="Для целей доступна только будущая дата."
            />
            <Pressable onPress={saveGoal}>
              <LinearGradient colors={gradients.successDeep} style={styles.createButton}>
                <Text style={styles.createText}>{form.id ? "Сохранить изменения" : "Создать цель"}</Text>
              </LinearGradient>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function GoalCard({ goal, onEdit, onDelete, onContribute }) {
  const { colors } = useAppTheme();
  const { formatMoney } = useAppSettings();
  const remaining = Math.max(0, goal.target - goal.current);
  return (
    <Pressable style={[styles.goalCard, { backgroundColor: colors.surface }]} onPress={onEdit}>
      <View style={styles.goalTop}>
        <View style={[styles.goalIcon, { backgroundColor: `${goal.color}20` }]}>
          <Feather name={goal.icon as any} size={20} color={goal.color} />
        </View>
        <View style={styles.goalInfo}>
          <Text style={[styles.goalName, { color: colors.text }]}>{goal.name}</Text>
          <Text style={[styles.goalNumbers, { color: colors.textMuted }]}>{formatMoney(goal.current)} из {formatMoney(goal.target)}</Text>
          <Text style={[styles.goalNumbers, { color: colors.textMuted }]}>{goal.deadline}</Text>
        </View>
        <Progress value={goal.percent} color={goal.color} />
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
      {goal.message ? <Text style={[styles.goalMessage, { color: colors.primary }]}>{goal.message}</Text> : null}
      {remaining > 0 ? (
        <View style={styles.contributeRow}>
          {[1000, 5000].map((amount) => (
            <Pressable
              key={amount}
              onPress={(event) => {
                event.stopPropagation();
                onContribute(amount);
              }}
              style={[styles.contributeButton, { borderColor: colors.borderStrong }]}
            >
              <Text style={[styles.contributeText, { color: colors.primary }]}>+ {formatMoney(Math.min(amount, remaining))}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </Pressable>
  );
}

function Progress({ value, color }) {
  const size = 72;
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = radius * Math.PI * 2;
  const normalized = Math.max(0, Math.min(value, 100));
  return (
    <View style={styles.progressWrap}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke="#E5E7EB" strokeWidth={stroke} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${(normalized / 100) * circumference} ${circumference}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </Svg>
      <Text style={[styles.progressText, { color }]}>{Math.round(normalized)}%</Text>
    </View>
  );
}

function OverviewStat({ value, label }) {
  return (
    <View style={styles.overviewStat}>
      <Text style={styles.overviewStatValue}>{value}</Text>
      <Text style={styles.overviewStatLabel}>{label}</Text>
    </View>
  );
}

function Field({ label, ...props }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{label}</Text>
      <TextInput {...props} placeholderTextColor={colors.textMuted} style={[styles.input, { backgroundColor: colors.surfaceAlt, color: colors.text }]} />
    </View>
  );
}

function parseISODate(value: string): Date | null {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  pageTitle: { fontSize: 28, fontFamily: "Inter_700Bold" },
  balanceText: { fontSize: 13, fontFamily: "Inter_500Medium", marginTop: 2 },
  addButton: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  overviewCard: { borderRadius: 20, padding: 22, marginBottom: 24 },
  overviewLabel: { fontSize: 12, color: "rgba(255,255,255,0.75)", fontFamily: "Inter_400Regular", marginBottom: 6 },
  overviewAmount: { fontSize: 34, color: "#FFFFFF", fontFamily: "Inter_700Bold", marginBottom: 4 },
  overviewSub: { fontSize: 12, color: "rgba(255,255,255,0.72)", fontFamily: "Inter_400Regular", marginBottom: 14 },
  overviewTrack: { height: 6, backgroundColor: "rgba(255,255,255,0.25)", borderRadius: 3, overflow: "hidden", marginBottom: 16 },
  overviewFill: { height: "100%", backgroundColor: "#FFFFFF", borderRadius: 3 },
  overviewStats: { flexDirection: "row", justifyContent: "space-around" },
  overviewStat: { alignItems: "center", gap: 2 },
  overviewStatValue: { fontSize: 20, color: "#FFFFFF", fontFamily: "Inter_700Bold" },
  overviewStatLabel: { fontSize: 11, color: "rgba(255,255,255,0.72)", fontFamily: "Inter_400Regular" },
  error: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 12 },
  loader: { marginVertical: 20 },
  sectionTitle: { fontSize: 18, fontFamily: "Inter_700Bold", marginBottom: 12 },
  empty: { fontSize: 14, lineHeight: 20 },
  goalCard: { borderRadius: 18, padding: 16, marginBottom: 12, gap: 12 },
  goalTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  goalIcon: { width: 46, height: 46, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  goalInfo: { flex: 1, gap: 2 },
  goalName: { fontSize: 16, fontFamily: "Inter_700Bold" },
  goalNumbers: { fontSize: 12, fontFamily: "Inter_500Medium" },
  goalMessage: { fontSize: 13, lineHeight: 19, fontFamily: "Inter_600SemiBold" },
  deleteButton: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  progressWrap: { width: 72, height: 72, alignItems: "center", justifyContent: "center" },
  progressText: { position: "absolute", fontSize: 13, fontFamily: "Inter_700Bold" },
  contributeRow: { flexDirection: "row", gap: 8 },
  contributeButton: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  contributeText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingTop: 12, gap: 10 },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 12 },
  sheetTitle: { fontSize: 22, fontFamily: "Inter_700Bold", marginBottom: 4 },
  field: { gap: 6 },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  input: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  createButton: { borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 8 },
  createText: { fontSize: 16, color: "#FFFFFF", fontFamily: "Inter_700Bold" },
});
