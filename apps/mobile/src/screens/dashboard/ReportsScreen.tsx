import { StyleSheet, Text, View } from "react-native";
import { Screen } from "@shared/ui/Screen";
import { SectionCard } from "@shared/ui/SectionCard";
import { colors } from "@shared/theme/colors";

export function ReportsScreen() {
  return (
    <Screen>
      <SectionCard title="Spend by Category">
        <FakeBar label="Food" value="34%" />
        <FakeBar label="Transport" value="21%" />
        <FakeBar label="Home" value="18%" />
      </SectionCard>

      <SectionCard title="Export">
        <View style={styles.exportCard}>
          <Text style={styles.exportTitle}>PDF export placeholder</Text>
          <Text style={styles.exportSub}>Will be connected to analysis-control API.</Text>
        </View>
      </SectionCard>
    </Screen>
  );
}

function FakeBar({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.barItem}>
      <Text style={styles.barLabel}>{label}</Text>
      <View style={styles.barTrack}>
        <View style={styles.barFill} />
      </View>
      <Text style={styles.barValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  barItem: {
    gap: 4,
  },
  barLabel: {
    color: colors.text,
    fontWeight: "600",
  },
  barTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
  },
  barFill: {
    height: 8,
    width: "60%",
    borderRadius: 999,
    backgroundColor: colors.accent,
  },
  barValue: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  exportCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    backgroundColor: colors.surface,
    gap: 3,
  },
  exportTitle: {
    fontWeight: "700",
    color: colors.text,
  },
  exportSub: {
    color: colors.textSecondary,
    fontSize: 12,
  },
});
