import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  Alert,
  Modal,
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

import GoalCard from "@/components/GoalCard";
import { useFinance } from "@/context/FinanceContext";
import { useColors } from "@/hooks/useColors";

export default function GoalsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { goals, updateGoal, addGoal } = useFinance();
  const [addModal, setAddModal] = useState(false);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [deadline, setDeadline] = useState("2025-12-31");
  const topPt = Platform.OS === "web" ? 67 : insets.top;
  const pb = Platform.OS === "web" ? 34 : insets.bottom;

  const completed = goals.filter((g) => g.current >= g.target);
  const active = goals.filter((g) => g.current < g.target);
  const totalSaved = goals.reduce((s, g) => s + g.current, 0);
  const totalTarget = goals.reduce((s, g) => s + g.target, 0);

  const handleContribute = (id: string) => {
    Alert.alert("Пополнить цель", "Сколько хотите внести?", [
      { text: "Отмена", style: "cancel" },
      { text: "500 ₽", onPress: () => updateGoal(id, 500) },
      { text: "1 000 ₽", onPress: () => updateGoal(id, 1000) },
      { text: "5 000 ₽", onPress: () => updateGoal(id, 5000) },
    ]);
  };

  const handleAddGoal = () => {
    if (!name.trim() || !target.trim()) return;
    const ICONS = ["shield", "map-pin", "monitor", "trending-up", "star", "gift"];
    const COLORS = ["#10B981", "#8B5CF6", "#3B82F6", "#F97316", "#EC4899", "#F59E0B"];
    const i = goals.length % ICONS.length;
    addGoal({
      name: name.trim(),
      target: parseFloat(target),
      current: 0,
      deadline,
      icon: ICONS[i],
      color: COLORS[i],
    });
    setName("");
    setTarget("");
    setDeadline("2025-12-31");
    setAddModal(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 + pb }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.header, { paddingTop: topPt + 16 }]}>
          <View style={styles.headerRow}>
            <Text style={[styles.pageTitle, { color: colors.foreground }]}>Цели</Text>
            <TouchableOpacity onPress={() => setAddModal(true)} activeOpacity={0.7}>
              <LinearGradient colors={["#6B46C1", "#8B5CF6"]} style={styles.addBtn}>
                <Feather name="plus" size={20} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ paddingHorizontal: 20 }}>
          <LinearGradient
            colors={["#7ED9B6", "#A8E6CF", "#6B46C1"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.overviewCard}
          >
            <Text style={styles.overviewLabel}>Всего накоплено</Text>
            <Text style={styles.overviewAmount}>
              {totalSaved.toLocaleString("ru-RU")} ₽
            </Text>
            <Text style={styles.overviewSub}>
              из {totalTarget.toLocaleString("ru-RU")} ₽ цели ·{" "}
              {Math.round((totalSaved / totalTarget) * 100)}%
            </Text>
            <View style={styles.overviewTrack}>
              <View
                style={[
                  styles.overviewFill,
                  { width: `${Math.min((totalSaved / totalTarget) * 100, 100)}%` },
                ]}
              />
            </View>
            <View style={styles.overviewStats}>
              <View style={styles.overviewStat}>
                <Text style={styles.overviewStatVal}>{active.length}</Text>
                <Text style={styles.overviewStatLabel}>Активных</Text>
              </View>
              <View style={styles.overviewStat}>
                <Text style={styles.overviewStatVal}>{completed.length}</Text>
                <Text style={styles.overviewStatLabel}>Выполнено</Text>
              </View>
              <View style={styles.overviewStat}>
                <Text style={styles.overviewStatVal}>{goals.length}</Text>
                <Text style={styles.overviewStatLabel}>Всего</Text>
              </View>
            </View>
          </LinearGradient>

          {active.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>В процессе</Text>
              {active.map((g) => (
                <GoalCard key={g.id} goal={g} onContribute={handleContribute} />
              ))}
            </>
          )}

          {completed.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Выполненные</Text>
              {completed.map((g) => (
                <GoalCard key={g.id} goal={g} />
              ))}
            </>
          )}
        </View>
      </ScrollView>

      <Modal visible={addModal} transparent animationType="slide" onRequestClose={() => setAddModal(false)}>
        <Pressable style={styles.overlay} onPress={() => setAddModal(false)}>
          <Pressable
            style={[styles.sheet, { backgroundColor: colors.background, paddingBottom: pb + 20 }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Новая цель</Text>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Название цели</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground }]}
              placeholder="например, Резервный фонд"
              placeholderTextColor={colors.mutedForeground}
              value={name}
              onChangeText={setName}
            />
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Целевая сумма (₽)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground }]}
              placeholder="100000"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="numeric"
              value={target}
              onChangeText={setTarget}
            />
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Дата завершения (ГГГГ-ММ-ДД)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground }]}
              placeholder="2025-12-31"
              placeholderTextColor={colors.mutedForeground}
              value={deadline}
              onChangeText={setDeadline}
            />
            <TouchableOpacity onPress={handleAddGoal} activeOpacity={0.8}>
              <LinearGradient colors={["#6B46C1", "#8B5CF6"]} style={styles.createBtn}>
                <Text style={styles.createBtnText}>Создать цель</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pageTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  overviewCard: {
    borderRadius: 20,
    padding: 22,
    marginBottom: 24,
  },
  overviewLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.75)",
    fontFamily: "Inter_400Regular",
    marginBottom: 6,
  },
  overviewAmount: {
    fontSize: 34,
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
  },
  overviewSub: {
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
    fontFamily: "Inter_400Regular",
    marginBottom: 14,
  },
  overviewTrack: {
    height: 6,
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 16,
  },
  overviewFill: {
    height: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 3,
  },
  overviewStats: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  overviewStat: {
    alignItems: "center",
    gap: 2,
  },
  overviewStatVal: {
    fontSize: 20,
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
  },
  overviewStatLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.7)",
    fontFamily: "Inter_400Regular",
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    marginBottom: 12,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingTop: 12,
    gap: 8,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    marginTop: 4,
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
  createBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  createBtnText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
  },
});
