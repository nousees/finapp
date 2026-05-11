import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import VoiceWave from "@/components/VoiceWave";
import { CATEGORIES, useFinance } from "@/context/FinanceContext";
import { useColors } from "@/hooks/useColors";

const SAMPLE_PHRASES = [
  "Кофе в Starbucks за 350 рублей...",
  "Обед в ресторане за 1200 рублей...",
  "Такси до аэропорта за 800 рублей...",
  "Продукты в ВкусВилл за 1500 рублей...",
  "Подписка Netflix за 999 рублей...",
];

type Step = "idle" | "listening" | "processing" | "confirm";

export default function VoiceInputScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addTransaction } = useFinance();
  const [step, setStep] = useState<Step>("idle");
  const [transcript, setTranscript] = useState("");
  const [parsed, setParsed] = useState<{ amount: number; category: string; merchant: string } | null>(null);
  const ringAnim = useRef(new Animated.Value(1)).current;
  const topPt = Platform.OS === "web" ? 67 : insets.top;
  const pb = Platform.OS === "web" ? 34 : insets.bottom;
  const phraseIndex = useRef(0);

  useEffect(() => {
    const ring = Animated.loop(
      Animated.sequence([
        Animated.timing(ringAnim, { toValue: 1.3, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(ringAnim, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    if (step === "listening") ring.start();
    else {
      ring.stop();
      ringAnim.setValue(1);
    }
    return () => ring.stop();
  }, [step]);

  const startListening = () => {
    setStep("listening");
    setTranscript("");
    setParsed(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const phrase = SAMPLE_PHRASES[phraseIndex.current % SAMPLE_PHRASES.length];
    phraseIndex.current++;
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setTranscript(phrase.slice(0, i * 3));
      if (i * 3 >= phrase.length) {
        clearInterval(interval);
        setTimeout(() => {
          setStep("processing");
          setTimeout(() => {
            const amtMatch = phrase.match(/(\d[\d\s]*)\s*рубл/i);
            const amt = amtMatch ? parseFloat(amtMatch[1].replace(/\s/g, "")) : 500;
            const merchants = ["Starbucks", "Ресторан", "Яндекс.Такси", "ВкусВилл", "Netflix"];
            const m = merchants[phraseIndex.current % merchants.length] ?? "Магазин";
            setParsed({ amount: amt, category: "food", merchant: m });
            setStep("confirm");
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }, 1200);
        }, 200);
      }
    }, 60);
  };

  const stopListening = () => {
    setStep("idle");
    setTranscript("");
  };

  const confirm = () => {
    if (!parsed) return;
    addTransaction({
      type: "expense",
      amount: parsed.amount,
      category: parsed.category,
      description: transcript,
      merchant: parsed.merchant,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  const retry = () => {
    setStep("idle");
    setTranscript("");
    setParsed(null);
  };

  const category = CATEGORIES.find((c) => c.id === parsed?.category);

  return (
    <LinearGradient
      colors={["#3D1A8A", "#6B46C1", "#8B5CF6", "#7ED9B6"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.3, y: 1 }}
      style={[styles.container, { paddingTop: topPt }]}
    >
      <View style={styles.hexBg} pointerEvents="none">
        {[...Array(15)].map((_, i) => (
          <View
            key={i}
            style={[styles.hex, { left: ((i * 73) % 300) - 20, top: ((i * 59) % 600) - 20, opacity: 0.07 }]}
          />
        ))}
      </View>

      <View style={styles.nav}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Feather name="x" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Голосовой ввод</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: pb + 40 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.waveArea}>
          {step === "listening" && (
            <>
              <Animated.View style={[styles.ring, { transform: [{ scale: ringAnim }], borderColor: "rgba(168,230,207,0.3)" }]} />
              <Animated.View style={[styles.ring, styles.ring2, { transform: [{ scale: ringAnim }], borderColor: "rgba(168,230,207,0.15)" }]} />
            </>
          )}
          <VoiceWave isActive={step === "listening"} />
          {step === "idle" && (
            <Text style={styles.idleHint}>Нажмите на микрофон</Text>
          )}
          {step === "listening" && (
            <Text style={styles.listeningText}>Слушаю...</Text>
          )}
          {step === "processing" && (
            <Text style={styles.listeningText}>Обрабатываю...</Text>
          )}
        </View>

        {(step === "listening" || step === "processing") && transcript.length > 0 && (
          <View style={styles.transcriptCard}>
            <Text style={styles.transcriptText}>{transcript}</Text>
          </View>
        )}

        {step === "confirm" && parsed && (
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>Транзакция распознана</Text>
            <View style={styles.parsedRow}>
              <View style={[styles.catIcon, { backgroundColor: (category?.color ?? "#6B7280") + "30" }]}>
                <Feather name={(category?.icon as any) ?? "circle"} size={22} color={category?.color ?? "#6B7280"} />
              </View>
              <View style={styles.parsedInfo}>
                <Text style={styles.parsedMerchant}>{parsed.merchant}</Text>
                <Text style={styles.parsedCategory}>{category?.name ?? "Другое"}</Text>
              </View>
              <Text style={styles.parsedAmount}>−{parsed.amount.toLocaleString("ru-RU")} ₽</Text>
            </View>
            <Text style={styles.transcriptPreview} numberOfLines={2}>{transcript}</Text>
          </View>
        )}

        <View style={styles.controls}>
          {step === "idle" && (
            <Pressable onPress={startListening} style={styles.micPressable}>
              <LinearGradient colors={["#A8E6CF", "#7ED9B6", "#6B46C1"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.bigMic}>
                <Feather name="mic" size={36} color="#FFFFFF" />
              </LinearGradient>
            </Pressable>
          )}

          {step === "listening" && (
            <TouchableOpacity onPress={stopListening} style={styles.stopBtn} activeOpacity={0.8}>
              <View style={styles.stopIcon} />
            </TouchableOpacity>
          )}

          {step === "confirm" && (
            <View style={styles.actionRow}>
              <TouchableOpacity style={[styles.actionBtn, styles.retryBtn]} onPress={retry} activeOpacity={0.8}>
                <Feather name="refresh-cw" size={18} color="#FFFFFF" />
                <Text style={styles.actionBtnText}>Повторить</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.editBtn]} onPress={() => router.replace("/manual-input")} activeOpacity={0.8}>
                <Feather name="edit-3" size={18} color="#FFFFFF" />
                <Text style={styles.actionBtnText}>Изменить</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.confirmBtn]} onPress={confirm} activeOpacity={0.8}>
                <Feather name="check" size={18} color="#1A1A2E" />
                <Text style={[styles.actionBtnText, { color: "#1A1A2E" }]}>Сохранить</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {step === "idle" && (
          <View style={styles.hints}>
            <Text style={styles.hintsTitle}>Попробуйте сказать...</Text>
            {SAMPLE_PHRASES.slice(0, 3).map((p, i) => (
              <View key={i} style={styles.hintRow}>
                <Feather name="mic" size={12} color="rgba(255,255,255,0.5)" />
                <Text style={styles.hintText}>{p}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hexBg: { position: "absolute", inset: 0 },
  hex: {
    position: "absolute",
    width: 36,
    height: 41,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
    borderRadius: 4,
    transform: [{ rotate: "30deg" }],
  },
  nav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  navTitle: {
    fontSize: 17,
    color: "#FFFFFF",
    fontFamily: "Inter_600SemiBold",
  },
  body: { paddingHorizontal: 24, alignItems: "center" },
  waveArea: {
    width: "100%",
    alignItems: "center",
    paddingVertical: 40,
    position: "relative",
  },
  ring: {
    position: "absolute",
    width: 260,
    height: 100,
    borderRadius: 50,
    borderWidth: 1,
  },
  ring2: { width: 340, height: 140 },
  idleHint: {
    marginTop: 20,
    color: "rgba(255,255,255,0.6)",
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  listeningText: {
    marginTop: 16,
    color: "#A8E6CF",
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  transcriptCard: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
  },
  transcriptText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontFamily: "Inter_400Regular",
    lineHeight: 28,
    textAlign: "center",
  },
  confirmCard: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    gap: 14,
  },
  confirmTitle: {
    color: "#A8E6CF",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  parsedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  catIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  parsedInfo: { flex: 1, gap: 3 },
  parsedMerchant: {
    color: "#FFFFFF",
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  parsedCategory: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  parsedAmount: {
    color: "#FCA5A5",
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  transcriptPreview: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  controls: { alignItems: "center", marginBottom: 32 },
  micPressable: {},
  bigMic: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#6B46C1",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 16,
  },
  stopBtn: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "rgba(239,68,68,0.8)",
    alignItems: "center",
    justifyContent: "center",
  },
  stopIcon: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: "#FFFFFF",
  },
  actionRow: { flexDirection: "row", gap: 10 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
  },
  retryBtn: { backgroundColor: "rgba(255,255,255,0.15)" },
  editBtn: { backgroundColor: "rgba(255,255,255,0.15)" },
  confirmBtn: { backgroundColor: "#A8E6CF" },
  actionBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  hints: { width: "100%", gap: 10 },
  hintsTitle: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  hintRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  hintText: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
  },
});
