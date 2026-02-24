import { StyleSheet, Text, View } from "react-native";
import { colors } from "@shared/theme/colors";
import { spacing } from "@shared/theme/spacing";

type MetricPillProps = {
  label: string;
  value: string;
};

export function MetricPill({ label, value }: MetricPillProps) {
  return (
    <View style={styles.pill}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    backgroundColor: colors.backgroundGreen,
    borderRadius: 12,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    gap: 2,
    minWidth: 120,
  },
  label: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  value: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.primaryDark,
  },
});
