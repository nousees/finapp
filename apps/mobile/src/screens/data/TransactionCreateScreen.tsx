import { StyleSheet, Text, View } from "react-native";
import { Screen } from "@shared/ui/Screen";
import { SectionCard } from "@shared/ui/SectionCard";
import { colors } from "@shared/theme/colors";
import { spacing } from "@shared/theme/spacing";

export function TransactionCreateScreen() {
  return (
    <Screen>
      <SectionCard title="Manual Transaction">
        <FakeField label="Amount" value="e.g. 1250.00" />
        <FakeField label="Type" value="EXPENSE | INCOME | TRANSFER" />
        <FakeField label="Category" value="Autocomplete placeholder" />
        <FakeField label="Description" value="Optional notes" />
        <FakeField label="Date" value="YYYY-MM-DD / DD.MM.YYYY" />
      </SectionCard>

      <SectionCard title="Validation Stub">
        <Text style={styles.note}>Button and validation states are UI placeholders only.</Text>
        <View style={styles.button}>
          <Text style={styles.buttonText}>Save Transaction</Text>
        </View>
      </SectionCard>
    </Screen>
  );
}

function FakeField({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.field}>
        <Text style={styles.value}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fieldWrap: {
    gap: 6,
  },
  label: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "600",
  },
  field: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
    padding: spacing.sm,
  },
  value: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  note: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
});
