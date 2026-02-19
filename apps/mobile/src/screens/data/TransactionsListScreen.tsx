import { StyleSheet, Text, View } from "react-native";
import { Screen } from "@shared/ui/Screen";
import { SectionCard } from "@shared/ui/SectionCard";
import { recentTransactions } from "@shared/mocks/fixtures";
import { colors } from "@shared/theme/colors";
import { spacing } from "@shared/theme/spacing";

export function TransactionsListScreen() {
  return (
    <Screen>
      <SectionCard title="Search & Filters" subtitle="UI-only placeholders">
        <View style={styles.fakeInput}>
          <Text style={styles.fakeInputText}>Search by merchant, amount, category...</Text>
        </View>
        <View style={styles.row}>
          <Tag label="All" active />
          <Tag label="Expense" />
          <Tag label="Income" />
          <Tag label="Voice" />
        </View>
      </SectionCard>

      <SectionCard title="Recent Transactions">
        {recentTransactions.map((item) => (
          <View key={item.id} style={styles.item}>
            <View>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.itemMeta}>{item.category} | {item.date}</Text>
            </View>
            <Text style={[styles.amount, item.kind === "INCOME" ? styles.income : styles.expense]}>{item.amount}</Text>
          </View>
        ))}
      </SectionCard>
    </Screen>
  );
}

function Tag({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <View style={[styles.tag, active ? styles.tagActive : undefined]}>
      <Text style={[styles.tagText, active ? styles.tagTextActive : undefined]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fakeInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
    padding: spacing.sm,
  },
  fakeInputText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  tag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tagText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  tagTextActive: {
    color: "#fff",
  },
  item: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
    padding: spacing.sm,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemTitle: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 14,
  },
  itemMeta: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  amount: {
    fontWeight: "700",
    fontSize: 14,
  },
  expense: {
    color: colors.danger,
  },
  income: {
    color: colors.success,
  },
});
