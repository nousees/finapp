import { StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "@shared/theme/ThemeProvider";
import { radius, spacing } from "@shared/theme/spacing";

type MetricPillProps = {
  label: string;
  value: string;
};

export function MetricPill({ label, value }: MetricPillProps) {
  const { colors } = useAppTheme();

  return (
    <View style={[styles.pill, { backgroundColor: colors.surfaceAlt, borderColor: colors.borderStrong }]}>
      <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.value, { color: colors.primaryDark }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    gap: 2,
    minWidth: 120,
  },
  label: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  value: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
});
