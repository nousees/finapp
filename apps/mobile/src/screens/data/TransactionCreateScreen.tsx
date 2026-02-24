import { StyleSheet, Text, View } from "react-native";
import { Screen } from "@shared/ui/Screen";
import { SectionCard } from "@shared/ui/SectionCard";
import { colors } from "@shared/theme/colors";
import { spacing } from "@shared/theme/spacing";

export function TransactionCreateScreen() {
  return (
    <Screen>
      <SectionCard title="Новая транзакция">
        <FakeField label="Сумма" value="например 1250.00" />
        <FakeField label="Тип" value="РАСХОД | ДОХОД | ПЕРЕВОД" />
        <FakeField label="Категория" value="Автоподсказка категории" />
        <FakeField label="Описание" value="Комментарий к операции" />
        <FakeField label="Дата" value="YYYY-MM-DD / DD.MM.YYYY" />
      </SectionCard>

      <SectionCard title="Сохранение">
        <Text style={styles.note}>Кнопка и валидации пока работают как визуальная заглушка.</Text>
        <View style={styles.button}>
          <Text style={styles.buttonText}>Сохранить транзакцию</Text>
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
    backgroundColor: colors.primaryDark,
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
