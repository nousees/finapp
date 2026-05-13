// @ts-nocheck
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TransactionsStackParamList } from "@app/navigation/types";
import { processPendingTransactions } from "@shared/api/processing";
import { ApiTransaction, listTransactions, updateTransaction } from "@shared/api/transactions";
import { getCategoryById } from "@shared/constants/categories";
import { useAppSettings } from "@shared/settings/AppSettingsContext";
import { useAppTheme } from "@shared/theme/ThemeProvider";

type Props = NativeStackScreenProps<TransactionsStackParamList, "TransactionsList">;
type Filter = "all" | "income" | "expense" | "review";

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: "all", label: "Все" },
  { id: "expense", label: "Расходы" },
  { id: "income", label: "Доходы" },
  { id: "review", label: "На проверку" },
];

export function TransactionsListScreen({ navigation }: Props) {
  const { colors, gradients } = useAppTheme();
  const { formatMoney } = useAppSettings();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [transactions, setTransactions] = useState<ApiTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTransactions = useCallback(async () => {
    try {
      setError(null);
      const apiType = filter === "income" ? "INCOME" : filter === "expense" ? "EXPENSE" : undefined;
      const items = await listTransactions({ q: search, type: apiType, limit: 80 });
      setTransactions(Array.isArray(items) ? items : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить транзакции");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter, search]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void loadTransactions();
    }, [loadTransactions]),
  );

  const filtered = useMemo(() => {
    let items = Array.isArray(transactions) ? [...transactions] : [];
    if (filter === "review") items = items.filter((item) => !item.is_verified);
    const q = search.trim().toLowerCase();
    if (q) {
      items = items.filter((item) => `${item.description || ""} ${item.original_description || ""}`.toLowerCase().includes(q));
    }
    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [filter, search, transactions]);

  const groups = useMemo(() => groupByDay(filtered), [filtered]);
  const monthIncome = filtered.filter((item) => item.type === "INCOME").reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const monthExpense = filtered.filter((item) => item.type === "EXPENSE").reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const topPt = Platform.OS === "web" ? 42 : insets.top;

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
      setError(processError instanceof Error ? processError.message : "Не удалось запустить ML-категоризацию");
    } finally {
      setProcessing(false);
    }
  };

  const markVerified = async (item: ApiTransaction) => {
    try {
      const updated = await updateTransaction(item.id, { is_verified: true });
      setTransactions((current) => current.map((tx) => (tx.id === item.id ? updated : tx)));
    } catch (verifyError) {
      Alert.alert("Ошибка", verifyError instanceof Error ? verifyError.message : "Не удалось подтвердить транзакцию");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topArea, { paddingTop: topPt + 14 }]}>
        <View style={styles.titleRow}>
          <Text style={[styles.pageTitle, { color: colors.text }]}>Транзакции</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={handleProcess} activeOpacity={0.75} disabled={processing}>
              <LinearGradient colors={gradients.successDeep} style={styles.iconAction}>
                {processing ? <ActivityIndicator color="#FFFFFF" /> : <Feather name="zap" size={18} color="#FFFFFF" />}
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate("ImportCenter")} style={[styles.iconActionMuted, { backgroundColor: colors.surfaceAlt }]} activeOpacity={0.75}>
              <Feather name="upload" size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.searchWrap, { backgroundColor: colors.backgroundAlt }]}>
          <Feather name="search" size={16} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Поиск транзакций..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            onSubmitEditing={() => void loadTransactions()}
          />
          {search.length > 0 ? (
            <Pressable onPress={() => setSearch("")}>
              <Feather name="x" size={16} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {FILTERS.map((item) => (
            <TouchableOpacity key={item.id} onPress={() => setFilter(item.id)} activeOpacity={0.75}>
              {filter === item.id ? (
                <LinearGradient colors={gradients.successDeep} style={styles.filterChip}>
                  <Text style={styles.filterActiveText}>{item.label}</Text>
                </LinearGradient>
              ) : (
                <View style={[styles.filterChip, { backgroundColor: colors.backgroundAlt }]}>
                  <Text style={[styles.filterText, { color: colors.textMuted }]}>{item.label}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
          <View style={[styles.summaryPill, { backgroundColor: colors.backgroundAlt }]}>
            <Text style={[styles.summaryText, { color: colors.success }]}>+{formatCompact(monthIncome, formatMoney)}</Text>
            <Text style={[styles.summaryDivider, { color: colors.border }]}>/</Text>
            <Text style={[styles.summaryText, { color: colors.danger }]}>-{formatCompact(monthExpense, formatMoney)}</Text>
          </View>
        </ScrollView>

        {error ? (
          <Pressable style={[styles.errorCard, { backgroundColor: colors.surfaceAlt }]} onPress={() => void loadTransactions()}>
            <Feather name="refresh-cw" size={16} color={colors.primary} />
            <Text style={[styles.errorText, { color: colors.text }]} numberOfLines={2}>{error}</Text>
          </Pressable>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.list, { paddingBottom: 120 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          refreshControl={undefined}
        >
          {groups.length === 0 ? (
            <View style={styles.empty}>
              <Feather name="inbox" size={40} color={colors.border} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>Транзакции не найдены</Text>
              <TouchableOpacity onPress={() => navigation.navigate("TransactionCreate")} activeOpacity={0.8}>
                <LinearGradient colors={gradients.successDeep} style={styles.emptyButton}>
                  <Feather name="plus" size={18} color="#FFFFFF" />
                  <Text style={styles.emptyButtonText}>Добавить вручную</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            groups.map(([day, txs]) => (
              <View key={day}>
                <Text style={[styles.dayHeader, { color: colors.textMuted }]}>{day}</Text>
                {txs.map((tx) => (
                  <TransactionCard key={tx.id} item={tx} onPress={() => navigation.navigate("TransactionDetail", { transaction: tx })} onVerify={() => markVerified(tx)} />
                ))}
              </View>
            ))
          )}
        </ScrollView>
      )}

    </View>
  );
}

function TransactionCard({ item, onPress, onVerify }: { item: ApiTransaction; onPress: () => void; onVerify: () => void }) {
  const { colors } = useAppTheme();
  const { formatMoney } = useAppSettings();
  const isIncome = item.type === "INCOME";
  const category = getCategoryById(item.category_id);
  const icon = isIncome ? "arrow-down-left" : item.is_recurring ? "repeat" : category?.icon || "shopping-bag";
  const accent = isIncome ? colors.success : item.is_recurring ? colors.warning : category?.color || colors.primary;

  return (
    <Pressable style={[styles.txCard, { backgroundColor: colors.surface }]} onPress={onPress}>
      <View style={[styles.txIcon, { backgroundColor: `${accent}20` }]}>
        <Feather name={icon as any} size={18} color={accent} />
      </View>
      <View style={styles.txInfo}>
        <Text style={[styles.txTitle, { color: colors.text }]} numberOfLines={1}>
          {item.description || item.original_description || "Транзакция"}
        </Text>
        <Text style={[styles.txMeta, { color: colors.textMuted }]} numberOfLines={1}>
          {category?.name || (isIncome ? "Доход" : item.is_recurring ? "Подписка" : "Расход")} · {formatDateShort(item.date)}
          {!item.is_verified ? " · требует проверки" : ""}
        </Text>
      </View>
      <View style={styles.txRight}>
        <Text style={[styles.txAmount, { color: isIncome ? colors.success : colors.danger }]}>
          {formatAmount(item.amount, item.type, formatMoney)}
        </Text>
        {!item.is_verified ? (
          <Pressable
            onPress={(event) => {
              event.stopPropagation();
              onVerify();
            }}
            style={[styles.verifyPill, { backgroundColor: colors.surfaceAlt }]}
          >
            <Feather name="check" size={12} color={colors.primary} />
            <Text style={[styles.verifyText, { color: colors.primary }]}>ОК</Text>
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}

function groupByDay(transactions: ApiTransaction[]) {
  const groups: Record<string, ApiTransaction[]> = {};
  transactions.forEach((transaction) => {
    const key = new Date(transaction.date).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    groups[key] = groups[key] || [];
    groups[key].push(transaction);
  });
  return Object.entries(groups);
}

function formatAmount(amount: number, type: ApiTransaction["type"], formatMoney: (value: number) => string) {
  const sign = type === "INCOME" ? "+" : "-";
  return `${sign}${formatMoney(Math.abs(Number(amount || 0)))}`;
}

function formatCompact(amount: number, formatMoney: (value: number) => string) {
  const value = Math.abs(Number(amount || 0));
  return formatMoney(value);
}

function formatDateShort(value: string) {
  return new Date(value).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topArea: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 12,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pageTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  iconAction: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  iconActionMuted: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  searchWrap: {
    minHeight: 46,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  filterRow: {
    gap: 8,
    alignItems: "center",
    paddingRight: 20,
  },
  filterChip: {
    minHeight: 34,
    paddingHorizontal: 14,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  filterText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  filterActiveText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  summaryPill: {
    minHeight: 34,
    borderRadius: 17,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  summaryText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  summaryDivider: {
    fontSize: 12,
  },
  errorCard: {
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  list: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  dayHeader: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    marginTop: 16,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  txCard: {
    minHeight: 72,
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  txIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  txInfo: {
    flex: 1,
    gap: 3,
  },
  txTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  txMeta: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  txRight: {
    alignItems: "flex-end",
    gap: 6,
  },
  txAmount: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  verifyPill: {
    minHeight: 22,
    borderRadius: 11,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  verifyText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  empty: {
    paddingTop: 80,
    alignItems: "center",
    gap: 14,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  emptyButton: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  emptyButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
});
