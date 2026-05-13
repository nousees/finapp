import { useState } from "react";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TransactionsStackParamList } from "@app/navigation/types";
import { importStatementFile } from "@shared/api/ml";
import { useAppTheme } from "@shared/theme/ThemeProvider";

type Props = NativeStackScreenProps<TransactionsStackParamList, "ImportCenter">;
type Step = "drop" | "preview" | "importing" | "done";

const previewRows = [
  { merchant: "ВкусВилл", amount: "1 520 ₽", type: "Расход" },
  { merchant: "Яндекс.Такси", amount: "800 ₽", type: "Расход" },
  { merchant: "Netflix", amount: "999 ₽", type: "Расход" },
  { merchant: "ООО Акме", amount: "85 000 ₽", type: "Доход" },
];

export function ImportCenterScreen({ navigation }: Props) {
  const { colors, gradients } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>("drop");
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [result, setResult] = useState<{ processed_records: number; errors: Array<Record<string, unknown>> } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pickFile = async () => {
    setError(null);
    const response = await DocumentPicker.getDocumentAsync({
      type: [
        "text/csv",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (response.canceled || !response.assets?.[0]) {
      return;
    }
    setSelectedFile(response.assets[0]);
    setStep("preview");
  };

  const startImport = async () => {
    if (!selectedFile) {
      return;
    }
    try {
      setStep("importing");
      setError(null);
      const imported = await importStatementFile({
        uri: selectedFile.uri,
        name: selectedFile.name,
        mimeType: selectedFile.mimeType,
      });
      setResult(imported);
      setStep("done");
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "Не удалось импортировать файл.");
      setStep("preview");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.nav, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => navigation.goBack()} style={[styles.roundButton, { backgroundColor: colors.surfaceAlt }]}>
          <Feather name="x" size={20} color={colors.text} />
        </Pressable>
        <Text style={[styles.navTitle, { color: colors.text }]}>Импорт файла</Text>
        <View style={styles.roundButton} />
      </View>

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: 120 + insets.bottom }]} showsVerticalScrollIndicator={false}>
        {step === "drop" ? (
          <>
            <Pressable onPress={pickFile} style={[styles.dropZone, { borderColor: colors.border }]}>
              <LinearGradient colors={["#6B46C115", "#A8E6CF20"]} style={StyleSheet.absoluteFill} />
              <LinearGradient colors={gradients.successDeep} style={styles.uploadIcon}>
                <Feather name="upload-cloud" size={28} color="#FFFFFF" />
              </LinearGradient>
              <Text style={[styles.dropTitle, { color: colors.text }]}>Выберите выписку</Text>
              <Text style={[styles.dropSub, { color: colors.textMuted }]}>Поддерживаются CSV и Excel</Text>
              <View style={styles.formatRow}>
                {["CSV", "XLSX", "XLS"].map((format) => (
                  <View key={format} style={[styles.formatBadge, { backgroundColor: colors.surfaceAlt }]}>
                    <Text style={[styles.formatText, { color: colors.primary }]}>{format}</Text>
                  </View>
                ))}
              </View>
            </Pressable>

            <InfoSection />
          </>
        ) : null}

        {step === "preview" && selectedFile ? (
          <>
            <View style={[styles.fileCard, { backgroundColor: colors.surface }]}>
              <Feather name="file-text" size={22} color={colors.primary} />
              <View style={styles.fileInfo}>
                <Text style={[styles.fileName, { color: colors.text }]} numberOfLines={1}>{selectedFile.name}</Text>
                <Text style={[styles.fileSize, { color: colors.textMuted }]}>{formatBytes(selectedFile.size)} · готов к загрузке</Text>
              </View>
              <Pressable onPress={() => setStep("drop")}>
                <Feather name="x" size={18} color={colors.textMuted} />
              </Pressable>
            </View>

            <Text style={[styles.sectionTitle, { color: colors.text }]}>Предпросмотр структуры</Text>
            <View style={[styles.previewTable, { backgroundColor: colors.surface }]}>
              <View style={[styles.tableHeader, { backgroundColor: colors.surfaceAlt }]}>
                {["Получатель", "Сумма", "Тип"].map((title) => (
                  <Text key={title} style={[styles.tableHeaderText, { color: colors.textMuted }]}>{title}</Text>
                ))}
              </View>
              {previewRows.map((row, index) => (
                <View key={row.merchant} style={[styles.tableRow, index < previewRows.length - 1 ? { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth } : null]}>
                  <Text style={[styles.tableCell, { color: colors.text }]} numberOfLines={1}>{row.merchant}</Text>
                  <Text style={[styles.tableCell, { color: row.type === "Доход" ? colors.success : colors.danger, fontFamily: "Inter_700Bold" }]}>
                    {row.type === "Доход" ? "+" : "−"}{row.amount}
                  </Text>
                  <Text style={[styles.tableCell, { color: colors.textMuted }]}>{row.type}</Text>
                </View>
              ))}
            </View>

            {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

            <Pressable onPress={startImport}>
              <LinearGradient colors={gradients.success} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.importButton}>
                <Feather name="download" size={20} color="#FFFFFF" />
                <Text style={styles.importText}>Импортировать операции</Text>
              </LinearGradient>
            </Pressable>
          </>
        ) : null}

        {step === "importing" ? (
          <View style={styles.centerState}>
            <LinearGradient colors={gradients.successDeep} style={styles.stateIcon}>
              <Feather name="loader" size={28} color="#FFFFFF" />
            </LinearGradient>
            <Text style={[styles.stateTitle, { color: colors.text }]}>Идёт импорт...</Text>
            <Text style={[styles.stateSub, { color: colors.textMuted }]}>Файл отправлен в collection-сервис.</Text>
          </View>
        ) : null}

        {step === "done" ? (
          <View style={styles.centerState}>
            <LinearGradient colors={["#10B981", "#34D399"]} style={styles.stateIcon}>
              <Feather name="check" size={32} color="#FFFFFF" />
            </LinearGradient>
            <Text style={[styles.stateTitle, { color: colors.text }]}>Импорт завершён</Text>
            <Text style={[styles.stateSub, { color: colors.textMuted }]}>
              Обработано записей: {result?.processed_records ?? 0}. Ошибок: {result?.errors?.length ?? 0}.
            </Text>
            <Pressable onPress={() => navigation.goBack()}>
              <LinearGradient colors={gradients.successDeep} style={styles.doneButton}>
                <Text style={styles.doneText}>Готово</Text>
              </LinearGradient>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function InfoSection() {
  const { colors, gradients } = useAppTheme();
  const items = [
    { icon: "upload", text: "Загрузите банковскую выписку без Open Banking API" },
    { icon: "columns", text: "FinApp определит колонки даты, суммы и описания" },
    { icon: "check-circle", text: "После импорта операции уйдут на ML-категоризацию" },
  ];
  return (
    <View style={styles.infoSection}>
      <Text style={[styles.infoTitle, { color: colors.text }]}>Как это работает</Text>
      {items.map((item) => (
        <View key={item.text} style={styles.infoRow}>
          <LinearGradient colors={gradients.successDeep} style={styles.infoIcon}>
            <Feather name={item.icon as any} size={14} color="#FFFFFF" />
          </LinearGradient>
          <Text style={[styles.infoText, { color: colors.textMuted }]}>{item.text}</Text>
        </View>
      ))}
    </View>
  );
}

function formatBytes(value?: number | null) {
  if (!value) return "размер неизвестен";
  if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} МБ`;
  return `${Math.max(1, Math.round(value / 1024))} КБ`;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  nav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 12 },
  roundButton: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  navTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  body: { paddingHorizontal: 20, paddingTop: 8 },
  dropZone: { borderWidth: 2, borderStyle: "dashed", borderRadius: 20, padding: 40, alignItems: "center", gap: 12, overflow: "hidden", marginBottom: 28 },
  uploadIcon: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center" },
  dropTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  dropSub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  formatRow: { flexDirection: "row", gap: 8 },
  formatBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8 },
  formatText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  infoSection: { gap: 14 },
  infoTitle: { fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: 4 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  infoIcon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  infoText: { flex: 1, fontSize: 14, lineHeight: 20, fontFamily: "Inter_400Regular" },
  fileCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, marginBottom: 20 },
  fileInfo: { flex: 1 },
  fileName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  fileSize: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 10 },
  previewTable: { borderRadius: 14, overflow: "hidden", marginBottom: 20 },
  tableHeader: { flexDirection: "row", paddingHorizontal: 14, paddingVertical: 8 },
  tableHeaderText: { flex: 1, fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "uppercase" },
  tableRow: { flexDirection: "row", paddingHorizontal: 14, paddingVertical: 11 },
  tableCell: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  error: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 12 },
  importButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16, borderRadius: 16 },
  importText: { color: "#FFFFFF", fontSize: 16, fontFamily: "Inter_700Bold" },
  centerState: { alignItems: "center", paddingTop: 70, gap: 16 },
  stateIcon: { width: 78, height: 78, borderRadius: 39, alignItems: "center", justifyContent: "center" },
  stateTitle: { fontSize: 23, fontFamily: "Inter_700Bold" },
  stateSub: { fontSize: 14, lineHeight: 21, textAlign: "center", fontFamily: "Inter_400Regular" },
  doneButton: { paddingHorizontal: 42, paddingVertical: 14, borderRadius: 14 },
  doneText: { color: "#FFFFFF", fontSize: 16, fontFamily: "Inter_700Bold" },
});
