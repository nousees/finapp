import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Screen } from "@shared/ui/Screen";
import { SectionCard } from "@shared/ui/SectionCard";
import { useAppTheme } from "@shared/theme/ThemeProvider";
import { radius, spacing } from "@shared/theme/spacing";
import { MaterialIcons } from "@expo/vector-icons";

type BudgetCardData = {
  id: string;
  name: string;
  limit: string;
  spent: string;
  left: string;
  progress: number;
};

const budgetCards: BudgetCardData[] = [
  { id: "1", name: "Еда", limit: "38 000 ₽", spent: "40 300 ₽", left: "-2 300 ₽", progress: 1.06 },
  { id: "2", name: "Транспорт", limit: "12 000 ₽", spent: "8 720 ₽", left: "3 280 ₽", progress: 0.72 },
  { id: "3", name: "Дом", limit: "18 000 ₽", spent: "10 420 ₽", left: "7 580 ₽", progress: 0.58 },
  { id: "4", name: "Подписки", limit: "4 500 ₽", spent: "4 110 ₽", left: "390 ₽", progress: 0.91 },
];

export function BudgetsScreen() {
  const { colors, gradients } = useAppTheme();

  return (
    <Screen>
      <SectionCard title="Бюджеты месяца" subtitle="Контролируйте лимиты по категориям">
        {budgetCards.map((item) => (
          <BudgetCard key={item.id} item={item} />
        ))}
      </SectionCard>

      <Pressable>
        <LinearGradient colors={gradients.success} style={styles.createButton}>
          <MaterialIcons name="add-circle-outline" size={20} color="#FFFFFF" />
          <Text style={styles.createButtonText}>+ Новый бюджет</Text>
        </LinearGradient>
      </Pressable>

      <View style={[styles.tipCard, { borderColor: colors.borderStrong, backgroundColor: colors.surface }]}>
        <Text style={[styles.tipTitle, { color: colors.text }]}>Рекомендация FinApp</Text>
        <Text style={[styles.tipBody, { color: colors.textMuted }]}>
          Сократите бюджет «Подписки» на 15% и перенаправьте разницу в цель «Подушка безопасности».
        </Text>
      </View>
    </Screen>
  );
}

function BudgetCard({ item }: { item: BudgetCardData }) {
  const { colors } = useAppTheme();
  const [trackWidth, setTrackWidth] = useState(0);
  const progressWidth = useSharedValue(0);
  const normalized = Math.min(item.progress, 1);

  useEffect(() => {
    if (trackWidth > 0) {
      progressWidth.value = withTiming(trackWidth * normalized, { duration: 850 });
    }
  }, [normalized, progressWidth, trackWidth]);

  const progressStyle = useAnimatedStyle(() => ({
    width: progressWidth.value,
  }));

  const progressColor = item.progress < 0.75 ? "#22C55E" : item.progress < 0.95 ? "#F59E0B" : "#EF4444";

  return (
    <View style={[styles.budgetCard, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}>
      <View style={styles.header}>
        <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
        <Text style={[styles.limit, { color: colors.textMuted }]}>
          {item.spent} / {item.limit}
        </Text>
      </View>

      <View style={styles.metaRow}>
        <MetaValue label="Лимит" value={item.limit} />
        <MetaValue label="Потрачено" value={item.spent} />
        <MetaValue label="Остаток" value={item.left} tone={item.left.startsWith("-") ? "danger" : "normal"} />
      </View>

      <View style={[styles.track, { backgroundColor: colors.background }]} onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}>
        <Animated.View style={[styles.fill, progressStyle, { backgroundColor: progressColor }]} />
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

const styles = StyleSheet.create({
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
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 14,
    elevation: 3,
  },
  createButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
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
});
