import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { DashboardStackParamList } from "@app/navigation/types";
import { Screen } from "@shared/ui/Screen";
import { SectionCard } from "@shared/ui/SectionCard";
import { MetricPill } from "@shared/ui/MetricPill";
import { ActionTile } from "@shared/ui/ActionTile";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "@shared/theme/colors";

type Props = NativeStackScreenProps<DashboardStackParamList, "DashboardHome">;

export function DashboardHomeScreen({ navigation }: Props) {
  return (
    <Screen>
      <SectionCard title="Осталось на месяц" subtitle="Февраль 2026">
        <Text style={styles.balance}>51 350 ₽</Text>
        <View style={styles.metrics}>
          <MetricPill label="Доходы" value="+143 200 ₽" />
          <MetricPill label="Расходы" value="-91 850 ₽" />
        </View>
        <View style={styles.chart}>
          <Segment width="46%" color={colors.primaryDark} label="Питание" />
          <Segment width="28%" color={colors.primary} label="Транспорт" />
          <Segment width="14%" color={colors.primaryLight} label="Дом" />
          <Segment width="12%" color="#CBD5E1" label="Другое" />
        </View>
      </SectionCard>

      <SectionCard title="Цели месяца" subtitle="Прогресс накоплений">
        <GoalRow title="Подушка безопасности" value="48%" />
        <GoalRow title="Отпуск" value="63%" />
      </SectionCard>

      <SectionCard title="Быстрый доступ">
        <ActionTile
          title="Отчеты и аналитика"
          description="Графики по категориям, динамика и экспорт PDF."
          onPress={() => navigation.navigate("Reports")}
        />
      </SectionCard>
    </Screen>
  );
}

function Segment({ width, color, label }: { width: string; color: string; label: string }) {
  return (
    <View style={[styles.segment, { width, backgroundColor: color }]}>
      <Text style={styles.segmentText}>{label}</Text>
    </View>
  );
}

function GoalRow({ title, value }: { title: string; value: string }) {
  return (
    <View style={styles.goalRow}>
      <Text style={styles.goalTitle}>{title}</Text>
      <View style={styles.goalTrack}>
        <View style={[styles.goalFill, { width: value }]} />
      </View>
      <Text style={styles.goalValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  balance: {
    fontSize: 38,
    fontWeight: "800",
    color: colors.primaryDark,
  },
  metrics: {
    flexDirection: "row",
    gap: 10,
  },
  chart: {
    flexDirection: "row",
    borderRadius: 14,
    overflow: "hidden",
    height: 42,
    backgroundColor: "#E2E8F0",
  },
  segment: {
    justifyContent: "center",
    alignItems: "center",
  },
  segmentText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  goalRow: {
    gap: 6,
  },
  goalTitle: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 13,
  },
  goalTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: "#DCFCE7",
    overflow: "hidden",
  },
  goalFill: {
    height: 10,
    borderRadius: 999,
    backgroundColor: colors.primaryDark,
  },
  goalValue: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
});
