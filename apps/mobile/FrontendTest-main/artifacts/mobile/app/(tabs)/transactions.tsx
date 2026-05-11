import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import TransactionItem from "@/components/TransactionItem";
import { Transaction, useFinance } from "@/context/FinanceContext";
import { useColors } from "@/hooks/useColors";

type Filter = "all" | "income" | "expense";

function groupByDay(transactions: Transaction[]) {
  const groups: Record<string, Transaction[]> = {};
  transactions.forEach((t) => {
    const d = new Date(t.date);
    const key = d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
    if (!groups[key]) groups[key] = [];
    groups[key].push(t);
  });
  return Object.entries(groups).sort(
    ([a], [b]) => new Date(b).getTime() - new Date(a).getTime()
  );
}

const FILTER_LABELS: Record<Filter, string> = {
  all: "Все",
  income: "Доходы",
  expense: "Расходы",
};

export default function TransactionsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { transactions, monthIncome, monthExpense } = useFinance();
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const topPt = Platform.OS === "web" ? 67 : insets.top;

  const filtered = useMemo(() => {
    let txs = transactions;
    if (filter !== "all") txs = txs.filter((t) => t.type === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      txs = txs.filter(
        (t) =>
          t.merchant.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q)
      );
    }
    return txs;
  }, [transactions, filter, search]);

  const groups = groupByDay(filtered);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topArea, { paddingTop: topPt + 12 }]}>
        <Text style={[styles.pageTitle, { color: colors.foreground }]}>Транзакции</Text>

        <View style={[styles.searchWrap, { backgroundColor: colors.muted }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Поиск транзакций..."
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.filterRow}>
          {(["all", "income", "expense"] as Filter[]).map((f) => (
            <TouchableOpacity
              key={f}
              onPress={() => setFilter(f)}
              activeOpacity={0.7}
            >
              {filter === f ? (
                <LinearGradient colors={["#6B46C1", "#8B5CF6"]} style={styles.filterChip}>
                  <Text style={[styles.filterLabel, { color: "#FFFFFF" }]}>{FILTER_LABELS[f]}</Text>
                </LinearGradient>
              ) : (
                <View style={[styles.filterChip, { backgroundColor: colors.muted }]}>
                  <Text style={[styles.filterLabel, { color: colors.mutedForeground }]}>{FILTER_LABELS[f]}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}

          <View style={[styles.summaryPill, { backgroundColor: colors.muted }]}>
            <Text style={[styles.summaryText, { color: colors.income }]}>
              +{monthIncome.toFixed(0)} ₽
            </Text>
            <Text style={[styles.summaryDivider, { color: colors.border }]}>/</Text>
            <Text style={[styles.summaryText, { color: colors.expense }]}>
              −{monthExpense.toFixed(0)} ₽
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: 100 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {groups.length === 0 && (
          <View style={styles.empty}>
            <Feather name="inbox" size={40} color={colors.border} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Транзакции не найдены
            </Text>
          </View>
        )}
        {groups.map(([day, txs]) => (
          <View key={day}>
            <Text style={[styles.dayHeader, { color: colors.mutedForeground }]}>{day}</Text>
            {txs.map((t) => (
              <TransactionItem key={t.id} transaction={t} />
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topArea: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 12,
  },
  pageTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    flexWrap: "wrap",
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  filterLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  summaryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    marginLeft: "auto",
  },
  summaryText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  summaryDivider: { fontSize: 12 },
  list: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  dayHeader: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    marginTop: 16,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  empty: {
    paddingTop: 80,
    alignItems: "center",
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
});
