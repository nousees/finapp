import { StyleSheet, Text, View } from "react-native";
import { Screen } from "@shared/ui/Screen";
import { SectionCard } from "@shared/ui/SectionCard";
import { colors } from "@shared/theme/colors";

export function ReportsScreen() {
  return (
    <Screen>
      <SectionCard title="Структура расходов">
        <FakeBar label="Питание" value="34%" width="34%" />
        <FakeBar label="Транспорт" value="21%" width="21%" />
        <FakeBar label="Дом" value="18%" width="18%" />
        <FakeBar label="Развлечения" value="11%" width="11%" />
      </SectionCard>

      <SectionCard title="Динамика по неделям">
        <View style={styles.weekRow}>
          <WeekBar height={64} />
          <WeekBar height={88} />
          <WeekBar height={52} />
          <WeekBar height={95} />
          <WeekBar height={74} />
        </View>
      </SectionCard>

      <SectionCard title="Экспорт">
        <View style={styles.exportCard}>
          <Text style={styles.exportTitle}>Экспорт PDF</Text>
          <Text style={styles.exportSub}>Подключение к `analysis-control` будет добавлено на следующем этапе.</Text>
        </View>
      </SectionCard>
    </Screen>
  );
}

function FakeBar({ label, value, width }: { label: string; value: string; width: string }) {
  return (
    <View style={styles.barItem}>
      <View style={styles.barHead}>
        <Text style={styles.barLabel}>{label}</Text>
        <Text style={styles.barValue}>{value}</Text>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width }]} />
      </View>
    </View>
  );
}

function WeekBar({ height }: { height: number }) {
  return <View style={[styles.weekBar, { height }]} />;
}

const styles = StyleSheet.create({
  barItem: {
    gap: 6,
  },
  barHead: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  barLabel: {
    color: colors.text,
    fontWeight: "700",
  },
  barTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: "#DCFCE7",
  },
  barFill: {
    height: 10,
    borderRadius: 999,
    backgroundColor: colors.primaryDark,
  },
  barValue: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  weekRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingVertical: 6,
  },
  weekBar: {
    width: 20,
    borderRadius: 6,
    backgroundColor: colors.primary,
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
    lineHeight: 18,
  },
});
