import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { CATEGORIES, Transaction } from "@/context/FinanceContext";
import { useColors } from "@/hooks/useColors";

interface Props {
  transaction: Transaction;
}

function formatAmount(amount: number, type: string) {
  const sign = type === "income" ? "+" : "−";
  return `${sign}${amount.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽`;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("ru-RU", { month: "short", day: "numeric" });
}

export default function TransactionItem({ transaction }: Props) {
  const colors = useColors();
  const category = CATEGORIES.find((c) => c.id === transaction.category);
  const isIncome = transaction.type === "income";

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      <View style={[styles.iconWrap, { backgroundColor: (category?.color ?? "#6B7280") + "20" }]}>
        <Feather
          name={(category?.icon as any) ?? "circle"}
          size={18}
          color={category?.color ?? "#6B7280"}
        />
      </View>
      <View style={styles.info}>
        <Text style={[styles.merchant, { color: colors.foreground }]} numberOfLines={1}>
          {transaction.merchant || transaction.description}
        </Text>
        <Text style={[styles.desc, { color: colors.mutedForeground }]} numberOfLines={1}>
          {category?.name ?? "Другое"} · {formatDate(transaction.date)}
        </Text>
      </View>
      <Text
        style={[
          styles.amount,
          { color: isIncome ? colors.income : colors.expense },
        ]}
      >
        {formatAmount(transaction.amount, transaction.type)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    gap: 12,
    marginBottom: 8,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    flex: 1,
    gap: 3,
  },
  merchant: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  desc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  amount: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
});
