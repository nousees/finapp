// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { LinearGradient } from "expo-linear-gradient";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TransactionsStackParamList } from "@app/navigation/types";
import { enrichText, EnrichedVoiceTransaction, transcribeAudioFile } from "@shared/api/ml";
import { processTransaction } from "@shared/api/processing";
import { createTransaction, updateTransaction } from "@shared/api/transactions";
import { getCategoryByCode, getCategoryByName } from "@shared/constants/categories";
import { useAppSettings } from "@shared/settings/AppSettingsContext";
import { useAppTheme } from "@shared/theme/ThemeProvider";

type Props = NativeStackScreenProps<TransactionsStackParamList, "VoiceCapture">;
type Step = "idle" | "recording" | "processing" | "confirm" | "saved";

export function VoiceCaptureScreen({ navigation }: Props) {
  const { gradients } = useAppTheme();
  const { formatMoney } = useAppSettings();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState("");
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [step, setStep] = useState<Step>("idle");
  const [parsed, setParsed] = useState<EnrichedVoiceTransaction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const bars = useMemo(() => Array.from({ length: 18 }, (_, index) => index), []);

  useEffect(() => {
    return () => {
      if (recording) void recording.stopAndUnloadAsync().catch(() => null);
    };
  }, [recording]);

  const processPhrase = async (phrase: string) => {
    if (!phrase.trim()) {
      setError("Введите или произнесите фразу о транзакции.");
      setStep("idle");
      return;
    }
    setStep("processing");
    setError(null);
    const enriched = await enrichText(phrase.trim());
    setParsed(enriched);
    setStep("confirm");
  };

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Нет доступа к микрофону", "Разрешите доступ к микрофону, чтобы использовать голосовой ввод.");
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const result = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(result.recording);
      setStep("recording");
      setError(null);
    } catch (recordError) {
      setError(recordError instanceof Error ? recordError.message : "Не удалось начать запись.");
      setStep("idle");
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    try {
      setStep("processing");
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      if (!uri) throw new Error("Не удалось получить файл записи.");
      const transcription = await transcribeAudioFile({
        uri,
        name: "finapp-voice.m4a",
        mimeType: "audio/m4a",
      });
      const phrase = transcription.text || text;
      setText(phrase);
      await processPhrase(phrase);
    } catch (recordError) {
      setRecording(null);
      setError(recordError instanceof Error ? recordError.message : "Не удалось распознать голос. Можно распознать текст из поля ниже.");
      setStep("idle");
    }
  };

  const handleMicPress = () => {
    if (step === "processing") return;
    if (recording) {
      void stopRecording();
      return;
    }
    void startRecording();
  };

  const handleSave = async () => {
    const tx = parsed?.transaction;
    if (!tx?.amount) {
      setError("В распознанной операции нет суммы.");
      return;
    }
    try {
      setError(null);
      const categoryId = getCategoryByCode(tx.category_code)?.id || getCategoryByName(tx.category_name)?.id;
      const created = await createTransaction({
        amount: tx.amount,
        currency: tx.currency || "RUB",
        type: tx.operation_type === "income" ? "INCOME" : "EXPENSE",
        category_id: categoryId,
        description: tx.description || text,
        date: tx.date || undefined,
      });
      if (categoryId) {
        await updateTransaction(created.id, { category_id: categoryId, is_verified: !parsed.needs_review }).catch(() => null);
      } else {
        await processTransaction(created.id).catch(() => null);
      }
      setStep("saved");
      setTimeout(() => navigation.navigate("TransactionsList"), 650);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Не удалось сохранить транзакцию.");
    }
  };

  return (
    <LinearGradient colors={["#3D1A8A", "#6B46C1", "#8B5CF6", "#7ED9B6"]} start={{ x: 0, y: 0 }} end={{ x: 0.3, y: 1 }} style={styles.root}>
      <View style={[styles.nav, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => navigation.navigate("TransactionsList")} style={styles.closeButton}>
          <Feather name="x" size={22} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.navTitle}>Голосовой ввод</Text>
        <View style={styles.closeButton} />
      </View>

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: 120 + insets.bottom }]} showsVerticalScrollIndicator={false}>
        <View style={styles.waveArea}>
          <View style={styles.waveRow}>
            {bars.map((index) => (
              <WaveBar key={index} index={index} active={step === "recording" || step === "processing"} />
            ))}
          </View>
          <Text style={styles.waveLabel}>{statusText(step)}</Text>
        </View>

        <Pressable onPress={handleMicPress} disabled={step === "processing"} style={styles.micWrap}>
          <LinearGradient colors={["#A8E6CF", "#7ED9B6", "#6B46C1"]} style={[styles.bigMic, { opacity: step === "processing" ? 0.65 : 1 }]}>
            <Feather name={recording ? "square" : "mic"} size={34} color="#FFFFFF" />
          </LinearGradient>
          <Text style={styles.micHint}>{recording ? "Нажмите, чтобы остановить" : "Нажмите, чтобы записать"}</Text>
        </Pressable>

        <View style={styles.transcriptCard}>
          <TextInput
            multiline
            value={text}
            onChangeText={setText}
            placeholder=""
            placeholderTextColor="transparent"
            style={styles.transcriptInput}
          />
          <Pressable onPress={() => processPhrase(text)} disabled={step === "processing"} style={styles.textParseButton}>
            <Text style={styles.textParseButtonText}>Распознать текст</Text>
          </Pressable>
        </View>

        {step === "confirm" && parsed ? (
          <View style={styles.confirmCard}>
            <Text style={styles.confirmLabel}>Транзакция распознана</Text>
            <View style={styles.parsedRow}>
              <View style={styles.parsedIcon}>
                <Feather name={parsed.transaction.operation_type === "income" ? "arrow-down-left" : "arrow-up-right"} size={22} color="#FFFFFF" />
              </View>
              <View style={styles.parsedInfo}>
                <Text style={styles.parsedMerchant}>{parsed.transaction.merchant || parsed.transaction.category_name || "Операция"}</Text>
                <Text style={styles.parsedMeta}>
                  {parsed.transaction.category_name} · уверенность {Math.round(parsed.confidence.overall * 100)}%
                </Text>
              </View>
              <Text style={styles.parsedAmount}>{parsed.transaction.operation_type === "income" ? "+" : "-"}{formatMoney(parsed.transaction.amount || 0)}</Text>
            </View>
            {parsed.needs_review ? <Text style={styles.reviewText}>Нужна проверка: ML уверен не полностью.</Text> : null}
          </View>
        ) : null}

        {step === "saved" ? (
          <View style={styles.savedCard}>
            <Feather name="check-circle" size={26} color="#A8E6CF" />
            <Text style={styles.savedText}>Транзакция сохранена</Text>
          </View>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {step === "confirm" ? (
          <View style={styles.actions}>
            <Pressable style={styles.secondaryButton} onPress={() => setStep("idle")}>
              <Feather name="refresh-cw" size={18} color="#FFFFFF" />
              <Text style={styles.secondaryText}>Повторить</Text>
            </Pressable>
            <Pressable style={styles.saveButtonWrap} onPress={handleSave}>
              <LinearGradient colors={["#A8E6CF", "#7ED9B6"]} style={styles.saveButton}>
                <Feather name="check" size={18} color="#1A1A2E" />
                <Text style={styles.saveText}>Сохранить</Text>
              </LinearGradient>
            </Pressable>
          </View>
        ) : null}

      </ScrollView>
    </LinearGradient>
  );
}

function statusText(step: Step) {
  if (step === "recording") return "Идет запись...";
  if (step === "processing") return "Обрабатываю...";
  if (step === "confirm") return "Проверьте результат";
  return "Готов к записи";
}

function WaveBar({ index, active }: { index: number; active: boolean }) {
  const height = useSharedValue(12);
  const target = 28 + ((index + 3) % 6) * 8;

  useEffect(() => {
    if (active) {
      height.value = withDelay(
        index * 35,
        withRepeat(withSequence(withTiming(target, { duration: 380 }), withTiming(12, { duration: 360 })), -1, true),
      );
    } else {
      height.value = withTiming(14 + (index % 4) * 5, { duration: 240 });
    }
  }, [active, height, index, target]);

  const style = useAnimatedStyle(() => ({ height: height.value }));
  const palette = ["#A8E6CF", "#7ED9B6", "#8B5CF6", "#FFFFFF"];
  return <Animated.View style={[styles.waveBar, style, { backgroundColor: palette[index % palette.length] }]} />;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  nav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 12 },
  closeButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  navTitle: { color: "#FFFFFF", fontSize: 17, fontFamily: "Inter_600SemiBold" },
  body: { paddingHorizontal: 24 },
  waveArea: { alignItems: "center", paddingVertical: 28 },
  waveRow: { height: 96, flexDirection: "row", alignItems: "flex-end", gap: 6 },
  waveBar: { width: 8, borderRadius: 6, opacity: 0.92 },
  waveLabel: { marginTop: 16, color: "#A8E6CF", fontSize: 15, fontFamily: "Inter_500Medium" },
  micWrap: { alignItems: "center", marginBottom: 20, gap: 10 },
  bigMic: { width: 88, height: 88, borderRadius: 44, alignItems: "center", justifyContent: "center" },
  micHint: { color: "rgba(255,255,255,0.72)", fontSize: 13, fontFamily: "Inter_500Medium" },
  transcriptCard: { backgroundColor: "rgba(255,255,255,0.13)", borderRadius: 16, padding: 16, marginBottom: 20, gap: 12 },
  transcriptInput: { minHeight: 88, color: "#FFFFFF", fontSize: 17, lineHeight: 25, fontFamily: "Inter_400Regular", textAlignVertical: "top" },
  textParseButton: { minHeight: 42, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.18)" },
  textParseButtonText: { color: "#FFFFFF", fontSize: 14, fontFamily: "Inter_700Bold" },
  confirmCard: { backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 20, padding: 18, gap: 13, marginBottom: 18 },
  confirmLabel: { color: "#A8E6CF", fontSize: 12, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 1 },
  parsedRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  parsedIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" },
  parsedInfo: { flex: 1, gap: 3 },
  parsedMerchant: { color: "#FFFFFF", fontSize: 17, fontFamily: "Inter_700Bold" },
  parsedMeta: { color: "rgba(255,255,255,0.68)", fontSize: 12, fontFamily: "Inter_400Regular" },
  parsedAmount: { color: "#FCA5A5", fontSize: 19, fontFamily: "Inter_700Bold" },
  reviewText: { color: "rgba(255,255,255,0.7)", fontSize: 13, fontFamily: "Inter_500Medium" },
  savedCard: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 16 },
  savedText: { color: "#FFFFFF", fontSize: 16, fontFamily: "Inter_700Bold" },
  error: { color: "#FCA5A5", fontSize: 13, lineHeight: 19, fontFamily: "Inter_500Medium", marginBottom: 14 },
  actions: { alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 10, marginBottom: 30 },
  secondaryButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, height: 52, borderRadius: 15, backgroundColor: "rgba(255,255,255,0.15)" },
  secondaryText: { color: "#FFFFFF", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  saveButtonWrap: { flex: 1 },
  saveButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, height: 52, borderRadius: 15 },
  saveText: { color: "#1A1A2E", fontSize: 14, fontFamily: "Inter_700Bold" },
  hints: { gap: 10 },
  hintsTitle: { color: "rgba(255,255,255,0.52)", fontSize: 12, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 1 },
  hintRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  hintText: { flex: 1, color: "rgba(255,255,255,0.62)", fontSize: 14, lineHeight: 20, fontFamily: "Inter_400Regular", fontStyle: "italic" },
});
