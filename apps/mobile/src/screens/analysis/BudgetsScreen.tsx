import { StyleSheet, Text, View } from "react-native";
import { Screen } from "@shared/ui/Screen";
import { SectionCard } from "@shared/ui/SectionCard";
import { budgets } from "@shared/mocks/fixtures";
import { colors } from "@shared/theme/colors";

export function BudgetsScreen() {
  return (
    <Screen>
      <SectionCard title="Budget by Category">
        {budgets.map((item) => (
          <View key={item.id} style={styles.item}>
            <View style={styles.header}>
              <Text style={styles.title}>{item.category}</Text>
              <Text style={styles.meta}>{item.spent} / {item.limit}</Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${Math.min(item.progress * 100, 100)}%` }]} />
            </View>
          </View>
        ))}
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  item: {
    gap: 6,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  title: {
    color: colors.text,
    fontWeight: "700",
  },
  meta: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  track: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
    overflow: "hidden",
  },
  fill: {
    height: 8,
    backgroundColor: colors.warning,
  },
});
