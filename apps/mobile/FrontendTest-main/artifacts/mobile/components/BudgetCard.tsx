import { Feather } from "@expo/vector-icons";
import React from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

import { Budget } from "@/context/FinanceContext";
import { useColors } from "@/hooks/useColors";

interface Props {
  budget: Budget;
}

function formatAmount(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 0 })}`;
}

export default function BudgetCard({ budget }: Props) {
  const colors = useColors();
  const pct = Math.min(budget.spent / budget.limit, 1);
  const isOver = pct >= 0.9;

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <View style={styles.row}>
        <View style={[styles.iconWrap, { backgroundColor: budget.color + "20" }]}>
          <Feather name={budget.icon as any} size={18} color={budget.color} />
        </View>
        <View style={styles.info}>
          <Text style={[styles.name, { color: colors.foreground }]}>{budget.name}</Text>
          <Text style={[styles.sub, { color: colors.mutedForeground }]}>
            {formatAmount(budget.spent)} of {formatAmount(budget.limit)}
          </Text>
        </View>
        <Text
          style={[
            styles.pctText,
            { color: isOver ? colors.expense : budget.color },
          ]}
        >
          {Math.round(pct * 100)}%
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.fill,
            {
              width: `${pct * 100}%`,
              backgroundColor: isOver ? colors.expense : budget.color,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    gap: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  sub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  pctText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  track: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 3,
  },
});
