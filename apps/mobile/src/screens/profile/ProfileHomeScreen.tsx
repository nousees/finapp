// @ts-nocheck
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ProfileStackParamList } from "@app/navigation/types";
import { getFinancialInsights } from "@shared/api/analysis";
import { listTransactions } from "@shared/api/transactions";
import { useUser } from "@shared/contexts/UserContext";
import { useAppSettings } from "@shared/settings/AppSettingsContext";
import { useAppTheme } from "@shared/theme/ThemeProvider";

type Props = NativeStackScreenProps<ProfileStackParamList, "ProfileHome"> & {
  onLogout?: () => void;
};

type EditableProfile = {
  displayName: string;
  phone: string;
  city: string;
};

const PROFILE_STORAGE_KEY = "profile_details";
const emptyProfile: EditableProfile = {
  displayName: "",
  phone: "",
  city: "",
};

export function ProfileHomeScreen({ navigation, onLogout }: Props) {
  const { colors, gradients, mode, toggleMode } = useAppTheme();
  const { settings, setSetting, formatMoney, t } = useAppSettings();
  const { user } = useUser();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<EditableProfile>(emptyProfile);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [insights, setInsights] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const profileStorageKey = useMemo(() => `${PROFILE_STORAGE_KEY}:${user?.id || user?.email || "anonymous"}`, [user?.email, user?.id]);

  useEffect(() => {
    void loadProfile();
  }, [profileStorageKey]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([getFinancialInsights().catch(() => null), listTransactions({ limit: 1000 }).catch(() => [])]).then(([nextInsights, tx]) => {
        if (!active) return;
        setInsights(nextInsights);
        setTransactions(Array.isArray(tx) ? tx : []);
      });
      return () => {
        active = false;
      };
    }, []),
  );

  const displayName = profile.displayName.trim() || user?.full_name || t("profileFallbackName");
  const email = user?.email || t("emailMissing");
  const hasProfile = useMemo(() => Object.values(profile).some((value) => value.trim().length > 0), [profile]);
  const initials = useMemo(() => {
    const source = displayName || email;
    return source
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [displayName, email]);

  const totals = useMemo(() => calculateTransactionTotals(transactions), [transactions]);
  const summary = insights?.summary;
  const hasTransactions = transactions.length > 0;
  const income = hasTransactions ? totals.income : Number(summary?.totalIncome || 0);
  const expense = hasTransactions ? totals.expense : Number(summary?.totalExpenses || 0);
  const reservedInGoals = (Array.isArray(insights?.goals) ? insights.goals : []).reduce((sum, goal) => sum + Number(goal.currentAmount || 0), 0);
  const netSavings = (hasTransactions ? totals.balance : Number(summary?.netSavings || income - expense || 0)) - reservedInGoals;
  const savingsRate = income > 0 ? Math.round(((income - expense) / income) * 100) : 0;
  const healthScore = Math.round(insights?.healthScore?.score ?? Math.max(35, Math.min(92, 60 + savingsRate)));

  const loadProfile = async () => {
    try {
      setProfile(emptyProfile);
      const savedProfile = await AsyncStorage.getItem(profileStorageKey);
      if (savedProfile) {
        setProfile({ ...emptyProfile, ...JSON.parse(savedProfile) });
      }
    } catch (error) {
      console.error("Profile load error:", error);
    }
  };

  const updateField = (field: keyof EditableProfile, value: string) => {
    setProfile((current) => ({ ...current, [field]: value }));
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const normalizedProfile = {
        displayName: profile.displayName.trim(),
        phone: profile.phone.trim(),
        city: profile.city.trim(),
      };
      await AsyncStorage.setItem(profileStorageKey, JSON.stringify(normalizedProfile));
      setProfile(normalizedProfile);
      setIsEditing(false);
    } catch (error) {
      console.error("Profile save error:", error);
      Alert.alert(t("error"), t("profileSaveError"));
    } finally {
      setSaving(false);
    }
  };

  const confirmLogout = () => {
    Alert.alert(t("logoutTitle"), t("logoutText"), [
      { text: t("cancel"), style: "cancel" },
      { text: t("logout"), style: "destructive", onPress: () => void onLogout?.() },
    ]);
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 18, paddingBottom: 118 + insets.bottom }]} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <Text style={[styles.title, { color: colors.text }]}>{t("profileTitle")}</Text>
          <Pressable
            style={[styles.iconButton, { backgroundColor: colors.surfaceAlt }]}
            onPress={isEditing ? saveProfile : () => setIsEditing(true)}
            disabled={saving}
          >
            <Feather name={isEditing ? "check" : "edit-2"} size={18} color={colors.primary} />
          </Pressable>
        </View>

        <LinearGradient colors={gradients.success} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.profileCard}>
          <View style={styles.profileHead}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials || "FA"}</Text>
            </View>
            <View style={styles.profileText}>
              <Text style={styles.profileName} numberOfLines={1}>{displayName}</Text>
              <Text style={styles.profileEmail} numberOfLines={1}>{email}</Text>
            </View>
            <View style={styles.healthPill}>
              <Text style={styles.healthPillText}>{healthScore}</Text>
            </View>
          </View>

          <View style={styles.statsGrid}>
            <Metric label={t("income")} value={formatMoney(income)} />
            <Metric label={t("expense")} value={formatMoney(expense)} />
            <Metric label={t("savings")} value={`${savingsRate}%`} />
          </View>
        </LinearGradient>

        <View style={[styles.syncCard, { backgroundColor: colors.surfaceAlt }]}>
          <Feather name="check-circle" size={18} color={colors.success} />
          <View style={styles.syncText}>
            <Text style={[styles.syncTitle, { color: colors.text }]}>{t("dataSynced")}</Text>
            <Text style={[styles.syncBody, { color: colors.textMuted }]}>{t("dataSyncedText")}</Text>
          </View>
        </View>

        <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.panelHeader}>
            <Text style={[styles.panelTitle, { color: colors.text }]}>{t("personalData")}</Text>
            <Text style={[styles.panelHint, { color: colors.textMuted }]}>{hasProfile ? t("savedLocally") : t("canFillLater")}</Text>
          </View>

          {isEditing ? (
            <View style={styles.form}>
              <ProfileInput label={t("name")} placeholder={t("namePlaceholder")} value={profile.displayName} onChangeText={(value) => updateField("displayName", value)} />
              <ProfileInput label={t("phone")} placeholder="+7..." value={profile.phone} onChangeText={(value) => updateField("phone", value)} keyboardType="phone-pad" />
              <ProfileInput label={t("city")} placeholder={t("cityPlaceholder")} value={profile.city} onChangeText={(value) => updateField("city", value)} />
              <View style={styles.actionRow}>
                <Pressable style={[styles.secondaryButton, { borderColor: colors.border }]} onPress={() => setIsEditing(false)}>
                  <Text style={[styles.secondaryButtonText, { color: colors.textSecondary }]}>{t("cancel")}</Text>
                </Pressable>
                <Pressable style={styles.primaryButtonWrap} onPress={saveProfile} disabled={saving}>
                  <LinearGradient colors={gradients.successDeep} style={styles.primaryButton}>
                    <Text style={styles.primaryButtonText}>{saving ? t("savingNow") : t("save")}</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.fields}>
              <ProfileField icon="phone" label={t("phone")} value={profile.phone || t("notSpecified")} />
              <ProfileField icon="map-pin" label={t("city")} value={profile.city || t("notSpecified")} />
            </View>
          )}
        </View>

        <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.panelTitle, { color: colors.text }]}>{t("financeContour")}</Text>
          <View style={styles.healthRow}>
            <ScoreRing score={healthScore} />
            <View style={styles.healthCopy}>
              <Text style={[styles.healthTitle, { color: colors.text }]}>{t("controlIndex")}</Text>
              <Text style={[styles.healthText, { color: colors.textMuted }]}>{t("controlIndexText")}</Text>
            </View>
          </View>
          <View style={styles.quickStats}>
            <SmallStat icon="list" label={t("operations")} value={String(transactions.length || summary?.transactionCount || 0)} />
            <SmallStat icon="trending-up" label={t("netFlow")} value={formatMoney(netSavings)} />
          </View>
        </View>

        <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.panelTitle, { color: colors.text }]}>{t("appShortcuts")}</Text>
          <SettingsRow icon="bell" label={t("smartNotifications")} right={<Switch value={settings.pushEnabled} onValueChange={(value) => void setSetting("pushEnabled", value)} trackColor={{ false: colors.border, true: colors.accent }} thumbColor={colors.white} />} />
          <SettingsRow icon="moon" label={t("darkTheme")} right={<Switch value={mode === "dark"} onValueChange={toggleMode} trackColor={{ false: colors.border, true: colors.primaryLight }} thumbColor={colors.white} />} />
          <SettingsRow icon="settings" label={t("openSettings")} onPress={() => navigation.navigate("Settings")} />
          <SettingsRow icon="shield" label={t("securityAudit")} onPress={() => Alert.alert("FinApp", t("securityAuditText"))} />
          <SettingsRow icon="log-out" label={t("logout")} danger onPress={confirmLogout} />
        </View>

        <Text style={[styles.version, { color: colors.textMuted }]}>{t("profileVersion")}</Text>
      </ScrollView>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue} numberOfLines={1}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function ProfileInput({ label, ...props }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.inputGroup}>
      <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{label}</Text>
      <TextInput
        {...props}
        style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.backgroundAlt }]}
        placeholderTextColor={colors.textMuted}
      />
    </View>
  );
}

function ProfileField({ icon, label, value }) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.fieldRow, { backgroundColor: colors.backgroundAlt }]}>
      <View style={[styles.fieldIcon, { backgroundColor: colors.surfaceAlt }]}>
        <Feather name={icon} size={17} color={colors.primary} />
      </View>
      <View style={styles.fieldCopy}>
        <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{label}</Text>
        <Text style={[styles.fieldValue, { color: colors.text }]} numberOfLines={2}>{value}</Text>
      </View>
    </View>
  );
}

function ScoreRing({ score }: { score: number }) {
  const { colors } = useAppTheme();
  const { t } = useAppSettings();
  return (
    <View style={[styles.scoreRing, { borderColor: colors.accent }]}>
      <Text style={[styles.scoreValue, { color: colors.primary }]}>{score}</Text>
      <Text style={[styles.scoreLabel, { color: colors.textMuted }]}>{t("points")}</Text>
    </View>
  );
}

function SmallStat({ icon, label, value }) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.smallStat, { backgroundColor: colors.backgroundAlt }]}>
      <Feather name={icon} size={17} color={colors.primary} />
      <Text style={[styles.smallStatValue, { color: colors.text }]} numberOfLines={1}>{value}</Text>
      <Text style={[styles.smallStatLabel, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

function SettingsRow({ icon, label, right, onPress, danger }) {
  const { colors } = useAppTheme();
  return (
    <Pressable style={styles.settingsRow} onPress={onPress} disabled={!onPress}>
      <View style={styles.settingsLeft}>
        <View style={[styles.settingsIcon, { backgroundColor: danger ? "#FEE2E2" : colors.surfaceAlt }]}>
          <Feather name={icon} size={17} color={danger ? colors.danger : colors.primary} />
        </View>
        <Text style={[styles.settingsLabel, { color: danger ? colors.danger : colors.text }]}>{label}</Text>
      </View>
      {right || <Feather name="chevron-right" size={20} color={colors.textMuted} />}
    </Pressable>
  );
}

function calculateTransactionTotals(items: any[]) {
  return (Array.isArray(items) ? items : []).reduce(
    (totals, item) => {
      const amount = Number(item.amount || 0);
      if (item.type === "INCOME") {
        totals.income += amount;
        totals.balance += amount;
      } else if (item.type === "EXPENSE") {
        totals.expense += amount;
        totals.balance -= amount;
      }
      return totals;
    },
    { income: 0, expense: 0, balance: 0 },
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 16 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 6 },
  title: { fontSize: 30, fontFamily: "Inter_700Bold" },
  iconButton: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  profileCard: { borderRadius: 28, padding: 22, gap: 22, shadowColor: "#6B46C1", shadowOpacity: 0.22, shadowOffset: { width: 0, height: 10 }, shadowRadius: 24, elevation: 8 },
  profileHead: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(255,255,255,0.22)", borderWidth: 1, borderColor: "rgba(255,255,255,0.42)", alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#FFFFFF", fontSize: 21, fontFamily: "Inter_700Bold" },
  profileText: { flex: 1, gap: 4 },
  profileName: { color: "#FFFFFF", fontSize: 20, fontFamily: "Inter_700Bold" },
  profileEmail: { color: "rgba(255,255,255,0.78)", fontSize: 13, fontFamily: "Inter_500Medium" },
  healthPill: { minWidth: 44, height: 34, borderRadius: 17, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center", paddingHorizontal: 10 },
  healthPillText: { color: "#FFFFFF", fontSize: 15, fontFamily: "Inter_700Bold" },
  statsGrid: { flexDirection: "row", gap: 10 },
  metric: { flex: 1, minHeight: 74, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.16)", padding: 12, justifyContent: "center", gap: 5 },
  metricValue: { color: "#FFFFFF", fontSize: 15, fontFamily: "Inter_700Bold" },
  metricLabel: { color: "rgba(255,255,255,0.74)", fontSize: 11, fontFamily: "Inter_500Medium" },
  syncCard: { borderRadius: 18, padding: 14, flexDirection: "row", gap: 10, alignItems: "center" },
  syncText: { flex: 1, gap: 2 },
  syncTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  syncBody: { fontSize: 12, lineHeight: 17, fontFamily: "Inter_500Medium" },
  panel: { borderRadius: 24, borderWidth: 1, padding: 18, gap: 16, shadowColor: "#000", shadowOpacity: 0.04, shadowOffset: { width: 0, height: 8 }, shadowRadius: 18, elevation: 2 },
  panelHeader: { gap: 3 },
  panelTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  panelHint: { fontSize: 12, fontFamily: "Inter_500Medium" },
  form: { gap: 12 },
  inputGroup: { gap: 7 },
  inputLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  input: { minHeight: 48, borderRadius: 16, borderWidth: 1, paddingHorizontal: 14, fontSize: 15, fontFamily: "Inter_500Medium" },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 2 },
  secondaryButton: { flex: 1, minHeight: 50, borderRadius: 18, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  secondaryButtonText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  primaryButtonWrap: { flex: 1 },
  primaryButton: { minHeight: 50, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  primaryButtonText: { color: "#FFFFFF", fontSize: 14, fontFamily: "Inter_700Bold" },
  fields: { gap: 10 },
  fieldRow: { minHeight: 62, borderRadius: 18, padding: 12, flexDirection: "row", alignItems: "center", gap: 12 },
  fieldIcon: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  fieldCopy: { flex: 1, gap: 2 },
  fieldLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  fieldValue: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  healthRow: { flexDirection: "row", gap: 15, alignItems: "center" },
  scoreRing: { width: 96, height: 96, borderRadius: 48, borderWidth: 9, alignItems: "center", justifyContent: "center" },
  scoreValue: { fontSize: 24, fontFamily: "Inter_700Bold" },
  scoreLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  healthCopy: { flex: 1, gap: 5 },
  healthTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  healthText: { fontSize: 13, lineHeight: 19, fontFamily: "Inter_500Medium" },
  quickStats: { flexDirection: "row", gap: 10 },
  smallStat: { flex: 1, minHeight: 82, borderRadius: 18, padding: 12, justifyContent: "space-between" },
  smallStatValue: { fontSize: 15, fontFamily: "Inter_700Bold" },
  smallStatLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  settingsRow: { minHeight: 54, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  settingsLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  settingsIcon: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  settingsLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  version: { textAlign: "center", fontSize: 12, fontFamily: "Inter_500Medium", marginTop: 2 },
});
