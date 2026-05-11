// @ts-nocheck
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { addFundsToGoal, createGoal, getFinancialInsights, listGoals } from "@shared/api/analysis";
import { useAppTheme } from "@shared/theme/ThemeProvider";

const goalColors = ["#10B981", "#8B5CF6", "#3B82F6", "#F97316", "#EC4899", "#F59E0B"];
const goalIcons = ["shield", "map-pin", "monitor", "trending-up", "star", "gift"];

export function GoalsScreen() {
  const { colors, gradients } = useAppTheme();
  const [goals, setGoals] = useState([]);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [deadline, setDeadline] = useState("2026-12-31");
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [goalItems, insightData] = await Promise.all([listGoals(), getFinancialInsights()]);
      setGoals(goalItems || []);
      setInsights(insightData);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить цели");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    void loadData();
  }, [loadData]));

  const cards = useMemo(() => {
    const insightMap = new Map((insights?.goals || []).map((item) => [item.goalId, item]));
    return (goals || []).map((goal, index) => {
      const insight = insightMap.get(goal.id);
      const target = Number(insight?.targetAmount ?? goal.targetAmount ?? 0);
      const current = Number(insight?.currentAmount ?? goal.currentAmount ?? 0);
      return {
        id: goal.id,
        name: goal.name,
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

  const saveGoal = async () => {
    const parsed = Number(targetAmount.replace(",", "."));
    if (!name.trim() || !parsed || !deadline.trim()) {
      setError("Укажите название, сумму и дату цели.");
      return;
    }
    try {
      setError(null);
      const index = goals.length % goalColors.length;
      await createGoal({
        name: name.trim(),
        targetAmount: parsed,
        deadline,
        goalType: "SAVING",
        priority: 1,
        currency: "RUB",
        icon: goalIcons[index],
        color: goalColors[index],
      });
      setName("");
      setTargetAmount("");
      setDeadline("2026-12-31");
      setModalVisible(false);
      await loadData();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Не удалось создать цель");
    }
  };

  const contribute = async (goalId: string, amount: number) => {
    try {
      await addFundsToGoal(goalId, amount);
      await loadData();
    } catch (fundError) {
      setError(fundError instanceof Error ? fundError.message : "Не удалось пополнить цель");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.pageTitle, { color: colors.text }]}>Цели</Text>
          <Pressable onPress={() => setModalVisible(true)}>
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
        {active.map((goal) => <GoalCard key={goal.id} goal={goal} onContribute={contribute} />)}
        {completed.length > 0 ? <Text style={[styles.sectionTitle, { color: colors.text }]}>Выполненные</Text> : null}
        {completed.map((goal) => <GoalCard key={goal.id} goal={goal} onContribute={contribute} />)}
        {cards.length === 0 && !loading ? <Text style={[styles.empty, { color: colors.textMuted }]}>Целей пока нет. Создайте первую финансовую цель.</Text> : null}
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <Pressable style={styles.overlay} onPress={() => setModalVisible(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.background }]} onPress={(event) => event.stopPropagation()}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.text }]}>Новая цель</Text>
            <Field label="Название" placeholder="Например, резервный фонд" value={name} onChangeText={setName} />
            <Field label="Целевая сумма" placeholder="100000" value={targetAmount} onChangeText={setTargetAmount} keyboardType="numeric" />
            <Field label="Дата завершения" placeholder="2026-12-31" value={deadline} onChangeText={setDeadline} />
            <Pressable onPress={saveGoal}>
              <LinearGradient colors={gradients.successDeep} style={styles.createButton}>
                <Text style={styles.createText}>Создать цель</Text>
              </LinearGradient>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function GoalCard({ goal, onContribute }) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.goalCard, { backgroundColor: colors.surface }]}>
      <View style={styles.goalTop}>
        <View style={[styles.goalIcon, { backgroundColor: `${goal.color}20` }]}>
          <Feather name={goal.icon} size={20} color={goal.color} />
        </View>
        <View style={styles.goalInfo}>
          <Text style={[styles.goalName, { color: colors.text }]}>{goal.name}</Text>
          <Text style={[styles.goalNumbers, { color: colors.textMuted }]}>{formatMoney(goal.current)} из {formatMoney(goal.target)}</Text>
          <Text style={[styles.goalNumbers, { color: colors.textMuted }]}>{goal.deadline}</Text>
        </View>
        <Progress value={goal.percent} color={goal.color} />
      </View>
      {goal.message ? <Text style={[styles.goalMessage, { color: colors.primary }]}>{goal.message}</Text> : null}
      <View style={styles.contributeRow}>
        {[1000, 5000].map((amount) => (
          <Pressable key={amount} onPress={() => onContribute(goal.id, amount)} style={[styles.contributeButton, { borderColor: colors.borderStrong }]}>
            <Text style={[styles.contributeText, { color: colors.primary }]}>+ {formatMoney(amount)}</Text>
          </Pressable>
        ))}
      </View>
    </View>
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

function formatMoney(value: number) {
  return `${Number(value || 0).toLocaleString("ru-RU", { maximumFractionDigits: 0 })} ₽`;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 120 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  pageTitle: { fontSize: 28, fontFamily: "Inter_700Bold" },
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
