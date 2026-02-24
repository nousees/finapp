import { StyleSheet, Text, View } from "react-native";
import { Screen } from "@shared/ui/Screen";
import { SectionCard } from "@shared/ui/SectionCard";
import { recentTransactions } from "@shared/mocks/fixtures";
import { colors } from "@shared/theme/colors";
import { spacing } from "@shared/theme/spacing";

export function TransactionsListScreen() {
  return (
    <Screen>
      <SectionCard title="Поиск и фильтры" subtitle="Интерфейс без бизнес-логики">
        <View style={styles.fakeInput}>
          <Text style={styles.fakeInputText}>Поиск по месту, сумме и категории...</Text>
        </View>
        <View style={styles.row}>
          <Tag label="Все" active />
          <Tag label="Расходы" />
          <Tag label="Доходы" />
          <Tag label="Голос" />
        </View>
      </SectionCard>

      <SectionCard title="Последние транзакции">
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
      <View style={styles.fabWrap}>
        <View style={styles.micFab}>
          <Text style={styles.micFabText}>●</Text>
        </View>
        <View style={styles.plusFab}>
          <Text style={styles.fabText}>+</Text>
        </View>
      </View>
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
    backgroundColor: colors.primaryDark,
    borderColor: colors.primaryDark,
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
  fabWrap: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 4,
    marginBottom: 24,
  },
  plusFab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 12,
    elevation: 4,
  },
  micFab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.primary,
  },
  fabText: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
    marginTop: -2,
  },
  micFabText: {
    color: colors.primaryDark,
    fontSize: 18,
    fontWeight: "800",
    marginTop: -1,
  },
});
