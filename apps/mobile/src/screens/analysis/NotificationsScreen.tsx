// @ts-nocheck
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { getUnreadNotificationCount, listNotifications, listRecommendations, markNotificationsRead } from "@shared/api/analysis";
import { useAppTheme } from "@shared/theme/ThemeProvider";

export function NotificationsScreen() {
  const { colors, gradients } = useAppTheme();
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
      setNotifications(notificationItems || []);
      setRecommendations((recommendationItems || []).slice(0, 5));
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
    <ScrollView style={[styles.scroll, { backgroundColor: colors.background }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={gradients.success} style={styles.headerCard}>
        <Text style={styles.headerLabel}>Центр уведомлений</Text>
        <Text style={styles.headerValue}>{unreadCount}</Text>
        <Text style={styles.headerText}>непрочитанных событий по бюджетам, целям и рекомендациям</Text>
      </LinearGradient>

      {loading ? <ActivityIndicator color={colors.primary} size="large" /> : null}
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

      <Panel title="Лента уведомлений">
        {notifications.length === 0 ? (
          <Empty text="Уведомлений пока нет." />
        ) : (
          notifications.map((item) => <NotificationCard key={item.id} item={item} />)
        )}
        {notifications.length > 0 ? (
          <Pressable onPress={markAllRead}>
            <LinearGradient colors={gradients.successDeep} style={styles.actionButton}>
              <Feather name="check-circle" size={18} color="#FFFFFF" />
              <Text style={styles.actionText}>Отметить все как прочитанные</Text>
            </LinearGradient>
          </Pressable>
        ) : null}
      </Panel>

      <Panel title="Рекомендации">
        {recommendations.length === 0 ? (
          <Empty text="Рекомендаций пока нет." />
        ) : (
          recommendations.map((item) => <RecommendationCard key={item.id} item={item} />)
        )}
      </Panel>
    </ScrollView>
  );
}

function Panel({ title, children }) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.panel, { backgroundColor: colors.surface }]}>
      <Text style={[styles.panelTitle, { color: colors.text }]}>{title}</Text>
      {children}
    </View>
  );
}

function NotificationCard({ item }) {
  const { colors } = useAppTheme();
  const isRead = Boolean(item.isRead);
  return (
    <View style={[styles.card, { backgroundColor: colors.backgroundAlt }]}>
      <View style={[styles.icon, { backgroundColor: isRead ? colors.border : `${colors.primary}20` }]}>
        <Feather name={isRead ? "bell" : "bell-ring"} size={17} color={isRead ? colors.textMuted : colors.primary} />
      </View>
      <View style={styles.cardText}>
        <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
        <Text style={[styles.body, { color: colors.textMuted }]}>{item.message}</Text>
        <Text style={[styles.meta, { color: colors.primary }]}>{formatDate(item.createdAt)}</Text>
      </View>
    </View>
  );
}

function RecommendationCard({ item }) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.backgroundAlt }]}>
      <View style={[styles.icon, { backgroundColor: `${colors.accent}40` }]}>
        <Feather name="zap" size={17} color={colors.primary} />
      </View>
      <View style={styles.cardText}>
        <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
        <Text style={[styles.body, { color: colors.textMuted }]}>{item.description}</Text>
        <Text style={[styles.meta, { color: colors.success }]}>Экономия: {Number(item.estimatedSavings || 0).toLocaleString("ru-RU")} ₽</Text>
      </View>
    </View>
  );
}

function Empty({ text }) {
  const { colors } = useAppTheme();
  return <Text style={[styles.empty, { color: colors.textMuted }]}>{text}</Text>;
}

function formatDate(value?: string | null) {
  if (!value) return "Без даты";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ru-RU");
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 120, gap: 14 },
  headerCard: { borderRadius: 20, padding: 22, gap: 5 },
  headerLabel: { color: "rgba(255,255,255,0.72)", fontSize: 12, fontFamily: "Inter_400Regular" },
  headerValue: { color: "#FFFFFF", fontSize: 38, fontFamily: "Inter_700Bold" },
  headerText: { color: "rgba(255,255,255,0.74)", fontSize: 13, lineHeight: 19, fontFamily: "Inter_400Regular" },
  panel: { borderRadius: 18, padding: 16, gap: 12 },
  panelTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  card: { flexDirection: "row", gap: 12, borderRadius: 14, padding: 12 },
  icon: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  cardText: { flex: 1, gap: 3 },
  title: { fontSize: 14, fontFamily: "Inter_700Bold" },
  body: { fontSize: 12, lineHeight: 18, fontFamily: "Inter_400Regular" },
  meta: { fontSize: 11, fontFamily: "Inter_600SemiBold", marginTop: 2 },
  actionButton: { minHeight: 48, borderRadius: 16, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  actionText: { color: "#FFFFFF", fontSize: 15, fontFamily: "Inter_700Bold" },
  empty: { fontSize: 13, lineHeight: 19, fontFamily: "Inter_400Regular" },
  error: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
