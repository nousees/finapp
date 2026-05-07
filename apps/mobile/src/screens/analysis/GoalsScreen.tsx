// @ts-nocheck
import React from "react";
import { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle } from "react-native-svg";
import { MaterialIcons } from "@expo/vector-icons";
import { addFundsToGoal, createGoal, getFinancialInsights, listGoals } from "@shared/api/analysis";
import { Screen } from "@shared/ui/Screen";
import { SectionCard } from "@shared/ui/SectionCard";
import { useAppTheme } from "@shared/theme/ThemeProvider";
import { radius, spacing } from "@shared/theme/spacing";

export function GoalsScreen() {
  const { colors, gradients } = useAppTheme();
  const [goals, setGoals] = useState([]);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [deadline, setDeadline] = useState("");
  const [goalType, setGoalType] = useState("SAVING");

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [goalItems, insightData] = await Promise.all([listGoals(), getFinancialInsights()]);
      setGoals(goalItems);
      setInsights(insightData);
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

  const goalCards = useMemo(() => {
    const insightMap = new Map((insights?.goals || []).map((item) => [item.goalId, item]));
    return (goals || []).map((item) => {
      const insight = insightMap.get(item.id);
      const current = Number(insight?.currentAmount ?? item.currentAmount ?? 0);
      const target = Number(insight?.targetAmount ?? item.targetAmount ?? 0);
      return {
        id: item.id,
        title: item.name,
        current,
        target,
        percent: Number(insight?.progressPercent ?? (target > 0 ? (current / target) * 100 : 0)),
        monthly: insight?.message || `Нужно накопить еще ${formatCurrency(target - current)}`,
        deadline: item.deadline,
        status: item.status || "ACTIVE",
      };
    });
  }, [goals, insights]);

  const saveGoal = async () => {
    if (!name || !targetAmount || !deadline) {
      setError("Укажите название, сумму и дату цели");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await createGoal({
        name: name.trim(),
        targetAmount: Number(targetAmount.replace(",", ".")),
        deadline,
        goalType,
        priority: 1,
        currency: "RUB",
      });
      setName("");
      setTargetAmount("");
      setDeadline("");
      setGoalType("SAVING");
      setShowForm(false);
      await loadData();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Не удалось создать цель");
    } finally {
      setSaving(false);
    }
  };

  const addQuickFunds = async (goalId: string) => {
    try {
      setError(null);
      await addFundsToGoal(goalId, 1000);
      await loadData();
    } catch (fundError) {
      setError(fundError instanceof Error ? fundError.message : "Не удалось пополнить цель");
    }
  };

  return (
    <Screen>
      <SectionCard title="Финансовые цели" subtitle="Живые цели и прогресс по ним">
        {loading ? (
          <View style={styles.stateWrap}>
            <ActivityIndicator color={colors.primaryDark} size="large" />
          </View>
        ) : goalCards.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>Пока нет целей. Создайте первую цель ниже.</Text>
        ) : (
          goalCards.map((goal) => (
            <View key={goal.id} style={[styles.goalCard, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}>
              <View style={styles.headRow}>
                <View style={styles.iconAndTitle}>
                  <LinearGradient colors={gradients.success} style={styles.goalIcon}>
                    <MaterialIcons name="emoji-events" size={20} color="#FFFFFF" />
                  </LinearGradient>
                  <View style={styles.titleWrap}>
                    <Text style={[styles.goalTitle, { color: colors.text }]}>{goal.title}</Text>
                    <Text style={[styles.goalNumbers, { color: colors.textMuted }]}>
                      {formatCurrency(goal.current)} из {formatCurrency(goal.target)}
                    </Text>
                    <Text style={[styles.goalNumbers, { color: colors.textMuted }]}>{goal.deadline}</Text>
                  </View>
                </View>
                <GoalProgress value={goal.percent} />
              </View>
              <Text style={[styles.monthly, { color: colors.primaryDark }]}>{goal.monthly}</Text>
              <Pressable style={[styles.addButton, { borderColor: colors.borderStrong }]} onPress={() => void addQuickFunds(goal.id)}>
                <Text style={[styles.addButtonText, { color: colors.primaryDark }]}>+ Пополнить на 1 000 ₽</Text>
              </Pressable>
            </View>
          ))
        )}
      </SectionCard>

      <Pressable onPress={() => setShowForm((prev) => !prev)}>
        <LinearGradient colors={gradients.success} style={styles.createButton}>
          <MaterialIcons name={showForm ? "expand-less" : "add-circle-outline"} size={20} color="#FFFFFF" />
          <Text style={styles.createButtonText}>{showForm ? "Скрыть форму" : "Новая цель"}</Text>
        </LinearGradient>
      </Pressable>

      {showForm ? (
        <SectionCard title="Создание цели">
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Название цели"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surfaceAlt, color: colors.text }]}
          />
          <TextInput
            value={targetAmount}
            onChangeText={setTargetAmount}
            keyboardType="numeric"
            placeholder="Целевая сумма"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surfaceAlt, color: colors.text }]}
          />
          <TextInput
            value={deadline}
            onChangeText={setDeadline}
            placeholder="Дедлайн в формате YYYY-MM-DD"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surfaceAlt, color: colors.text }]}
          />
          <View style={styles.typeRow}>
            {["SAVING", "PURCHASE", "INVESTMENT"].map((item) => (
              <Pressable
                key={item}
                style={[
                  styles.typeChip,
                  {
                    borderColor: goalType === item ? colors.primaryDark : colors.border,
                    backgroundColor: goalType === item ? colors.surfaceAlt : colors.surface,
                  },
                ]}
                onPress={() => setGoalType(item)}
              >
                <Text style={{ color: goalType === item ? colors.primaryDark : colors.text }}>
                  {item === "SAVING" ? "Накопление" : item === "PURCHASE" ? "Покупка" : "Инвестиция"}
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable style={[styles.actionButton, { backgroundColor: colors.primaryDark }]} onPress={() => void saveGoal()} disabled={saving}>
            <Text style={styles.actionButtonText}>{saving ? "Сохранение..." : "Сохранить цель"}</Text>
          </Pressable>
        </SectionCard>
      ) : null}

      {error ? <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text> : null}
    </Screen>
  );
}

function GoalProgress({ value }: { value: number }) {
  const normalized = Math.max(0, Math.min(Math.round(value), 100));
  const size = 78;
  const stroke = 9;
  const radiusValue = (size - stroke) / 2;
  const circumference = radiusValue * Math.PI * 2;
  const dash = circumference * (normalized / 100);

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
        <Text style={styles.progressText}>{normalized}%</Text>
      </View>
    </View>
  );
}

function formatCurrency(value: number): string {
  return `${Number(value || 0).toLocaleString("ru-RU", { maximumFractionDigits: 0 })} ₽`;
}

const styles = StyleSheet.create({
  stateWrap: {
    paddingVertical: spacing.lg,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
  },
  goalCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  headRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
  },
  iconAndTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
  },
  goalIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  titleWrap: {
    flex: 1,
    gap: 2,
  },
  goalTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  goalNumbers: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  monthly: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Inter_600SemiBold",
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
  progressText: {
    color: "#16A34A",
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  addButton: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: "flex-start",
  },
  addButtonText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  createButton: {
    height: 54,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  createButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  typeRow: {
    flexDirection: "row",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  typeChip: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  actionButton: {
    height: 48,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  errorText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
});
