import { useCallback, useMemo, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Swipeable } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TransactionsStackParamList } from "@app/navigation/types";
import { processPendingTransactions } from "@shared/api/processing";
import { ApiTransaction, listTransactions } from "@shared/api/transactions";
import { useAppTheme } from "@shared/theme/ThemeProvider";
import { radius, spacing } from "@shared/theme/spacing";
import { Screen } from "@shared/ui/Screen";

type Props = NativeStackScreenProps<TransactionsStackParamList, "TransactionsList">;

type TransactionListItem = {
  id: string;
  title: string;
  category: string;
  date: string;
  amount: string;
  kind: "income" | "expense";
  icon: keyof typeof MaterialIcons.glyphMap;
  raw: ApiTransaction;
};

const filters = ["Дата", "Категория", "Доход/расход"];

export function TransactionsListScreen({ navigation }: Props) {
  const { colors, gradients } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const [transactions, setTransactions] = useState<ApiTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lastOffsetRef = useRef(0);
  const fabVisibleRef = useRef(true);
  const fabAnimation = useRef(new Animated.Value(1)).current;

  const loadTransactions = useCallback(async () => {
    try {
      setError(null);
      const items = await listTransactions(search);
      setTransactions(items);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить транзакции");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void loadTransactions();
    }, [loadTransactions]),
  );

  const items = useMemo(
    () =>
      (transactions || [])
        .filter((item) =>
          `${item.description || ""} ${item.original_description || ""}`.toLowerCase().includes(search.trim().toLowerCase()),
        )
        .map(mapTransactionToItem),
    [search, transactions],
  );

  const setFabVisibility = (visible: boolean) => {
    if (fabVisibleRef.current === visible) {
      return;
    }

    fabVisibleRef.current = visible;
    Animated.timing(fabAnimation, {
      toValue: visible ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  };

  const handleListScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = event.nativeEvent.contentOffset.y;
    const delta = y - lastOffsetRef.current;

    if (delta > 6 && y > 24) {
      setFabVisibility(false);
    } else if (delta < -6 || y <= 0) {
      setFabVisibility(true);
    }

    lastOffsetRef.current = y;
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadTransactions();
  };

  const handleProcess = async () => {
    try {
      setProcessing(true);
      setError(null);
      await processPendingTransactions();
      await loadTransactions();
    } catch (processError) {
      setError(processError instanceof Error ? processError.message : "Не удалось запустить категоризацию");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Screen scroll={false}>
      <View style={styles.page}>
        <View style={styles.filtersRow}>
          {filters.map((filter) => (
            <Pressable key={filter} style={[styles.filterChip, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}>
              <Text style={[styles.filterChipText, { color: colors.textSecondary }]}>{filter}</Text>
              <MaterialIcons name="expand-more" size={16} color={colors.textMuted} />
            </Pressable>
          ))}
        </View>

        <View style={[styles.searchWrap, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <MaterialIcons name="search" size={20} color={colors.textMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Поиск по описанию"
            placeholderTextColor={colors.textMuted}
            style={[styles.searchInput, { color: colors.text }]}
          />
          <Pressable onPress={() => void loadTransactions()}>
            <MaterialIcons name="sync" size={20} color={colors.primaryDark} />
          </Pressable>
        </View>

        <Pressable
          style={[styles.processButton, { borderColor: colors.borderStrong, backgroundColor: colors.surface }]}
          onPress={handleProcess}
          disabled={processing}
        >
          {processing ? <ActivityIndicator color={colors.primaryDark} /> : <MaterialIcons name="auto-awesome" size={18} color={colors.primaryDark} />}
          <Text style={[styles.processButtonText, { color: colors.primaryDark }]}>Категоризировать непроверенные</Text>
        </Pressable>

        {error ? <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text> : null}

        {loading ? (
          <View style={styles.stateWrap}>
            <ActivityIndicator color={colors.primaryDark} size="large" />
          </View>
        ) : (
          <FlatList
            style={styles.list}
            contentContainerStyle={styles.listContent}
            data={items}
            keyExtractor={(item) => item.id}
            onScroll={handleListScroll}
            onRefresh={() => void handleRefresh()}
            refreshing={refreshing}
            scrollEventThrottle={16}
            renderItem={({ item }) => (
              <Swipeable renderRightActions={() => <SwipeActions />} overshootRight={false}>
                <View style={[styles.rowCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.rowLeft}>
                    <View style={[styles.rowIcon, { backgroundColor: colors.surfaceAlt }]}>
                      <MaterialIcons name={item.icon} size={20} color={colors.primaryDark} />
                    </View>
                    <View style={styles.rowTextWrap}>
                      <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={[styles.rowMeta, { color: colors.textMuted }]}>
                        {item.category}
                        {item.raw.is_recurring ? " • Подписка" : ""}
                        {!item.raw.is_verified ? " • Требует обработки" : ""}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.rowRight}>
                    <Text style={[styles.rowAmount, { color: item.kind === "income" ? colors.success : colors.text }]}>{item.amount}</Text>
                    <Text style={[styles.rowDate, { color: colors.textMuted }]}>{item.date}</Text>
                  </View>
                </View>
              </Swipeable>
            )}
            ListEmptyComponent={
              <View style={styles.stateWrap}>
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>Транзакции пока не найдены.</Text>
              </View>
            }
            showsVerticalScrollIndicator={false}
          />
        )}

        <Animated.View
          style={[
            styles.fabWrap,
            {
              bottom: insets.bottom + 84,
              opacity: fabAnimation,
              transform: [
                {
                  translateY: fabAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [96, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Pressable
            style={[styles.micFab, { borderColor: colors.primary, backgroundColor: colors.surface }]}
            onPress={() => navigation.navigate("VoiceCapture")}
          >
            <MaterialIcons name="mic-none" size={24} color={colors.primaryDark} />
          </Pressable>

          <Pressable style={styles.plusFab} onPress={() => navigation.navigate("TransactionCreate")}>
            <LinearGradient colors={gradients.success} style={styles.plusFabGradient}>
              <MaterialIcons name="add" size={26} color={colors.white} />
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </View>
    </Screen>
  );
}

function SwipeActions() {
  return (
    <View style={styles.swipeActions}>
      <Pressable style={[styles.swipeButton, styles.editButton]}>
        <MaterialIcons name="edit" size={18} color="#FFFFFF" />
      </Pressable>
      <Pressable style={[styles.swipeButton, styles.deleteButton]}>
        <MaterialIcons name="delete-outline" size={18} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

function mapTransactionToItem(item: ApiTransaction): TransactionListItem {
  const title = item.description || item.original_description || "Без описания";
  return {
    id: item.id,
    title,
    category: inferCategory(item),
    date: formatDate(item.date),
    amount: formatAmount(item.amount, item.currency, item.type),
    kind: item.type === "INCOME" ? "income" : "expense",
    icon: iconForTransaction(item),
    raw: item,
  };
}

function inferCategory(item: ApiTransaction): string {
  if (item.type === "INCOME") {
    return "Доход";
  }
  if (item.is_recurring) {
    return "Подписки";
  }
  return item.is_verified ? "Категоризировано" : "Без категории";
}

function iconForTransaction(item: ApiTransaction): keyof typeof MaterialIcons.glyphMap {
  if (item.type === "INCOME") {
    return "payments";
  }
  if (item.is_recurring) {
    return "subscriptions";
  }
  return "shopping-bag";
}

function formatDate(value: string): string {
  const date = new Date(value);
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

function formatAmount(amount: number, currency: string, type: ApiTransaction["type"]): string {
  const sign = type === "INCOME" ? "+" : "-";
  return `${sign}${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(Math.abs(amount))} ${currency}`;
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  filtersRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 2,
  },
  filterChipText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  searchWrap: {
    marginTop: 2,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 8,
    height: 54,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  processButton: {
    marginTop: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  processButtonText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  errorText: {
    marginTop: spacing.xs,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  list: {
    flex: 1,
    marginTop: spacing.sm,
  },
  listContent: {
    gap: spacing.sm,
    paddingBottom: 180,
  },
  rowCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.sm,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 72,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  rowTextWrap: {
    flex: 1,
  },
  rowIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  rowMeta: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  rowRight: {
    alignItems: "flex-end",
    gap: 2,
    marginLeft: spacing.sm,
  },
  rowAmount: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  rowDate: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  swipeActions: {
    flexDirection: "row",
    gap: 8,
    paddingRight: 2,
    alignItems: "center",
  },
  swipeButton: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  editButton: {
    backgroundColor: "#16A34A",
  },
  deleteButton: {
    backgroundColor: "#EF4444",
  },
  fabWrap: {
    position: "absolute",
    right: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  micFab: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  plusFab: {
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 14,
    elevation: 4,
  },
  plusFabGradient: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
  },
  stateWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
});
