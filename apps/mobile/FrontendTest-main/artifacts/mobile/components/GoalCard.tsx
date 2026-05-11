import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Goal } from "@/context/FinanceContext";
import { useColors } from "@/hooks/useColors";

interface Props {
  goal: Goal;
  onContribute?: (id: string) => void;
}

function formatAmount(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)} тыс. ₽`;
  return `${n.toLocaleString("ru-RU")} ₽`;
}

function formatDeadline(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
}

export default function GoalCard({ goal, onContribute }: Props) {
  const colors = useColors();
  const pct = Math.min(goal.current / goal.target, 1);

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: goal.color + "20" }]}>
          <Feather name={goal.icon as any} size={18} color={goal.color} />
        </View>
        <View style={styles.info}>
          <Text style={[styles.name, { color: colors.foreground }]}>{goal.name}</Text>
          <Text style={[styles.deadline, { color: colors.mutedForeground }]}>
            До {formatDeadline(goal.deadline)}
          </Text>
        </View>
        <Text style={[styles.pct, { color: goal.color }]}>{Math.round(pct * 100)}%</Text>
      </View>

      <View style={[styles.track, { backgroundColor: colors.border }]}>
        <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: goal.color }]} />
      </View>

      <View style={styles.footer}>
        <Text style={[styles.amounts, { color: colors.mutedForeground }]}>
          {formatAmount(goal.current)}{" "}
          <Text style={{ color: colors.foreground }}>из {formatAmount(goal.target)}</Text>
        </Text>
        {onContribute && pct < 1 && (
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: goal.color + "20" }]}
            onPress={() => onContribute(goal.id)}
            activeOpacity={0.7}
          >
            <Text style={[styles.btnText, { color: goal.color }]}>+ Внести</Text>
          </TouchableOpacity>
        )}
        {pct >= 1 && (
          <View style={styles.doneWrap}>
            <Feather name="check-circle" size={16} color={colors.income} />
            <Text style={[styles.doneText, { color: colors.income }]}>Выполнено</Text>
          </View>
        )}
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
  header: {
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
  deadline: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  pct: {
    fontSize: 16,
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
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  amounts: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  btn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
  },
  btnText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  doneWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  doneText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
});
