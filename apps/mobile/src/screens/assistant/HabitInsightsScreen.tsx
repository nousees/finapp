import { StyleSheet, Text, View } from "react-native";
import { Screen } from "@shared/ui/Screen";
import { SectionCard } from "@shared/ui/SectionCard";
import { colors } from "@shared/theme/colors";

export function HabitInsightsScreen() {
  return (
    <Screen>
      <SectionCard title="Детектор подписок">
        <InsightCard
          name="Видео-сервис"
          usage="Индекс использования: 24%"
          recommendation="Рекомендуется отключить: низкая активность за последние 45 дней."
        />
        <InsightCard
          name="Облачное хранилище"
          usage="Индекс использования: 82%"
          recommendation="Оставить активной: подписка активно используется."
        />
      </SectionCard>
    </Screen>
  );
}

function InsightCard({
  name,
  usage,
  recommendation,
}: {
  name: string;
  usage: string;
  recommendation: string;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.name}>{name}</Text>
      <Text style={styles.usage}>{usage}</Text>
      <Text style={styles.rec}>{recommendation}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    gap: 4,
    backgroundColor: colors.surface,
  },
  name: {
    color: colors.text,
    fontWeight: "700",
  },
  usage: {
    color: colors.warning,
    fontWeight: "600",
    fontSize: 12,
  },
  rec: {
    color: colors.textSecondary,
    fontSize: 12,
  },
});
