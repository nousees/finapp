// @ts-nocheck
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import * as LocalAuthentication from "expo-local-authentication";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { changePassword } from "@shared/api/auth";
import { useAppSettings } from "@shared/settings/AppSettingsContext";
import { useAppTheme } from "@shared/theme/ThemeProvider";

export function SettingsScreen() {
  const { colors, gradients, mode, toggleMode } = useAppTheme();
  const { settings, languageLabel, setSetting } = useAppSettings();
  const insets = useSafeAreaInsets();
  const [passwordModal, setPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: "", next: "", confirm: "" });
  const [changingPassword, setChangingPassword] = useState(false);

  const update = (key, value) => void setSetting(key, value);

  const chooseCurrency = () => {
    Alert.alert("Валюта", "Выберите валюту интерфейса", [
      { text: "RUB", onPress: () => update("currency", "RUB") },
      { text: "USD", onPress: () => update("currency", "USD") },
      { text: "EUR", onPress: () => update("currency", "EUR") },
      { text: "Отмена", style: "cancel" },
    ]);
  };

  const chooseLanguage = () => {
    Alert.alert("Язык", "Интерфейс FinApp", [
      { text: "Русский", onPress: () => update("language", "ru") },
      { text: "English", onPress: () => update("language", "en") },
      { text: "Отмена", style: "cancel" },
    ]);
  };

  const toggleBiometric = async (value: boolean) => {
    if (!value) {
      await setSetting("biometricEnabled", false);
      return;
    }

    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!hasHardware || !enrolled) {
      Alert.alert("Биометрия недоступна", "На устройстве нет настроенной биометрической проверки.");
      return;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Включить биометрический вход FinApp",
      cancelLabel: "Отмена",
      disableDeviceFallback: false,
    });
    if (result.success) {
      await setSetting("biometricEnabled", true);
    }
  };

  const clearCache = async () => {
    await AsyncStorage.multiRemove(["transactions_cache", "insights_cache", "reports_cache"]);
    Alert.alert("Кэш", "Локальный кэш очищен.");
  };

  const submitPasswordChange = async () => {
    if (passwordForm.next.length < 8) {
      Alert.alert("Ошибка", "Новый пароль должен содержать минимум 8 символов.");
      return;
    }
    if (passwordForm.next !== passwordForm.confirm) {
      Alert.alert("Ошибка", "Подтверждение пароля не совпадает.");
      return;
    }
    try {
      setChangingPassword(true);
      await changePassword(passwordForm.current, passwordForm.next);
      setPasswordModal(false);
      setPasswordForm({ current: "", next: "", confirm: "" });
      Alert.alert("Готово", "Пароль изменён.");
    } catch (error) {
      Alert.alert("Ошибка", error instanceof Error ? error.message : "Не удалось изменить пароль.");
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 18, paddingBottom: 120 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient colors={gradients.success} style={styles.hero}>
          <Text style={styles.heroLabel}>FinApp</Text>
          <Text style={styles.heroTitle}>Настройки приложения</Text>
          <Text style={styles.heroText}>Синхронизация, безопасность и поведение мобильного клиента.</Text>
        </LinearGradient>

        <SettingsSection title="Основные">
          <SettingsRow icon="dollar-sign" label="Валюта по умолчанию" value={settings.currency} onPress={chooseCurrency} />
          <SettingsRow icon="globe" label="Язык" value={languageLabel} onPress={chooseLanguage} />
          <SettingsRow icon="moon" label="Темная тема" toggle value={mode === "dark"} onToggle={toggleMode} />
        </SettingsSection>

        <SettingsSection title="Уведомления и синхронизация">
          <SettingsRow icon="bell" label="Push-уведомления" toggle value={settings.pushEnabled} onToggle={(value) => update("pushEnabled", value)} />
          <SettingsRow icon="refresh-cw" label="Фоновая синхронизация" toggle value={settings.backgroundSync} onToggle={(value) => update("backgroundSync", value)} />
          <SettingsRow icon="wifi" label="Pull-to-Refresh" toggle value={settings.pullToRefresh} onToggle={(value) => update("pullToRefresh", value)} />
        </SettingsSection>

        <SettingsSection title="Безопасность">
          <SettingsRow icon="shield" label="JWT + refresh tokens" value="Активно" onPress={() => Alert.alert("Безопасность", "Сессии работают через access token и refresh token.")} />
          <SettingsRow icon="key" label="Сменить пароль" value="Открыть" onPress={() => setPasswordModal(true)} />
          <SettingsRow icon="lock" label="Биометрический вход" toggle value={settings.biometricEnabled} onToggle={toggleBiometric} />
          <SettingsRow icon="file-text" label="Аудит операций" toggle value={settings.auditEnabled} onToggle={(value) => update("auditEnabled", value)} />
        </SettingsSection>

        <SettingsSection title="Данные">
          <SettingsRow icon="download" label="Экспорт данных" onPress={() => Alert.alert("Экспорт", "Откройте раздел отчетов и сформируйте отчет за нужный период.")} />
          <SettingsRow icon="trash-2" label="Очистить локальный кэш" danger onPress={clearCache} />
        </SettingsSection>
      </ScrollView>

      <Modal visible={passwordModal} transparent animationType="slide" onRequestClose={() => setPasswordModal(false)}>
        <Pressable style={styles.overlay} onPress={() => setPasswordModal(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.background, paddingBottom: 22 + insets.bottom }]} onPress={(event) => event.stopPropagation()}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.text }]}>Смена пароля</Text>
            <PasswordField label="Текущий пароль" value={passwordForm.current} onChangeText={(value) => setPasswordForm((current) => ({ ...current, current: value }))} />
            <PasswordField label="Новый пароль" value={passwordForm.next} onChangeText={(value) => setPasswordForm((current) => ({ ...current, next: value }))} />
            <PasswordField label="Повторите новый пароль" value={passwordForm.confirm} onChangeText={(value) => setPasswordForm((current) => ({ ...current, confirm: value }))} />
            <Pressable onPress={submitPasswordChange} disabled={changingPassword}>
              <LinearGradient colors={gradients.successDeep} style={[styles.savePassword, changingPassword ? { opacity: 0.7 } : null]}>
                {changingPassword ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.savePasswordText}>Сохранить пароль</Text>}
              </LinearGradient>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
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
    <Pressable style={[styles.row, { borderBottomColor: colors.border }]} onPress={onPress} disabled={toggle && !onPress}>
      <View style={[styles.rowIcon, { backgroundColor: danger ? `${colors.danger}15` : colors.surfaceAlt }]}>
        <Feather name={icon} size={17} color={danger ? colors.danger : colors.primary} />
      </View>
      <Text style={[styles.rowLabel, { color: danger ? colors.danger : colors.text }]}>{label}</Text>
      {toggle ? (
        <Switch value={value} onValueChange={onToggle} trackColor={{ false: colors.border, true: `${colors.primary}80` }} thumbColor={colors.white} />
      ) : (
        <View style={styles.rowValueWrap}>
          <Text style={[styles.rowValue, { color: danger ? colors.danger : colors.textMuted }]}>{value || "Открыть"}</Text>
          <Feather name="chevron-right" size={17} color={colors.textMuted} />
        </View>
      )}
    </Pressable>
  );
}

function PasswordField({ label, ...props }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.passwordField}>
      <Text style={[styles.passwordLabel, { color: colors.textMuted }]}>{label}</Text>
      <TextInput {...props} secureTextEntry placeholderTextColor={colors.textMuted} style={[styles.passwordInput, { backgroundColor: colors.surfaceAlt, color: colors.text }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 16 },
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
  rowValueWrap: { flexDirection: "row", alignItems: "center", gap: 4 },
  rowValue: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, gap: 12 },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 4 },
  sheetTitle: { fontSize: 22, fontFamily: "Inter_700Bold", marginBottom: 4 },
  passwordField: { gap: 6 },
  passwordLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  passwordInput: { minHeight: 48, borderRadius: 14, paddingHorizontal: 14, fontSize: 15, fontFamily: "Inter_400Regular" },
  savePassword: { minHeight: 52, borderRadius: 16, alignItems: "center", justifyContent: "center", marginTop: 4 },
  savePasswordText: { color: "#FFFFFF", fontSize: 16, fontFamily: "Inter_700Bold" },
});
