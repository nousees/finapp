// @ts-nocheck
import React from "react";
import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { getUnreadNotificationCount, listNotifications, listRecommendations, markNotificationsRead } from "@shared/api/analysis";
import { Screen } from "@shared/ui/Screen";
import { SectionCard } from "@shared/ui/SectionCard";
import { useAppTheme } from "@shared/theme/ThemeProvider";
import { radius, spacing } from "@shared/theme/spacing";

export function NotificationsScreen() {
  const { colors } = useAppTheme();
  const [notifications, setNotifications] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [notificationItems, recommendationItems, unread] = await Promise.all([
        listNotifications({ page: 0, size: 20 }),
        listRecommendations().catch(() => []),
        getUnreadNotificationCount().catch(() => 0),
      ]);
      setNotifications(notificationItems);
      setRecommendations(recommendationItems.slice(0, 5));
      setUnreadCount(unread);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить уведомления");
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

  const markAllRead = async () => {
    try {
      await markNotificationsRead([]);
      await loadData();
    } catch (markError) {
      setError(markError instanceof Error ? markError.message : "Не удалось отметить уведомления как прочитанные");
    }
  };

  return (
    <Screen>
      <SectionCard title="Лента уведомлений" subtitle={`Непрочитанных: ${unreadCount}`}>
        {loading ? (
          <View style={styles.stateWrap}>
            <ActivityIndicator color={colors.primaryDark} size="large" />
          </View>
        ) : notifications.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>Уведомлений пока нет.</Text>
        ) : (
          notifications.map((item) => (
            <View
              key={item.id}
              style={[
                styles.item,
                {
                  borderColor: item.isRead ? colors.border : colors.primaryDark,
                  backgroundColor: colors.surface,
                },
              ]}
            >
              <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
              <Text style={[styles.body, { color: colors.textSecondary }]}>{item.message}</Text>
              <Text style={[styles.time, { color: colors.accent }]}>{formatDate(item.createdAt)}</Text>
            </View>
          ))
        )}

        {notifications.length > 0 ? (
          <Pressable style={[styles.markReadButton, { borderColor: colors.borderStrong }]} onPress={() => void markAllRead()}>
            <Text style={[styles.markReadText, { color: colors.primaryDark }]}>Отметить все как прочитанные</Text>
          </Pressable>
        ) : null}
      </SectionCard>

      <SectionCard title="Рекомендации" subtitle="Персональные советы по финансам">
        {recommendations.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>Рекомендаций пока нет.</Text>
        ) : (
          recommendations.map((item) => (
            <View key={item.id} style={[styles.recommendationCard, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}>
              <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
              <Text style={[styles.body, { color: colors.textSecondary }]}>{item.description}</Text>
              <Text style={[styles.time, { color: colors.primaryDark }]}>
                Потенциальная экономия: {Number(item.estimatedSavings || 0).toLocaleString("ru-RU")} ₽
              </Text>
            </View>
          ))
        )}
      </SectionCard>

      {error ? <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text> : null}
    </Screen>
  );
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "Без даты";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ru-RU");
}

const styles = StyleSheet.create({
  stateWrap: {
    paddingVertical: spacing.lg,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
  },
  item: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  title: {
    fontWeight: "700",
    fontSize: 14,
  },
  body: {
    fontSize: 12,
    lineHeight: 18,
  },
  time: {
    fontSize: 11,
    marginTop: 4,
  },
  markReadButton: {
    borderWidth: 1,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  markReadText: {
    fontSize: 13,
    fontWeight: "700",
  },
  recommendationCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  errorText: {
    fontSize: 14,
    fontWeight: "500",
  },
});
