import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { analyzeSubscriptions, ApiSubscription, listSubscriptions } from "@shared/api/subscriptions";
import { colors } from "@shared/theme/colors";
import { Screen } from "@shared/ui/Screen";
import { SectionCard } from "@shared/ui/SectionCard";

export function HabitInsightsScreen() {
  const [items, setItems] = useState<ApiSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSubscriptions = useCallback(async () => {
    try {
      setError(null);
      const result = await listSubscriptions();
      setItems(result);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить подписки");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void loadSubscriptions();
    }, [loadSubscriptions]),
  );

  const handleAnalyze = async () => {
    try {
      setAnalyzing(true);
      setError(null);
      const result = await analyzeSubscriptions();
      setItems(result);
    } catch (analyzeError) {
      setError(analyzeError instanceof Error ? analyzeError.message : "Не удалось пересчитать подписки");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <Screen>
      <SectionCard title="Детектор подписок" subtitle="Данные из subscription-detector">
        <Pressable style={styles.actionButton} onPress={() => void handleAnalyze()} disabled={analyzing}>
          {analyzing ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.actionButtonText}>Пересчитать подписки</Text>}
        </Pressable>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {loading ? (
          <ActivityIndicator color={colors.primaryDark} />
        ) : items.length === 0 ? (
          <Text style={styles.emptyText}>Подписок пока не найдено.</Text>
        ) : (
          items.map((item) => (
            <InsightCard
              key={item.id}
              name={item.name}
              usage={`Индекс использования: ${Math.round(item.usage_index * 100)}%`}
              recommendation={item.recommendation || "Подписка активна, явных рисков не обнаружено."}
            />
          ))
        )}
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
  actionButton: {
    height: 46,
    borderRadius: 14,
    backgroundColor: colors.primaryDark,
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
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
