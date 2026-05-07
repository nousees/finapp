// @ts-nocheck
import React from "react";
import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { generateRecommendations, getFinancialInsights, listRecommendations, listReports } from "@shared/api/analysis";
import { Screen } from "@shared/ui/Screen";
import { SectionCard } from "@shared/ui/SectionCard";
import { colors } from "@shared/theme/colors";

export function ReportsScreen() {
  const [insights, setInsights] = useState(null);
  const [reports, setReports] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [insightData, reportItems, recommendationItems] = await Promise.all([
        getFinancialInsights(),
        listReports().catch(() => []),
        listRecommendations().catch(() => []),
      ]);
      setInsights(insightData);
      setReports(reportItems);
      setRecommendations(recommendationItems);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить отчеты");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void loadData();
    }, [loadData]),
  );

  const handleGenerateRecommendations = async () => {
    try {
      setGenerating(true);
      await generateRecommendations();
      await loadData();
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : "Не удалось сформировать рекомендации");
    } finally {
      setGenerating(false);
    }
  };

  const categories = insights?.categories || [];
  const budgets = insights?.budgets || [];

  return (
    <Screen>
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.primaryDark} size="large" />
        </View>
      ) : null}

      <SectionCard title="Структура расходов">
        {categories.length === 0 ? (
          <Text style={styles.emptyText}>Пока нет данных по категориям.</Text>
        ) : (
          categories.slice(0, 6).map((item) => (
            <FakeBar
              key={item.categoryId || item.categoryName}
              label={item.categoryName}
              value={`${Math.round(Number(item.percentage || 0))}%`}
              width={`${Math.min(Math.round(Number(item.percentage || 0)), 100)}%`}
            />
          ))
        )}
      </SectionCard>

      <SectionCard title="Статус бюджетов">
        {budgets.length === 0 ? (
          <Text style={styles.emptyText}>Бюджеты еще не созданы.</Text>
        ) : (
          budgets.slice(0, 5).map((item) => (
            <View key={item.budgetId} style={styles.reportCard}>
              <Text style={styles.reportTitle}>{item.categoryName}</Text>
              <Text style={styles.reportText}>{item.message}</Text>
            </View>
          ))
        )}
      </SectionCard>

      <SectionCard title="Сформированные рекомендации">
        {recommendations.length === 0 ? (
          <Text style={styles.emptyText}>Рекомендаций пока нет.</Text>
        ) : (
          recommendations.slice(0, 5).map((item) => (
            <View key={item.id} style={styles.reportCard}>
              <Text style={styles.reportTitle}>{item.title}</Text>
              <Text style={styles.reportText}>{item.description}</Text>
            </View>
          ))
        )}
        <Pressable style={styles.actionButton} onPress={() => void handleGenerateRecommendations()} disabled={generating}>
          <Text style={styles.actionButtonText}>{generating ? "Формирование..." : "Сформировать рекомендации заново"}</Text>
        </Pressable>
      </SectionCard>

      <SectionCard title="История отчетов">
        {reports.length === 0 ? (
          <Text style={styles.emptyText}>Готовых отчетов пока нет.</Text>
        ) : (
          reports.map((item) => (
            <View key={item.id} style={styles.reportCard}>
              <Text style={styles.reportTitle}>{item.reportType}</Text>
              <Text style={styles.reportText}>
                {item.periodStart} - {item.periodEnd}
              </Text>
            </View>
          ))
        )}
      </SectionCard>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </Screen>
  );
}

function FakeBar({ label, value, width }: { label: string; value: string; width: `${number}%` }) {
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

const styles = StyleSheet.create({
  loadingWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
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
  reportCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    backgroundColor: colors.surface,
    gap: 3,
  },
  reportTitle: {
    fontWeight: "700",
    color: colors.text,
  },
  reportText: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  actionButton: {
    marginTop: 6,
    borderRadius: 12,
    backgroundColor: colors.primaryDark,
    paddingVertical: 12,
    alignItems: "center",
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    lineHeight: 18,
  },
});
