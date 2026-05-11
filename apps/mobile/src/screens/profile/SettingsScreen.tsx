// @ts-nocheck
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { useAppTheme } from "@shared/theme/ThemeProvider";

export function SettingsScreen() {
  const { colors, gradients, mode, toggleMode } = useAppTheme();
  const [pushEnabled, setPushEnabled] = useState(true);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [backgroundSync, setBackgroundSync] = useState(true);

  return (
    <ScrollView style={[styles.scroll, { backgroundColor: colors.background }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={gradients.success} style={styles.hero}>
        <Text style={styles.heroLabel}>FinApp</Text>
        <Text style={styles.heroTitle}>Настройки приложения</Text>
        <Text style={styles.heroText}>Синхронизация, безопасность и поведение мобильного клиента.</Text>
      </LinearGradient>

      <SettingsSection title="Основные">
        <SettingsRow icon="dollar-sign" label="Валюта по умолчанию" value="RUB" />
        <SettingsRow icon="globe" label="Язык" value="Русский" />
        <SettingsRow icon="moon" label="Темная тема" toggle value={mode === "dark"} onToggle={toggleMode} />
      </SettingsSection>

      <SettingsSection title="Уведомления и синхронизация">
        <SettingsRow icon="bell" label="Push-уведомления" toggle value={pushEnabled} onToggle={setPushEnabled} />
        <SettingsRow icon="refresh-cw" label="Фоновая синхронизация" toggle value={backgroundSync} onToggle={setBackgroundSync} />
        <SettingsRow icon="wifi" label="Pull-to-Refresh" value="Включено" />
      </SettingsSection>

      <SettingsSection title="Безопасность">
        <SettingsRow icon="shield" label="JWT + refresh tokens" value="Активно" />
        <SettingsRow icon="lock" label="Биометрический вход" toggle value={biometricEnabled} onToggle={setBiometricEnabled} />
        <SettingsRow icon="file-text" label="Аудит операций" value="Включён" />
      </SettingsSection>

      <SettingsSection title="Данные">
        <SettingsRow icon="download" label="Экспорт данных" onPress={() => Alert.alert("Экспорт", "Экспорт будет доступен после генерации отчёта.")} />
        <SettingsRow icon="trash-2" label="Очистить локальный кеш" danger onPress={() => Alert.alert("Кеш", "Локальный кеш будет очищен при следующей синхронизации.")} />
      </SettingsSection>
    </ScrollView>
  );
}

function SettingsSection({ title, children }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{title}</Text>
      <View style={[styles.card, { backgroundColor: colors.surface }]}>{children}</View>
    </View>
  );
}

function SettingsRow({ icon, label, value, toggle, onToggle, onPress, danger }) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <View style={[styles.rowIcon, { backgroundColor: danger ? `${colors.danger}15` : colors.surfaceAlt }]}>
        <Feather name={icon} size={17} color={danger ? colors.danger : colors.primary} />
      </View>
      <Text style={[styles.rowLabel, { color: danger ? colors.danger : colors.text }]}>{label}</Text>
      {toggle ? (
        <Switch value={value} onValueChange={onToggle} trackColor={{ false: colors.border, true: `${colors.primary}80` }} thumbColor={colors.white} />
      ) : (
        <Text onPress={onPress} style={[styles.rowValue, { color: danger ? colors.danger : colors.textMuted }]}>
          {value || "Открыть"}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 120, gap: 16 },
  hero: { borderRadius: 20, padding: 22, gap: 6 },
  heroLabel: { color: "rgba(255,255,255,0.72)", fontSize: 12, fontFamily: "Inter_400Regular" },
  heroTitle: { color: "#FFFFFF", fontSize: 26, fontFamily: "Inter_700Bold" },
  heroText: { color: "rgba(255,255,255,0.74)", fontSize: 13, lineHeight: 19, fontFamily: "Inter_400Regular" },
  section: { gap: 8 },
  sectionTitle: { fontSize: 13, fontFamily: "Inter_700Bold", textTransform: "uppercase" },
  card: { borderRadius: 16, overflow: "hidden" },
  row: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  rowIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  rowLabel: { flex: 1, fontSize: 15, fontFamily: "Inter_600SemiBold" },
  rowValue: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
