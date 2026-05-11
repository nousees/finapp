import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CATEGORIES, useFinance } from "@/context/FinanceContext";
import { useColors } from "@/hooks/useColors";

type TxType = "expense" | "income";

export default function ManualInputScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addTransaction } = useFinance();
  const [type, setType] = useState<TxType>("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("food");
  const [merchant, setMerchant] = useState("");
  const [description, setDescription] = useState("");
  const [success, setSuccess] = useState(false);
  const topPt = Platform.OS === "web" ? 67 : insets.top;
  const pb = Platform.OS === "web" ? 34 : insets.bottom;

  const expenseCategories = CATEGORIES.filter((c) => c.id !== "income");

  const handleSubmit = () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;
    addTransaction({
      type,
      amount: amt,
      category: type === "income" ? "income" : category,
      merchant: merchant.trim() || "Без названия",
      description: description.trim() || merchant.trim() || "Ручной ввод",
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSuccess(true);
    setTimeout(() => router.back(), 1200);
  };

  if (success) {
    return (
      <LinearGradient colors={["#6B46C1", "#7ED9B6"]} style={styles.successScreen}>
        <Feather name="check-circle" size={64} color="#FFFFFF" />
        <Text style={styles.successText}>Транзакция сохранена!</Text>
      </LinearGradient>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.nav, { paddingTop: topPt + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.muted }]}>
          <Feather name="x" size={20} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: colors.foreground }]}>Ручной ввод</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: pb + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.typeToggle, { backgroundColor: colors.muted }]}>
          {(["expense", "income"] as TxType[]).map((t) => (
            <TouchableOpacity key={t} onPress={() => setType(t)} activeOpacity={0.8} style={styles.typeOption}>
              {type === t ? (
                <LinearGradient
                  colors={t === "expense" ? ["#EF4444", "#F87171"] : ["#10B981", "#34D399"]}
                  style={styles.typeActive}
                >
                  <Text style={styles.typeActiveText}>
                    {t === "expense" ? "Расход" : "Доход"}
                  </Text>
                </LinearGradient>
              ) : (
                <View style={styles.typeInactive}>
                  <Text style={[styles.typeInactiveText, { color: colors.mutedForeground }]}>
                    {t === "expense" ? "Расход" : "Доход"}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.amountWrap}>
          <TextInput
            style={[styles.amountInput, { color: colors.foreground }]}
            placeholder="0"
            placeholderTextColor={colors.border}
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={setAmount}
            autoFocus
          />
          <Text style={[styles.currencySign, { color: colors.mutedForeground }]}>₽</Text>
        </View>

        {type === "expense" && (
          <>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Категория</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 20 }}
              contentContainerStyle={styles.categoryRow}
            >
              {expenseCategories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setCategory(cat.id)}
                  activeOpacity={0.7}
                  style={[
                    styles.catChip,
                    {
                      backgroundColor: category === cat.id ? cat.color + "20" : colors.muted,
                      borderWidth: category === cat.id ? 1.5 : 0,
                      borderColor: category === cat.id ? cat.color : "transparent",
                    },
                  ]}
                >
                  <Feather name={cat.icon as any} size={16} color={category === cat.id ? cat.color : colors.mutedForeground} />
                  <Text style={[styles.catChipText, { color: category === cat.id ? cat.color : colors.mutedForeground }]}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Получатель / Источник</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground }]}
          placeholder="например, Starbucks, Зарплата"
          placeholderTextColor={colors.mutedForeground}
          value={merchant}
          onChangeText={setMerchant}
          returnKeyType="next"
        />

        <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Заметка (необязательно)</Text>
        <TextInput
          style={[styles.input, styles.multilineInput, { backgroundColor: colors.muted, color: colors.foreground }]}
          placeholder="Добавьте комментарий..."
          placeholderTextColor={colors.mutedForeground}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
        />

        <TouchableOpacity onPress={handleSubmit} activeOpacity={0.85}>
          <LinearGradient
            colors={["#6B46C1", "#8B5CF6", "#7ED9B6"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.submitBtn, { opacity: amount.length > 0 ? 1 : 0.5 }]}
          >
            <Feather name="check" size={20} color="#FFFFFF" />
            <Text style={styles.submitText}>Сохранить транзакцию</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
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
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  navTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  typeToggle: {
    flexDirection: "row",
    borderRadius: 14,
    padding: 4,
    marginBottom: 24,
    gap: 4,
  },
  typeOption: { flex: 1 },
  typeActive: {
    borderRadius: 11,
    paddingVertical: 10,
    alignItems: "center",
  },
  typeActiveText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  typeInactive: {
    borderRadius: 11,
    paddingVertical: 10,
    alignItems: "center",
  },
  typeInactiveText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  amountWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
    gap: 8,
  },
  currencySign: {
    fontSize: 36,
    fontFamily: "Inter_400Regular",
    paddingBottom: 4,
  },
  amountInput: {
    fontSize: 56,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    minWidth: 120,
    letterSpacing: -2,
  },
  fieldLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    marginBottom: 8,
  },
  categoryRow: {
    gap: 8,
    paddingRight: 8,
  },
  catChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  catChipText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    marginBottom: 16,
  },
  multilineInput: {
    height: 80,
    textAlignVertical: "top",
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 8,
  },
  submitText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  successScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  successText: {
    color: "#FFFFFF",
    fontSize: 24,
    fontFamily: "Inter_700Bold",
  },
});
