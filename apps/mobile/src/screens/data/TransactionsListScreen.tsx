import { useMemo, useRef, useState } from "react";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Animated, FlatList, NativeScrollEvent, NativeSyntheticEvent, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Swipeable } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Screen } from "@shared/ui/Screen";
import { useAppTheme } from "@shared/theme/ThemeProvider";
import { radius, spacing } from "@shared/theme/spacing";
import { TransactionsStackParamList } from "@app/navigation/types";

type Props = NativeStackScreenProps<TransactionsStackParamList, "TransactionsList">;

type TransactionItem = {
  id: string;
  title: string;
  category: string;
  date: string;
  amount: string;
  kind: "income" | "expense";
  icon: keyof typeof MaterialIcons.glyphMap;
};

const source: TransactionItem[] = [
  { id: "t1", title: "\u041F\u044F\u0442\u0435\u0440\u043E\u0447\u043A\u0430", category: "\u0415\u0434\u0430", date: "24 \u0444\u0435\u0432", amount: `-2 190 \u20BD`, kind: "expense", icon: "shopping-bag" },
  { id: "t2", title: "\u042F\u043D\u0434\u0435\u043A\u0441 Go", category: "\u0422\u0440\u0430\u043D\u0441\u043F\u043E\u0440\u0442", date: "24 \u0444\u0435\u0432", amount: `-540 \u20BD`, kind: "expense", icon: "local-taxi" },
  { id: "t3", title: "\u0417\u0430\u0440\u043F\u043B\u0430\u0442\u0430", category: "\u0414\u043E\u0445\u043E\u0434", date: "22 \u0444\u0435\u0432", amount: `+120 000 \u20BD`, kind: "income", icon: "payments" },
  { id: "t4", title: "Ozon", category: "\u041F\u043E\u043A\u0443\u043F\u043A\u0438", date: "21 \u0444\u0435\u0432", amount: `-4 100 \u20BD`, kind: "expense", icon: "inventory-2" },
  { id: "t5", title: "\u0422-\u0411\u0430\u043D\u043A", category: "\u041A\u044D\u0448\u0431\u044D\u043A", date: "20 \u0444\u0435\u0432", amount: `+1 240 \u20BD`, kind: "income", icon: "savings" },
  { id: "t6", title: "Netflix", category: "\u041F\u043E\u0434\u043F\u0438\u0441\u043A\u0438", date: "19 \u0444\u0435\u0432", amount: `-999 \u20BD`, kind: "expense", icon: "movie" },
];

const filters = ["\u0414\u0430\u0442\u0430", "\u041A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u044F", "\u0414\u043E\u0445\u043E\u0434/\u0440\u0430\u0441\u0445\u043E\u0434"];

export function TransactionsListScreen({ navigation }: Props) {
  const { colors, gradients } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");

  const lastOffsetRef = useRef(0);
  const fabVisibleRef = useRef(true);
  const fabAnimation = useRef(new Animated.Value(1)).current;

  const items = useMemo(
    () => source.filter((item) => `${item.title} ${item.category} ${item.amount}`.toLowerCase().includes(search.trim().toLowerCase())),
    [search],
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
            placeholder={"\u041F\u043E\u0438\u0441\u043A \u043F\u043E \u0441\u0443\u043C\u043C\u0435, \u043A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u0438, \u043A\u043E\u043D\u0442\u0440\u0430\u0433\u0435\u043D\u0442\u0443"}
            placeholderTextColor={colors.textMuted}
            style={[styles.searchInput, { color: colors.text }]}
          />
        </View>

        <FlatList
          style={styles.list}
          contentContainerStyle={styles.listContent}
          data={items}
          keyExtractor={(item) => item.id}
          onScroll={handleListScroll}
          scrollEventThrottle={16}
          renderItem={({ item }) => (
            <Swipeable renderRightActions={() => <SwipeActions />} overshootRight={false}>
              <View style={[styles.rowCard, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
                <View style={styles.rowLeft}>
                  <View style={[styles.rowIcon, { backgroundColor: colors.surfaceAlt }]}>
                    <MaterialIcons name={item.icon} size={20} color={colors.primaryDark} />
                  </View>
                  <View>
                    <Text style={[styles.rowTitle, { color: colors.text }]}>{item.title}</Text>
                    <Text style={[styles.rowMeta, { color: colors.textMuted }]}>{item.category}</Text>
                  </View>
                </View>
                <View style={styles.rowRight}>
                  <Text style={[styles.rowAmount, { color: item.kind === "income" ? colors.success : colors.text }]}>{item.amount}</Text>
                  <Text style={[styles.rowDate, { color: colors.textMuted }]}>{item.date}</Text>
                </View>
              </View>
            </Swipeable>
          )}
          showsVerticalScrollIndicator={false}
        />

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
});
