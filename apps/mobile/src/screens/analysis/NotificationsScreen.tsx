// @ts-nocheck
import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { getUnreadNotificationCount, listNotifications, listRecommendations, markNotificationsRead } from "@shared/api/analysis";
import { useAppTheme } from "@shared/theme/ThemeProvider";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function NotificationsScreen() {
  const navigation = useNavigation();
  const { colors, gradients } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [notificationItems, recommendationItems, unread] = await Promise.all([
        listNotifications({ page: 0, size: 30 }),
        listRecommendations().catch(() => []),
        getUnreadNotificationCount().catch(() => 0),
      ]);
      setNotifications(notificationItems || []);
      setRecommendations((recommendationItems || []).slice(0, 5));
      setUnreadCount(Number(unread || 0));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить уведомления");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void loadData();
    }, [loadData]),
  );

  const handleRefresh = () => {
    setRefreshing(true);
    void loadData();
  };

  const markAllRead = async () => {
    try {
      await markNotificationsRead([]);
      await loadData();
    } catch (markError) {
      setError(markError instanceof Error ? markError.message : "Не удалось отметить уведомления как прочитанные");
    }
  };

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 14 }]}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
    >
      <View style={styles.topBar}>
        <Pressable style={[styles.backButton, { backgroundColor: colors.surface }]} onPress={() => navigation.goBack()}>
          <Feather name="chevron-left" size={22} color={colors.text} />
        </Pressable>
        <Text style={[styles.screenTitle, { color: colors.text }]}>Уведомления</Text>
        <Pressable style={[styles.backButton, { backgroundColor: colors.surface }]} onPress={handleRefresh}>
          <Feather name="refresh-cw" size={18} color={colors.text} />
        </Pressable>
      </View>

      <LinearGradient colors={gradients.success} style={styles.headerCard}>
        <View style={styles.headerIcon}>
          <Feather name="bell" size={22} color="#1A1A2E" />
        </View>
        <Text style={styles.headerLabel}>Центр событий FinApp</Text>
        <Text style={styles.headerValue}>{unreadCount}</Text>
        <Text style={styles.headerText}>непрочитанных событий по бюджетам, целям, рекомендациям и крупным операциям</Text>
      </LinearGradient>

      {loading ? <ActivityIndicator color={colors.primary} size="large" /> : null}
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

      <Panel title="Лента уведомлений">
        {notifications.length === 0 ? (
          <Empty text="Пока нет уведомлений. FinApp добавит их, когда появятся важные события." />
        ) : (
          notifications.map((item) => <NotificationCard key={item.id} item={item} onMarkRead={loadData} />)
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

      <Panel title="Связанные рекомендации">
        {recommendations.length === 0 ? (
          <Empty text="Рекомендаций пока нет. Они появятся после анализа расходов, бюджетов и целей." />
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

function NotificationCard({ item, onMarkRead }) {
  const { colors } = useAppTheme();
  const isRead = Boolean(item.isRead);
  const meta = notificationMeta(item.type, colors);

  const markRead = async () => {
    if (isRead) return;
    await markNotificationsRead([item.id]);
    await onMarkRead();
  };

  return (
    <Pressable style={[styles.card, { backgroundColor: colors.backgroundAlt }]} onPress={markRead}>
      <View style={[styles.icon, { backgroundColor: isRead ? colors.border : meta.bg }]}>
        <Feather name={meta.icon} size={17} color={isRead ? colors.textMuted : meta.color} />
      </View>
      <View style={styles.cardText}>
        <View style={styles.cardHeader}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>{item.title}</Text>
          {!isRead ? <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} /> : null}
        </View>
        <Text style={[styles.body, { color: colors.textMuted }]}>{item.message}</Text>
        <Text style={[styles.meta, { color: meta.color }]}>{formatDate(item.createdAt)}</Text>
      </View>
    </Pressable>
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

function notificationMeta(type?: string, colors?: any) {
  switch ((type || "").toUpperCase()) {
    case "BUDGET_ALERT":
      return { icon: "pie-chart", color: "#F97316", bg: "#FFF7ED" };
    case "GOAL_PROGRESS":
      return { icon: "flag", color: "#10B981", bg: "#ECFDF5" };
    case "SUBSCRIPTION_REMINDER":
      return { icon: "repeat", color: "#6366F1", bg: "#EEF2FF" };
    case "LARGE_TRANSACTION":
      return { icon: "alert-triangle", color: "#EF4444", bg: "#FEF2F2" };
    case "RECOMMENDATION":
      return { icon: "zap", color: "#6B46C1", bg: "#F5F3FF" };
    default:
      return { icon: "bell", color: colors?.primary || "#6B46C1", bg: `${colors?.primary || "#6B46C1"}20` };
  }
}

function Empty({ text }) {
  const { colors } = useAppTheme();
  return <Text style={[styles.empty, { color: colors.textMuted }]}>{text}</Text>;
}

function formatDate(value?: string | null) {
  if (!value) return "Без даты";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 120, gap: 14 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 2 },
  backButton: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  screenTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  headerCard: { borderRadius: 20, padding: 22, gap: 5 },
  headerIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(255,255,255,0.86)", alignItems: "center", justifyContent: "center", marginBottom: 8 },
  headerLabel: { color: "rgba(255,255,255,0.72)", fontSize: 12, fontFamily: "Inter_400Regular" },
  headerValue: { color: "#FFFFFF", fontSize: 38, fontFamily: "Inter_700Bold" },
  headerText: { color: "rgba(255,255,255,0.78)", fontSize: 13, lineHeight: 19, fontFamily: "Inter_400Regular" },
  panel: { borderRadius: 18, padding: 16, gap: 12 },
  panelTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  card: { flexDirection: "row", gap: 12, borderRadius: 14, padding: 12 },
  icon: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  cardText: { flex: 1, gap: 3 },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  title: { flex: 1, fontSize: 14, fontFamily: "Inter_700Bold" },
  body: { fontSize: 12, lineHeight: 18, fontFamily: "Inter_400Regular" },
  meta: { fontSize: 11, fontFamily: "Inter_600SemiBold", marginTop: 2 },
  actionButton: { minHeight: 48, borderRadius: 16, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  actionText: { color: "#FFFFFF", fontSize: 15, fontFamily: "Inter_700Bold" },
  empty: { fontSize: 13, lineHeight: 19, fontFamily: "Inter_400Regular" },
  error: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
