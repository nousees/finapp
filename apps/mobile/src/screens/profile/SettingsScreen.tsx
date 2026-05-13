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
  const { settings, rates, languageLabel, setSetting, refreshRates, t } = useAppSettings();
  const insets = useSafeAreaInsets();
  const [passwordModal, setPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: "", next: "", confirm: "" });
  const [changingPassword, setChangingPassword] = useState(false);

  const chooseCurrency = () => {
    Alert.alert(t("chooseCurrency"), rateSubtitle(rates), [
      { text: "RUB", onPress: () => setSetting("currency", "RUB") },
      { text: "USD", onPress: () => setSetting("currency", "USD") },
      { text: "EUR", onPress: () => setSetting("currency", "EUR") },
      { text: "Обновить курс", onPress: () => refreshRates() },
      { text: "Отмена", style: "cancel" },
    ]);
  };

  const chooseLanguage = () => {
    Alert.alert(t("chooseLanguage"), "FinApp", [
      { text: "Русский", onPress: () => setSetting("language", "ru") },
      { text: "English", onPress: () => setSetting("language", "en") },
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
      Alert.alert(t("biometricsUnavailable"), t("biometricsUnavailableText"));
      return;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "FinApp",
      cancelLabel: "Cancel",
      disableDeviceFallback: false,
    });
    if (result.success) {
      await setSetting("biometricEnabled", true);
    }
  };

  const clearCache = async () => {
    await AsyncStorage.multiRemove(["transactions_cache", "insights_cache", "reports_cache"]);
    Alert.alert(t("done"), t("cacheCleared"));
  };

  const submitPasswordChange = async () => {
    if (passwordForm.next.length < 8) {
      Alert.alert(t("error"), t("passwordTooShort"));
      return;
    }
    if (passwordForm.next !== passwordForm.confirm) {
      Alert.alert(t("error"), t("passwordMismatch"));
      return;
    }
    try {
      setChangingPassword(true);
      await changePassword(passwordForm.current, passwordForm.next);
      setPasswordModal(false);
      setPasswordForm({ current: "", next: "", confirm: "" });
      Alert.alert(t("done"), t("passwordChanged"));
    } catch (error) {
      Alert.alert(t("error"), error instanceof Error ? error.message : t("passwordFailed"));
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
          <Text style={styles.heroTitle}>{t("settingsTitle")}</Text>
          <Text style={styles.heroText}>{t("settingsText")}</Text>
        </LinearGradient>

        <SettingsSection title={t("main")}>
          <SettingsRow icon="dollar-sign" label={t("currency")} value={`${settings.currency} · ${rateSubtitle(rates)}`} onPress={chooseCurrency} />
          <SettingsRow icon="globe" label={t("language")} value={languageLabel} onPress={chooseLanguage} />
          <SettingsRow icon="moon" label={t("darkTheme")} toggle value={mode === "dark"} onToggle={toggleMode} />
        </SettingsSection>

        <SettingsSection title={t("sync")}>
          <SettingsRow icon="bell" label={t("push")} toggle value={settings.pushEnabled} onToggle={(value) => setSetting("pushEnabled", value)} />
          <SettingsRow icon="refresh-cw" label={t("backgroundSync")} toggle value={settings.backgroundSync} onToggle={(value) => setSetting("backgroundSync", value)} />
          <SettingsRow icon="wifi" label="Pull-to-Refresh" toggle value={settings.pullToRefresh} onToggle={(value) => setSetting("pullToRefresh", value)} />
        </SettingsSection>

        <SettingsSection title={t("security")}>
          <SettingsRow icon="shield" label="JWT + refresh tokens" value={t("active")} />
          <SettingsRow icon="key" label={t("changePassword")} value={t("open")} onPress={() => setPasswordModal(true)} />
          <SettingsRow icon="lock" label={t("biometric")} toggle value={settings.biometricEnabled} onToggle={toggleBiometric} />
          <SettingsRow icon="file-text" label={t("audit")} toggle value={settings.auditEnabled} onToggle={(value) => setSetting("auditEnabled", value)} />
        </SettingsSection>

        <SettingsSection title={t("data")}>
          <SettingsRow icon="download" label={t("exportData")} onPress={() => Alert.alert("FinApp", "Reports screen")} />
          <SettingsRow icon="trash-2" label={t("clearCache")} danger onPress={clearCache} />
        </SettingsSection>
      </ScrollView>

      <Modal visible={passwordModal} transparent animationType="slide" onRequestClose={() => setPasswordModal(false)}>
        <Pressable style={styles.overlay} onPress={() => setPasswordModal(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.background, paddingBottom: 22 + insets.bottom }]} onPress={(event) => event.stopPropagation()}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.text }]}>{t("passwordTitle")}</Text>
            <PasswordField label={t("currentPassword")} value={passwordForm.current} onChangeText={(value) => setPasswordForm((current) => ({ ...current, current: value }))} />
            <PasswordField label={t("newPassword")} value={passwordForm.next} onChangeText={(value) => setPasswordForm((current) => ({ ...current, next: value }))} />
            <PasswordField label={t("repeatPassword")} value={passwordForm.confirm} onChangeText={(value) => setPasswordForm((current) => ({ ...current, confirm: value }))} />
            <Pressable onPress={submitPasswordChange} disabled={changingPassword}>
              <LinearGradient colors={gradients.successDeep} style={[styles.savePassword, changingPassword ? { opacity: 0.7 } : null]}>
                {changingPassword ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.savePasswordText}>{t("savePassword")}</Text>}
              </LinearGradient>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function rateSubtitle(rates) {
  const usd = Number(rates?.rates?.USD || 0).toFixed(2);
  const eur = Number(rates?.rates?.EUR || 0).toFixed(2);
  return `USD ${usd} ₽ · EUR ${eur} ₽`;
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
          <Text style={[styles.rowValue, { color: danger ? colors.danger : colors.textMuted }]} numberOfLines={1}>{value || "Open"}</Text>
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
  rowValueWrap: { maxWidth: "48%", flexDirection: "row", alignItems: "center", gap: 4 },
  rowValue: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
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
