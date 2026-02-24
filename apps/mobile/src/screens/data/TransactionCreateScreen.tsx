import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from "react-native-reanimated";
import { Screen } from "@shared/ui/Screen";
import { SectionCard } from "@shared/ui/SectionCard";
import { useAppTheme } from "@shared/theme/ThemeProvider";
import { radius, spacing } from "@shared/theme/spacing";
import { MaterialIcons } from "@expo/vector-icons";

export function TransactionCreateScreen() {
  const { colors, gradients } = useAppTheme();
  const [saved, setSaved] = useState(false);
  const pulse = useSharedValue(1);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const handleSave = () => {
    setSaved(true);
    pulse.value = withSequence(withTiming(1.06, { duration: 180 }), withTiming(1, { duration: 240 }));
  };

  return (
    <Screen>
      <SectionCard title="Новая транзакция" subtitle="Быстрый ручной ввод">
        <Field label="Сумма" placeholder="Например, 1250" />
        <Field label="Категория" placeholder="Еда / Транспорт / Дом..." />
        <Field label="Контрагент" placeholder="Название магазина или сервиса" />
        <Field label="Дата" placeholder="24.02.2026" />
        <Field label="Комментарий" placeholder="Необязательно" />
      </SectionCard>

      <Animated.View style={pulseStyle}>
        <Pressable onPress={handleSave}>
          <LinearGradient colors={gradients.success} style={styles.saveButton}>
            <MaterialIcons name="check-circle-outline" size={20} color="#FFFFFF" />
            <Text style={styles.saveText}>Сохранить транзакцию</Text>
          </LinearGradient>
        </Pressable>
      </Animated.View>

      {saved ? (
        <View style={[styles.successCard, { borderColor: colors.borderStrong, backgroundColor: colors.surface }]}>
          <Text style={[styles.successTitle, { color: colors.primaryDark }]}>Сохранено</Text>
          <Text style={[styles.successText, { color: colors.textMuted }]}>Транзакция добавлена и учтена в бюджете.</Text>
        </View>
      ) : null}
    </Screen>
  );
}

function Field({ label, placeholder }: { label: string; placeholder: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.fieldLabel, { color: colors.text }]}>{label}</Text>
      <TextInput
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        style={[styles.fieldInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
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
  successCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    gap: 3,
  },
  successTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  successText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
});
