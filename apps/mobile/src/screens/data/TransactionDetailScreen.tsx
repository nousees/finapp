import { Feather } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TransactionsStackParamList } from "@app/navigation/types";
import { getCategoryById } from "@shared/constants/categories";
import { useAppSettings } from "@shared/settings/AppSettingsContext";
import { useAppTheme } from "@shared/theme/ThemeProvider";

type Props = NativeStackScreenProps<TransactionsStackParamList, "TransactionDetail">;

export function TransactionDetailScreen({ navigation, route }: Props) {
  const { colors, gradients } = useAppTheme();
  const { formatMoney } = useAppSettings();
  const insets = useSafeAreaInsets();
  const transaction = route.params.transaction;
  const category = getCategoryById(transaction.category_id);
  const isIncome = transaction.type === "INCOME";

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.nav, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => navigation.goBack()} style={[styles.roundButton, { backgroundColor: colors.surfaceAlt }]}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </Pressable>
        <Text style={[styles.navTitle, { color: colors.text }]}>Транзакция</Text>
        <View style={styles.roundButton} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 120 + insets.bottom }]} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={isIncome ? ["#10B981", "#34D399"] : gradients.successDeep} style={styles.hero}>
          <View style={styles.heroIcon}>
            <Feather name={isIncome ? "arrow-down-left" : "arrow-up-right"} size={28} color="#FFFFFF" />
          </View>
          <Text style={styles.heroLabel}>{isIncome ? "Доход" : "Расход"}</Text>
          <Text style={styles.heroAmount}>{formatAmount(transaction.amount, transaction.type, formatMoney)}</Text>
          <Text style={styles.heroDescription} numberOfLines={2}>
            {transaction.description || transaction.original_description || "Без описания"}
          </Text>
        </LinearGradient>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <InfoRow icon="calendar" label="Дата операции" value={formatDate(transaction.date)} />
          <InfoRow icon="clock" label="Дата добавления" value={formatDateTime(transaction.created_at || transaction.date)} />
          <InfoRow icon={category?.icon || "tag"} label="Категория" value={category?.name || "Прочее / не указана"} color={category?.color} />
          <InfoRow icon="file-text" label="Описание" value={transaction.description || "Нет описания"} />
          <InfoRow icon="archive" label="Исходное описание" value={transaction.original_description || "Не указано"} />
          <InfoRow icon="check-circle" label="Проверка" value={transaction.is_verified ? "Подтверждена" : "Требует проверки"} />
          <InfoRow icon="repeat" label="Регулярность" value={transaction.is_recurring ? "Похожа на подписку" : "Обычная операция"} />
          <InfoRow icon="cpu" label="ML confidence" value={transaction.ml_confidence ? `${Math.round(Number(transaction.ml_confidence) * 100)}%` : "Нет данных"} />
          <InfoRow icon="hash" label="ID" value={transaction.id} />
        </View>
      </ScrollView>
    </View>
  );
}

function InfoRow({ icon, label, value, color }: { icon: string; label: string; value: string; color?: string }) {
  const { colors } = useAppTheme();
  const accent = color || colors.primary;
  return (
    <View style={styles.infoRow}>
      <View style={[styles.infoIcon, { backgroundColor: `${accent}20` }]}>
        <Feather name={icon as any} size={17} color={accent} />
      </View>
      <View style={styles.infoCopy}>
        <Text style={[styles.infoLabel, { color: colors.textMuted }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
      </View>
    </View>
  );
}

function formatAmount(amount: number, type: "INCOME" | "EXPENSE" | "TRANSFER", formatMoney: (value: number) => string) {
  const sign = type === "INCOME" ? "+" : type === "EXPENSE" ? "-" : "";
  return `${sign}${formatMoney(Math.abs(Number(amount || 0)))}`;
}

function formatDate(value?: string) {
  if (!value) return "Не указано";
  return new Date(value).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

function formatDateTime(value?: string) {
  if (!value) return "Не указано";
  return new Date(value).toLocaleString("ru-RU", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  nav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 12 },
  navTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  roundButton: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  content: { paddingHorizontal: 20, gap: 16 },
  hero: { borderRadius: 24, padding: 22, alignItems: "center", gap: 8 },
  heroIcon: { width: 58, height: 58, borderRadius: 29, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  heroLabel: { color: "rgba(255,255,255,0.78)", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  heroAmount: { color: "#FFFFFF", fontSize: 34, fontFamily: "Inter_700Bold" },
  heroDescription: { color: "rgba(255,255,255,0.8)", fontSize: 14, lineHeight: 20, fontFamily: "Inter_500Medium", textAlign: "center" },
  card: { borderRadius: 20, padding: 16, gap: 2 },
  infoRow: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: 12 },
  infoIcon: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  infoCopy: { flex: 1, gap: 2 },
  infoLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  infoValue: { fontSize: 14, lineHeight: 20, fontFamily: "Inter_600SemiBold" },
});
