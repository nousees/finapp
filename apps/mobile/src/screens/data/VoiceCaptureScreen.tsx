import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { radius, spacing } from "@shared/theme/spacing";

const wavePalette = ["#86EFAC", "#6EE7B7", "#4ADE80", "#22C55E"];

export function VoiceCaptureScreen() {
  const [isRecording, setIsRecording] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const pulse = useSharedValue(1);
  const glow = useSharedValue(0);

  const saveAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    shadowOpacity: glow.value,
  }));

  const waveBars = useMemo(() => Array.from({ length: 18 }, (_, index) => index), []);

  const handleToggleRecord = () => {
    if (isRecording) {
      setShowPreview(true);
    }
    setIsRecording((prev) => !prev);
  };

  const handleSave = () => {
    setIsSaved(true);
    pulse.value = withSequence(withTiming(1.08, { duration: 180 }), withTiming(1, { duration: 220 }));
    glow.value = withSequence(withTiming(0.36, { duration: 140 }), withTiming(0.14, { duration: 220 }), withTiming(0, { duration: 180 }));
  };

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <LinearGradient colors={["#0F172A", "#111827"]} style={StyleSheet.absoluteFill} />
      <Text style={styles.title}>Голосовой ввод</Text>
      <Text style={styles.subtitle}>{isRecording ? "Слушаю транзакцию..." : "Запись остановлена"}</Text>

      <View style={styles.waveWrap}>
        <LinearGradient colors={["#86EFAC22", "#22C55E22"]} style={styles.waveGlow} />
        <View style={styles.waveRow}>
          {waveBars.map((bar) => (
            <WaveBar key={bar} index={bar} active={isRecording} />
          ))}
        </View>
      </View>

      <Pressable style={[styles.recordButton, isRecording ? styles.recordButtonStop : styles.recordButtonStart]} onPress={handleToggleRecord}>
        <MaterialIcons name={isRecording ? "stop" : "keyboard-voice"} size={20} color="#FFFFFF" />
        <Text style={styles.recordButtonText}>{isRecording ? "Завершить запись" : "Начать запись"}</Text>
      </Pressable>

      {showPreview ? (
        <View style={styles.previewCard}>
          <Text style={styles.previewLabel}>Распознано</Text>
          <Text style={styles.previewAmount}>-850 ₽</Text>
          <Text style={styles.previewMeta}>Категория: Транспорт • Магазин: Яндекс Go</Text>

          <View style={styles.actionsRow}>
            <Animated.View style={[styles.saveWrap, saveAnimatedStyle]}>
              <Pressable onPress={handleSave}>
                <LinearGradient colors={["#86EFAC", "#22C55E"]} style={styles.saveButton}>
                  <Text style={styles.saveText}>Сохранить</Text>
                </LinearGradient>
              </Pressable>
            </Animated.View>

            <Pressable style={styles.editButton}>
              <Text style={styles.editText}>Изменить</Text>
            </Pressable>
          </View>

          {isSaved ? (
            <View style={styles.savedBadge}>
              <MaterialIcons name="check-circle-outline" size={18} color="#22C55E" />
              <Text style={styles.savedText}>Транзакция сохранена</Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function WaveBar({ index, active }: { index: number; active: boolean }) {
  const barHeight = useSharedValue(10);
  const maxHeight = 28 + ((index + 3) % 6) * 9;
  const minHeight = 10 + (index % 3) * 5;

  useEffect(() => {
    if (active) {
      barHeight.value = withDelay(
        index * 30,
        withRepeat(
          withSequence(withTiming(maxHeight, { duration: 450 }), withTiming(minHeight, { duration: 430 })),
          -1,
          true,
        ),
      );
      return;
    }

    barHeight.value = withTiming(10, { duration: 180 });
  }, [active, barHeight, index, maxHeight, minHeight]);

  const style = useAnimatedStyle(() => ({
    height: barHeight.value,
    opacity: active ? 1 : 0.45,
  }));

  return <Animated.View style={[styles.waveBar, style, { backgroundColor: wavePalette[index % wavePalette.length] }]} />;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0F172A",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
  },
  title: {
    color: "#F8FAFC",
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  subtitle: {
    marginTop: 8,
    color: "#86EFAC",
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },
  waveWrap: {
    marginTop: 44,
    marginBottom: 28,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 180,
  },
  waveGlow: {
    position: "absolute",
    width: 280,
    height: 180,
    borderRadius: 140,
  },
  waveRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
    height: 110,
  },
  waveBar: {
    width: 8,
    borderRadius: 6,
  },
  recordButton: {
    height: 52,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  recordButtonStart: {
    backgroundColor: "#22C55E",
  },
  recordButtonStop: {
    backgroundColor: "#EF4444",
  },
  recordButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  previewCard: {
    marginTop: 24,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "#1F2937",
    backgroundColor: "#111827",
    padding: spacing.md,
    gap: 10,
  },
  previewLabel: {
    color: "#94A3B8",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  previewAmount: {
    color: "#22C55E",
    fontSize: 36,
    fontFamily: "Inter_700Bold",
  },
  previewMeta: {
    color: "#E2E8F0",
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Inter_500Medium",
  },
  actionsRow: {
    marginTop: 6,
    flexDirection: "row",
    gap: 10,
  },
  saveWrap: {
    flex: 1,
    shadowColor: "#22C55E",
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 20,
    elevation: 3,
  },
  saveButton: {
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  saveText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  editButton: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: "#374151",
    alignItems: "center",
    justifyContent: "center",
    height: 48,
  },
  editText: {
    color: "#F8FAFC",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  savedBadge: {
    marginTop: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  savedText: {
    color: "#86EFAC",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
});
