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
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useFinance } from "@/context/FinanceContext";
import { useColors } from "@/hooks/useColors";

const SAMPLE_ROWS = [
  { date: "01.05.2025", merchant: "ВкусВилл", amount: "1 520 ₽", category: "Еда", type: "Расход" },
  { date: "02.05.2025", merchant: "Яндекс.Такси", amount: "800 ₽", category: "Транспорт", type: "Расход" },
  { date: "03.05.2025", merchant: "Netflix", amount: "999 ₽", category: "Развлечения", type: "Расход" },
  { date: "04.05.2025", merchant: "ООО «Акме»", amount: "85 000 ₽", category: "Доход", type: "Доход" },
  { date: "05.05.2025", merchant: "World Class", amount: "4 500 ₽", category: "Здоровье", type: "Расход" },
];

type ImportStep = "drop" | "preview" | "importing" | "done";

export default function FileImportScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addTransaction } = useFinance();
  const [step, setStep] = useState<ImportStep>("drop");
  const [progress, setProgress] = useState(0);
  const topPt = Platform.OS === "web" ? 67 : insets.top;
  const pb = Platform.OS === "web" ? 34 : insets.bottom;

  const simulateImport = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStep("preview");
  };

  const startImport = () => {
    setStep("importing");
    setProgress(0);
    let p = 0;
    const interval = setInterval(() => {
      p += 20;
      setProgress(p);
      if (p >= 100) {
        clearInterval(interval);
        const AMOUNTS = [1520, 800, 999, 85000, 4500];
        const CATEGORIES = ["food", "transport", "entertainment", "income", "health"];
        const MERCHANTS = ["ВкусВилл", "Яндекс.Такси", "Netflix", "ООО «Акме»", "World Class"];
        const TYPES: Array<"income" | "expense"> = ["expense", "expense", "expense", "income", "expense"];
        AMOUNTS.forEach((amt, i) => {
          addTransaction({
            type: TYPES[i],
            amount: amt,
            category: CATEGORIES[i],
            merchant: MERCHANTS[i],
            description: MERCHANTS[i],
          });
        });
        setTimeout(() => setStep("done"), 400);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }, 400);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.nav, { paddingTop: topPt + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.muted }]}>
          <Feather name="x" size={20} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: colors.foreground }]}>Импорт файла</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: pb + 40 }]} showsVerticalScrollIndicator={false}>
        {step === "drop" && (
          <>
            <TouchableOpacity onPress={simulateImport} activeOpacity={0.7} style={[styles.dropZone, { borderColor: colors.border }]}>
              <LinearGradient
                colors={["#6B46C1" + "15", "#A8E6CF" + "15"]}
                style={StyleSheet.absoluteFill}
              />
              <LinearGradient colors={["#6B46C1", "#8B5CF6"]} style={styles.uploadIcon}>
                <Feather name="upload-cloud" size={28} color="#FFFFFF" />
              </LinearGradient>
              <Text style={[styles.dropTitle, { color: colors.foreground }]}>Нажмите для выбора файла</Text>
              <Text style={[styles.dropSub, { color: colors.mutedForeground }]}>
                Поддерживаются CSV и Excel (.xlsx)
              </Text>
              <View style={styles.formatRow}>
                {["CSV", "XLSX", "XLS"].map((f) => (
                  <View key={f} style={[styles.formatBadge, { backgroundColor: colors.secondary }]}>
                    <Text style={[styles.formatText, { color: colors.primary }]}>{f}</Text>
                  </View>
                ))}
              </View>
            </TouchableOpacity>

            <View style={styles.infoSection}>
              <Text style={[styles.infoTitle, { color: colors.foreground }]}>Как это работает</Text>
              {[
                { icon: "upload", text: "Выберите выписку из банка или CSV файл" },
                { icon: "columns", text: "Мы автоматически определим колонки" },
                { icon: "check-circle", text: "Проверьте и подтвердите транзакции" },
              ].map((item, i) => (
                <View key={i} style={styles.infoRow}>
                  <LinearGradient colors={["#6B46C1", "#8B5CF6"]} style={styles.infoIcon}>
                    <Feather name={item.icon as any} size={14} color="#FFFFFF" />
                  </LinearGradient>
                  <Text style={[styles.infoText, { color: colors.mutedForeground }]}>{item.text}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {step === "preview" && (
          <>
            <View style={[styles.fileCard, { backgroundColor: colors.card }]}>
              <Feather name="file-text" size={22} color={colors.primary} />
              <View style={styles.fileInfo}>
                <Text style={[styles.fileName, { color: colors.foreground }]}>выписка_май_2025.csv</Text>
                <Text style={[styles.fileSize, { color: colors.mutedForeground }]}>
                  Найдено {SAMPLE_ROWS.length} транзакций
                </Text>
              </View>
              <TouchableOpacity onPress={() => setStep("drop")}>
                <Feather name="x" size={18} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Маппинг колонок</Text>
            <View style={[styles.mappingCard, { backgroundColor: colors.card }]}>
              {[
                ["Дата", "Колонка A"],
                ["Получатель", "Колонка B"],
                ["Сумма", "Колонка C"],
                ["Категория", "Колонка D"],
                ["Тип", "Колонка E"],
              ].map(([field, col]) => (
                <View key={field} style={[styles.mappingRow, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.mappingField, { color: colors.mutedForeground }]}>{field}</Text>
                  <View style={[styles.mappingValue, { backgroundColor: colors.secondary }]}>
                    <Text style={[styles.mappingValueText, { color: colors.primary }]}>{col}</Text>
                  </View>
                </View>
              ))}
            </View>

            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Предпросмотр</Text>
            <View style={[styles.previewTable, { backgroundColor: colors.card }]}>
              <View style={[styles.tableHeader, { backgroundColor: colors.muted }]}>
                {["Получатель", "Сумма", "Тип"].map((h) => (
                  <Text key={h} style={[styles.tableHeaderText, { color: colors.mutedForeground }]}>{h}</Text>
                ))}
              </View>
              {SAMPLE_ROWS.map((r, i) => (
                <View
                  key={i}
                  style={[
                    styles.tableRow,
                    i < SAMPLE_ROWS.length - 1
                      ? { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }
                      : {},
                  ]}
                >
                  <Text style={[styles.tableCell, { color: colors.foreground }]} numberOfLines={1}>{r.merchant}</Text>
                  <Text
                    style={[
                      styles.tableCell,
                      {
                        color: r.type === "Доход" ? colors.income : colors.expense,
                        fontFamily: "Inter_600SemiBold",
                      },
                    ]}
                  >
                    {r.type === "Доход" ? "+" : "−"}{r.amount}
                  </Text>
                  <Text style={[styles.tableCell, { color: colors.mutedForeground }]}>{r.type}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity onPress={startImport} activeOpacity={0.85}>
              <LinearGradient
                colors={["#6B46C1", "#8B5CF6", "#7ED9B6"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.importBtn}
              >
                <Feather name="download" size={20} color="#FFFFFF" />
                <Text style={styles.importBtnText}>
                  Импортировать {SAMPLE_ROWS.length} транзакций
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </>
        )}

        {step === "importing" && (
          <View style={styles.importingWrap}>
            <LinearGradient colors={["#6B46C1", "#8B5CF6"]} style={styles.loadingIcon}>
              <Feather name="loader" size={28} color="#FFFFFF" />
            </LinearGradient>
            <Text style={[styles.importingTitle, { color: colors.foreground }]}>Идёт импорт...</Text>
            <Text style={[styles.importingSub, { color: colors.mutedForeground }]}>
              Обрабатываю {SAMPLE_ROWS.length} транзакций
            </Text>
            <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
              <LinearGradient
                colors={["#6B46C1", "#A8E6CF"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressFill, { width: `${progress}%` }]}
              />
            </View>
            <Text style={[styles.progressText, { color: colors.mutedForeground }]}>{progress}%</Text>
          </View>
        )}

        {step === "done" && (
          <View style={styles.doneWrap}>
            <LinearGradient colors={["#10B981", "#34D399"]} style={styles.doneIcon}>
              <Feather name="check" size={32} color="#FFFFFF" />
            </LinearGradient>
            <Text style={[styles.doneTitle, { color: colors.foreground }]}>Импорт завершён!</Text>
            <Text style={[styles.doneSub, { color: colors.mutedForeground }]}>
              {SAMPLE_ROWS.length} транзакций успешно добавлены в ваш аккаунт.
            </Text>
            <TouchableOpacity onPress={() => router.back()} activeOpacity={0.85}>
              <LinearGradient colors={["#6B46C1", "#8B5CF6"]} style={styles.doneBtn}>
                <Text style={styles.doneBtnText}>Готово</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
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
  dropZone: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderRadius: 20,
    padding: 40,
    alignItems: "center",
    gap: 12,
    overflow: "hidden",
    marginBottom: 28,
  },
  uploadIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  dropTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  dropSub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  formatRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  formatBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  formatText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  infoSection: { gap: 14 },
  infoTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  fileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    marginBottom: 20,
  },
  fileInfo: { flex: 1 },
  fileName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  fileSize: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    marginBottom: 10,
  },
  mappingCard: {
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 20,
  },
  mappingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  mappingField: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  mappingValue: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  mappingValueText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  previewTable: {
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  tableHeaderText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  tableCell: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  importBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
  },
  importBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  importingWrap: {
    alignItems: "center",
    paddingTop: 60,
    gap: 16,
  },
  loadingIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  importingTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  importingSub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  progressTrack: {
    width: "80%",
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  doneWrap: {
    alignItems: "center",
    paddingTop: 60,
    gap: 16,
  },
  doneIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  doneTitle: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
  },
  doneSub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  doneBtn: {
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
  },
  doneBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
});
