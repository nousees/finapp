// @ts-nocheck
import React from "react";
import { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import { createBudget, getFinancialInsights, listBudgets } from "@shared/api/analysis";
import { Screen } from "@shared/ui/Screen";
import { SectionCard } from "@shared/ui/SectionCard";
import { useAppTheme } from "@shared/theme/ThemeProvider";
import { radius, spacing } from "@shared/theme/spacing";

export function BudgetsScreen() {
  const { colors, gradients } = useAppTheme();
  const [budgets, setBudgets] = useState([]);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [amountLimit, setAmountLimit] = useState("");
  const [period, setPeriod] = useState<"MONTHLY" | "WEEKLY">("MONTHLY");

  const progressWidth = useSharedValue(0);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [budgetItems, insightData] = await Promise.all([listBudgets(), getFinancialInsights()]);
      setBudgets(budgetItems);
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

  const availableCategories = useMemo(
    () =>
      (insights?.categories || [])
        .filter((item) => item.categoryId)
        .map((item) => ({
          id: item.categoryId,
          name: item.categoryName || "Без категории",
        })),
    [insights],
  );

  const budgetCards = useMemo(() => {
    const insightMap = new Map((insights?.budgets || []).map((item) => [item.budgetId, item]));
    const categoryMap = new Map((insights?.categories || []).map((item) => [item.categoryId, item.categoryName]));
    return (budgets || []).map((item) => {
      const insight = insightMap.get(item.id);
      const spent = Number(insight?.spentAmount ?? item.spentAmount ?? 0);
      const limit = Number(insight?.amountLimit ?? item.amountLimit ?? 0);
      const progress = limit > 0 ? spent / limit : 0;
      return {
        id: item.id,
        categoryName: insight?.categoryName || categoryMap.get(item.categoryId) || item.categoryId || "Без категории",
        spent,
        limit,
        remaining: Number(insight?.remainingAmount ?? limit - spent),
        progress,
        riskLevel: insight?.riskLevel || "LOW",
        periodLabel: `${item.periodStart} - ${item.periodEnd}`,
      };
    });
  }, [budgets, insights]);

  const recommendationText = insights?.budgets?.find((item) => item.message)?.message || null;

  const saveBudget = async () => {
    if (!categoryId || !amountLimit) {
      setError("Укажите категорию и лимит бюджета");
      return;
    }

    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end =
      period === "MONTHLY"
        ? new Date(today.getFullYear(), today.getMonth() + 1, 0)
        : new Date(today.getTime() + 6 * 24 * 60 * 60 * 1000);

    try {
      setSaving(true);
      setError(null);
      await createBudget({
        categoryId,
        amountLimit: Number(amountLimit.replace(",", ".")),
        period,
        periodStart: start.toISOString().slice(0, 10),
        periodEnd: end.toISOString().slice(0, 10),
        currency: "RUB",
      });
      setCategoryId("");
      setAmountLimit("");
      setShowForm(false);
      await loadData();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Не удалось создать бюджет");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <SectionCard title="Бюджеты месяца" subtitle="Реальные бюджеты пользователя и их текущее состояние">
        {loading ? (
          <View style={styles.stateWrap}>
            <ActivityIndicator color={colors.primaryDark} size="large" />
          </View>
        ) : budgetCards.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Бюджетов пока нет. Создайте первый бюджет по категории, которая уже встречалась в ваших транзакциях.
          </Text>
        ) : (
          budgetCards.map((item) => <BudgetCard key={item.id} item={item} />)
        )}
      </SectionCard>

      <Pressable onPress={() => setShowForm((prev) => !prev)}>
        <LinearGradient colors={gradients.success} style={styles.createButton}>
          <MaterialIcons name={showForm ? "expand-less" : "add-circle-outline"} size={20} color="#FFFFFF" />
          <Text style={styles.createButtonText}>{showForm ? "Скрыть форму" : "Новый бюджет"}</Text>
        </LinearGradient>
      </Pressable>

      {showForm ? (
        <SectionCard title="Создание бюджета" subtitle="Категории берутся из уже найденных расходов">
          <View style={styles.categoryList}>
            {availableCategories.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                Пока нет доступных категорий. Сначала добавьте и обработайте несколько транзакций.
              </Text>
            ) : (
              availableCategories.map((item) => (
                <Pressable
                  key={item.id}
                  style={[
                    styles.categoryChip,
                    {
                      borderColor: categoryId === item.id ? colors.primaryDark : colors.border,
                      backgroundColor: categoryId === item.id ? colors.surfaceAlt : colors.surface,
                    },
                  ]}
                  onPress={() => setCategoryId(item.id)}
                >
                  <Text style={{ color: categoryId === item.id ? colors.primaryDark : colors.text }}>{item.name}</Text>
                </Pressable>
              ))
            )}
          </View>

          <TextInput
            value={amountLimit}
            onChangeText={setAmountLimit}
            keyboardType="numeric"
            placeholder="Лимит, например 15000"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surfaceAlt, color: colors.text }]}
          />

          <View style={styles.periodRow}>
            {["MONTHLY", "WEEKLY"].map((item) => (
              <Pressable
                key={item}
                style={[
                  styles.periodChip,
                  {
                    borderColor: period === item ? colors.primaryDark : colors.border,
                    backgroundColor: period === item ? colors.surfaceAlt : colors.surface,
                  },
                ]}
                onPress={() => setPeriod(item as "MONTHLY" | "WEEKLY")}
              >
                <Text style={{ color: period === item ? colors.primaryDark : colors.text }}>
                  {item === "MONTHLY" ? "Месяц" : "Неделя"}
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable style={[styles.actionButton, { backgroundColor: colors.primaryDark }]} onPress={() => void saveBudget()} disabled={saving}>
            <Text style={styles.actionButtonText}>{saving ? "Сохранение..." : "Сохранить бюджет"}</Text>
          </Pressable>
        </SectionCard>
      ) : null}

      {recommendationText ? (
        <View style={[styles.tipCard, { borderColor: colors.borderStrong, backgroundColor: colors.surface }]}>
          <Text style={[styles.tipTitle, { color: colors.text }]}>Рекомендация FinApp</Text>
          <Text style={[styles.tipBody, { color: colors.textMuted }]}>{recommendationText}</Text>
        </View>
      ) : null}

      {error ? <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text> : null}
    </Screen>
  );
}

function BudgetCard({ item }: { item: any }) {
  const { colors } = useAppTheme();
  const progressColor = item.progress < 0.75 ? "#22C55E" : item.progress < 0.95 ? "#F59E0B" : "#EF4444";
  const width = `${Math.min(item.progress * 100, 100)}%`;

  return (
    <View style={[styles.budgetCard, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}>
      <View style={styles.header}>
        <Text style={[styles.name, { color: colors.text }]}>{item.categoryName}</Text>
        <Text style={[styles.limit, { color: colors.textMuted }]}>{item.periodLabel}</Text>
      </View>

      <View style={styles.metaRow}>
        <MetaValue label="Лимит" value={formatCurrency(item.limit)} />
        <MetaValue label="Потрачено" value={formatCurrency(item.spent)} />
        <MetaValue label="Остаток" value={formatCurrency(item.remaining)} tone={item.remaining < 0 ? "danger" : "normal"} />
      </View>

      <View style={[styles.track, { backgroundColor: colors.background }]}>
        <Animated.View style={[styles.fill, { backgroundColor: progressColor, width }]} />
      </View>
    </View>
  );
}

function MetaValue({ label, value, tone = "normal" }: { label: string; value: string; tone?: "normal" | "danger" }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.metaCell}>
      <Text style={[styles.metaLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.metaValue, { color: tone === "danger" ? colors.danger : colors.text }]}>{value}</Text>
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
  budgetCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
  },
  name: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    flex: 1,
  },
  limit: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  metaCell: {
    flex: 1,
    gap: 3,
  },
  metaLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  metaValue: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  track: {
    height: 10,
    borderRadius: radius.full,
    overflow: "hidden",
  },
  fill: {
    height: 10,
    borderRadius: radius.full,
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
  categoryList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  categoryChip: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  periodRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  periodChip: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
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
  tipCard: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: 4,
  },
  tipTitle: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  tipBody: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Inter_500Medium",
  },
  errorText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
});
