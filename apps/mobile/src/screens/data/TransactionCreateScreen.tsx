import { useMemo, useState } from "react";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TransactionsStackParamList } from "@app/navigation/types";
import { createTransaction, updateTransaction } from "@shared/api/transactions";
import {
  EXPENSE_CATEGORIES,
  FinAppCategory,
  INCOME_CATEGORIES,
} from "@shared/constants/categories";
import { useAppSettings } from "@shared/settings/AppSettingsContext";
import { useAppTheme } from "@shared/theme/ThemeProvider";
import {
  DatePickerField,
  formatISODate,
  today,
} from "@shared/ui/DatePickerField";

type Props = NativeStackScreenProps<
  TransactionsStackParamList,
  "TransactionCreate"
>;
type TxType = "EXPENSE" | "INCOME";
type CategoryQuickFilter =
  | "all"
  | "popular"
  | "daily"
  | "home"
  | "lifestyle"
  | "other";

const EXPENSE_CATEGORY_FILTERS: Array<{
  id: CategoryQuickFilter;
  label: string;
  codes: string[];
}> = [
  { id: "all", label: "Все", codes: [] },
  {
    id: "popular",
    label: "Частые",
    codes: [
      "groceries",
      "restaurants",
      "transport",
      "shopping",
      "subscriptions",
    ],
  },
  {
    id: "daily",
    label: "Ежедневные",
    codes: ["groceries", "restaurants", "transport", "health", "pets"],
  },
  {
    id: "home",
    label: "Дом",
    codes: ["housing", "utilities", "family", "education"],
  },
  {
    id: "lifestyle",
    label: "Стиль жизни",
    codes: [
      "entertainment",
      "clothing",
      "travel",
      "beauty",
      "sports",
      "electronics",
      "gifts",
    ],
  },
  { id: "other", label: "Прочее", codes: ["fees", "other"] },
];

const INCOME_CATEGORY_FILTERS: Array<{
  id: CategoryQuickFilter;
  label: string;
  codes: string[];
}> = [
  { id: "all", label: "Все", codes: [] },
  { id: "popular", label: "Основные", codes: ["salary", "freelance"] },
  { id: "daily", label: "Бонусы", codes: ["bonus", "cashback"] },
  { id: "other", label: "Переводы", codes: ["gifts_income"] },
];

export function TransactionCreateScreen({ navigation }: Props) {
  const { colors, gradients } = useAppTheme();
  const { settings } = useAppSettings();
  const insets = useSafeAreaInsets();
  const [type, setType] = useState<TxType>("EXPENSE");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0].id);
  const [categoryQuery, setCategoryQuery] = useState("");
  const [categoryQuickFilter, setCategoryQuickFilter] =
    useState<CategoryQuickFilter>("all");
  const [date, setDate] = useState(formatISODate(today()));
  const [merchant, setMerchant] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const categories = useMemo(
    () => (type === "INCOME" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES),
    [type],
  );
  const categoryFilters = useMemo(
    () =>
      type === "INCOME" ? INCOME_CATEGORY_FILTERS : EXPENSE_CATEGORY_FILTERS,
    [type],
  );
  const visibleCategories = useMemo(
    () =>
      filterCategories(
        categories,
        categoryQuickFilter,
        categoryQuery,
        categoryFilters,
      ),
    [categories, categoryFilters, categoryQuery, categoryQuickFilter],
  );
  const selectedCategory = useMemo(
    () => categories.find((item) => item.id === category),
    [categories, category],
  );

  const changeType = (nextType: TxType) => {
    setType(nextType);
    setCategory(
      nextType === "INCOME"
        ? INCOME_CATEGORIES[0].id
        : EXPENSE_CATEGORIES[0].id,
    );
    setCategoryQuickFilter("all");
    setCategoryQuery("");
  };

  const handleSave = async () => {
    const parsedAmount = Number(amount.replace(/\s/g, "").replace(",", "."));
    if (!parsedAmount || parsedAmount <= 0) {
      setMessage("Укажите корректную сумму.");
      return;
    }

    try {
      setSaving(true);
      setMessage(null);
      const created = await createTransaction({
        amount: parsedAmount,
        type,
        currency: settings.currency,
        category_id: category,
        description:
          [merchant.trim(), description.trim()].filter(Boolean).join(" · ") ||
          undefined,
        date,
      });
      await updateTransaction(created.id, {
        category_id: category,
        is_verified: true,
      }).catch(() => null);
      navigation.goBack();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Не удалось сохранить транзакцию.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={[styles.nav, { paddingTop: insets.top + 8 }]}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={[styles.roundButton, { backgroundColor: colors.surfaceAlt }]}
          >
            <Feather name="x" size={20} color={colors.text} />
          </Pressable>
          <Text style={[styles.navTitle, { color: colors.text }]}>
            Ручной ввод
          </Text>
          <View style={styles.roundButton} />
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.body,
            { paddingBottom: 120 + insets.bottom },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[styles.typeToggle, { backgroundColor: colors.surfaceAlt }]}
          >
            {(["EXPENSE", "INCOME"] as TxType[]).map((value) => (
              <Pressable
                key={value}
                onPress={() => changeType(value)}
                style={styles.typeOption}
              >
                {type === value ? (
                  <LinearGradient
                    colors={
                      value === "EXPENSE"
                        ? ["#EF4444", "#F87171"]
                        : ["#10B981", "#34D399"]
                    }
                    style={styles.typeActive}
                  >
                    <Text style={styles.typeActiveText}>
                      {value === "EXPENSE" ? "Расход" : "Доход"}
                    </Text>
                  </LinearGradient>
                ) : (
                  <Text
                    style={[
                      styles.typeInactiveText,
                      { color: colors.textMuted },
                    ]}
                  >
                    {value === "EXPENSE" ? "Расход" : "Доход"}
                  </Text>
                )}
              </Pressable>
            ))}
          </View>

          <View style={styles.amountWrap}>
            <TextInput
              style={[styles.amountInput, { color: colors.text }]}
              placeholder="0"
              placeholderTextColor={colors.border}
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
              autoFocus
            />
            <Text style={[styles.currency, { color: colors.textMuted }]}>
              {settings.currency}
            </Text>
          </View>

          <View style={styles.categoryHeader}>
            <View>
              <Text style={[styles.label, { color: colors.textMuted }]}>
                Категория
              </Text>
              <Text style={[styles.categoryHint, { color: colors.textMuted }]}>
                Фильтр по группе или названию — выбранная категория сохранится.
              </Text>
            </View>
            {selectedCategory ? (
              <View
                style={[
                  styles.selectedCategoryBadge,
                  { backgroundColor: `${selectedCategory.color}18` },
                ]}
              >
                <Feather
                  name={selectedCategory.icon as any}
                  size={14}
                  color={selectedCategory.color}
                />
                <Text
                  style={[
                    styles.selectedCategoryText,
                    { color: selectedCategory.color },
                  ]}
                  numberOfLines={1}
                >
                  {selectedCategory.name}
                </Text>
              </View>
            ) : null}
          </View>

          <View
            style={[
              styles.categorySearchWrap,
              { backgroundColor: colors.surfaceAlt },
            ]}
          >
            <Feather name="search" size={16} color={colors.textMuted} />
            <TextInput
              style={[styles.categorySearchInput, { color: colors.text }]}
              placeholder="Быстро найти категорию..."
              placeholderTextColor={colors.textMuted}
              value={categoryQuery}
              onChangeText={setCategoryQuery}
              returnKeyType="search"
            />
            {categoryQuery.length > 0 ? (
              <Pressable onPress={() => setCategoryQuery("")}>
                <Feather name="x" size={16} color={colors.textMuted} />
              </Pressable>
            ) : null}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryQuickFilterRow}
          >
            {categoryFilters.map((item) => {
              const active = categoryQuickFilter === item.id;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => setCategoryQuickFilter(item.id)}
                  style={[
                    styles.quickFilterChip,
                    {
                      backgroundColor: active
                        ? colors.primary
                        : colors.surfaceAlt,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.quickFilterText,
                      { color: active ? "#FFFFFF" : colors.textMuted },
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.categoryGrid}>
            {visibleCategories.map((item) => {
              const active = category === item.id;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => setCategory(item.id)}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: active
                        ? `${item.color}20`
                        : colors.surfaceAlt,
                      borderColor: active ? item.color : "transparent",
                    },
                  ]}
                >
                  <Feather
                    name={item.icon as any}
                    size={16}
                    color={active ? item.color : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.categoryText,
                      { color: active ? item.color : colors.textMuted },
                    ]}
                  >
                    {item.name}
                  </Text>
                </Pressable>
              );
            })}
            {visibleCategories.length === 0 ? (
              <View
                style={[
                  styles.categoryEmpty,
                  { backgroundColor: colors.surfaceAlt },
                ]}
              >
                <Feather name="search" size={16} color={colors.textMuted} />
                <Text
                  style={[
                    styles.categoryEmptyText,
                    { color: colors.textMuted },
                  ]}
                >
                  Категории не найдены
                </Text>
                <Pressable
                  onPress={() => {
                    setCategoryQuickFilter("all");
                    setCategoryQuery("");
                  }}
                >
                  <Text
                    style={[
                      styles.categoryResetText,
                      { color: colors.primary },
                    ]}
                  >
                    Сбросить
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </View>

          <Input
            label="Получатель / источник"
            placeholder="Например, ВкусВилл или Зарплата"
            value={merchant}
            onChangeText={setMerchant}
          />
          <DatePickerField
            label="Дата операции"
            value={date}
            onChange={setDate}
            maximumDate={today()}
            helper="Транзакцию можно добавить сегодняшним или прошедшим числом."
          />
          <Input
            label="Комментарий"
            placeholder="Необязательно"
            value={description}
            onChangeText={setDescription}
            multiline
          />

          {message ? (
            <Text style={[styles.message, { color: colors.danger }]}>
              {message}
            </Text>
          ) : null}

          <Pressable
            onPress={handleSave}
            disabled={saving || amount.length === 0}
          >
            <LinearGradient
              colors={gradients.success}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[
                styles.submit,
                { opacity: saving || amount.length === 0 ? 0.55 : 1 },
              ]}
            >
              <Feather name="check" size={20} color="#FFFFFF" />
              <Text style={styles.submitText}>
                {saving ? "Сохранение..." : "Сохранить транзакцию"}
              </Text>
            </LinearGradient>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function filterCategories(
  categories: FinAppCategory[],
  activeFilter: CategoryQuickFilter,
  query: string,
  filterGroups: Array<{
    id: CategoryQuickFilter;
    label: string;
    codes: string[];
  }>,
) {
  const selectedGroup = filterGroups.find((item) => item.id === activeFilter);
  const groupCodes = new Set(selectedGroup?.codes || []);
  const normalizedQuery = normalizeCategorySearch(query);

  return categories.filter((item) => {
    const matchesGroup = activeFilter === "all" || groupCodes.has(item.code);
    if (!matchesGroup) return false;
    if (!normalizedQuery) return true;

    const haystack = normalizeCategorySearch(
      [item.name, item.code, ...(item.aliases || [])].join(" "),
    );
    return haystack.includes(normalizedQuery);
  });
}

function normalizeCategorySearch(value: string) {
  return value.trim().toLowerCase().replace(/ё/g, "е");
}

function Input({
  label,
  multiline,
  ...props
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  multiline?: boolean;
}) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.inputGroup}>
      <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
      <TextInput
        {...props}
        multiline={multiline}
        placeholderTextColor={colors.textMuted}
        style={[
          styles.input,
          multiline ? styles.multiline : undefined,
          { backgroundColor: colors.surfaceAlt, color: colors.text },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  nav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  roundButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  navTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  body: { paddingHorizontal: 20, paddingTop: 8 },
  typeToggle: {
    flexDirection: "row",
    borderRadius: 14,
    padding: 4,
    marginBottom: 24,
    gap: 4,
  },
  typeOption: {
    flex: 1,
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  typeActive: {
    width: "100%",
    borderRadius: 11,
    paddingVertical: 10,
    alignItems: "center",
  },
  typeActiveText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  typeInactiveText: { fontSize: 15, fontFamily: "Inter_500Medium" },
  amountWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 30,
  },
  amountInput: {
    fontSize: 56,
    fontFamily: "Inter_700Bold",
    minWidth: 120,
    textAlign: "center",
  },
  currency: { fontSize: 36, fontFamily: "Inter_400Regular" },
  label: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 8 },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 8,
  },
  categoryHint: {
    maxWidth: 210,
    fontSize: 12,
    lineHeight: 17,
    fontFamily: "Inter_400Regular",
  },
  selectedCategoryBadge: {
    maxWidth: 132,
    minHeight: 32,
    borderRadius: 16,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  selectedCategoryText: {
    flexShrink: 1,
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  categorySearchWrap: {
    minHeight: 46,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  categorySearchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    paddingVertical: 0,
  },
  categoryQuickFilterRow: { gap: 8, paddingRight: 8, paddingBottom: 10 },
  quickFilterChip: {
    minHeight: 34,
    borderRadius: 17,
    paddingHorizontal: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  quickFilterText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingBottom: 20,
  },
  categoryEmpty: {
    minHeight: 40,
    borderRadius: 14,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  categoryEmptyText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  categoryResetText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 36,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  categoryText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  inputGroup: { marginBottom: 16 },
  input: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
  multiline: { minHeight: 84, textAlignVertical: "top" },
  message: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 12 },
  submit: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 8,
  },
  submitText: { color: "#FFFFFF", fontSize: 17, fontFamily: "Inter_700Bold" },
});
