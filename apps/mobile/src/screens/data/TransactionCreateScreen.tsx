import { useState } from "react";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from "react-native-reanimated";
import { MaterialIcons } from "@expo/vector-icons";
import { TransactionsStackParamList } from "@app/navigation/types";
import { processTransaction } from "@shared/api/processing";
import { createTransaction } from "@shared/api/transactions";
import { useAppTheme } from "@shared/theme/ThemeProvider";
import { radius, spacing } from "@shared/theme/spacing";
import { Screen } from "@shared/ui/Screen";
import { SectionCard } from "@shared/ui/SectionCard";

type Props = NativeStackScreenProps<TransactionsStackParamList, "TransactionCreate">;

export function TransactionCreateScreen({ navigation }: Props) {
  const { colors, gradients } = useAppTheme();
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [type, setType] = useState<"EXPENSE" | "INCOME">("EXPENSE");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const pulse = useSharedValue(1);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const handleSave = async () => {
    const parsedAmount = Number(amount.replace(",", "."));
    if (!parsedAmount) {
      setMessage("Укажите корректную сумму.");
      return;
    }

    try {
      setSaving(true);
      setMessage(null);
      const created = await createTransaction({
        amount: parsedAmount,
        type,
        description: description.trim() || undefined,
        date: date.trim() || undefined,
      });

      await processTransaction(created.id);

      pulse.value = withSequence(withTiming(1.06, { duration: 180 }), withTiming(1, { duration: 240 }));
      setMessage("Транзакция сохранена и отправлена на категоризацию.");
      navigation.goBack();
    } catch (saveError) {
      setMessage(saveError instanceof Error ? saveError.message : "Не удалось сохранить транзакцию.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <SectionCard title="Новая транзакция" subtitle="Реальный запрос в collection и processing">
        <View style={styles.segmentRow}>
          <TypeChip label="Расход" active={type === "EXPENSE"} onPress={() => setType("EXPENSE")} />
          <TypeChip label="Доход" active={type === "INCOME"} onPress={() => setType("INCOME")} />
        </View>

        <Field label="Сумма" placeholder="Например, 1250" value={amount} onChangeText={setAmount} keyboardType="numeric" />
        <Field label="Описание" placeholder="Например, Яндекс Go" value={description} onChangeText={setDescription} />
        <Field label="Дата" placeholder="2026-03-15" value={date} onChangeText={setDate} />
      </SectionCard>

      <Animated.View style={pulseStyle}>
        <Pressable onPress={() => void handleSave()} disabled={saving}>
          <LinearGradient colors={gradients.success} style={styles.saveButton}>
            <MaterialIcons name="check-circle-outline" size={20} color="#FFFFFF" />
            <Text style={styles.saveText}>{saving ? "Сохранение..." : "Сохранить транзакцию"}</Text>
          </LinearGradient>
        </Pressable>
      </Animated.View>

      {message ? (
        <View style={[styles.messageCard, { borderColor: colors.borderStrong, backgroundColor: colors.surface }]}>
          <Text style={[styles.messageText, { color: colors.text }]}>{message}</Text>
        </View>
      ) : null}
    </Screen>
  );
}

function TypeChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      style={[
        styles.typeChip,
        {
          borderColor: active ? colors.primaryDark : colors.border,
          backgroundColor: active ? colors.surfaceAlt : colors.surface,
        },
      ]}
      onPress={onPress}
    >
      <Text style={[styles.typeChipText, { color: active ? colors.primaryDark : colors.textSecondary }]}>{label}</Text>
    </Pressable>
  );
}

function Field({
  label,
  placeholder,
  value,
  onChangeText,
  keyboardType,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: "default" | "numeric";
}) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.fieldLabel, { color: colors.text }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        style={[styles.fieldInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  segmentRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  typeChip: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    height: 42,
  },
  typeChipText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  fieldWrap: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  fieldInput: {
    height: 50,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  saveButton: {
    height: 54,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
  },
  saveText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  messageCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
  },
  messageText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
});
