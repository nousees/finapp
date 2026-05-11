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
  const { formatMoney } = useAppSettings();
  const { user } = useUser();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<EditableProfile>(emptyProfile);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [insights, setInsights] = useState(null);
  const [transactionCount, setTransactionCount] = useState(0);
  const profileStorageKey = useMemo(() => `${PROFILE_STORAGE_KEY}:${user?.id || user?.email || "anonymous"}`, [user?.email, user?.id]);

  useEffect(() => {
    void loadProfile();
  }, [profileStorageKey]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([getFinancialInsights().catch(() => null), listTransactions().catch(() => [])]).then(([nextInsights, tx]) => {
        if (!active) return;
        setInsights(nextInsights);
        setTransactionCount(tx.length);
      });
      return () => {
        active = false;
      };
    }, []),
  );

  const displayName = profile.displayName.trim() || user?.full_name || "Пользователь FinApp";
  const email = user?.email || "email не указан";
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

  const summary = insights?.summary;
  const healthScore = Math.round(insights?.healthScore?.score ?? Math.max(35, Math.min(92, 60 + Number(summary?.savingsRate || 0))));
  const savingsRate = Math.round(summary?.savingsRate ?? 0);

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
      Alert.alert("Ошибка", "Не удалось сохранить профиль");
    } finally {
      setSaving(false);
    }
  };

  const confirmLogout = () => {
    Alert.alert("Выйти из аккаунта?", "Локальная сессия будет завершена.", [
      { text: "Отмена", style: "cancel" },
      { text: "Выйти", style: "destructive", onPress: () => void onLogout?.() },
    ]);
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 18, paddingBottom: 118 + insets.bottom }]} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <Text style={[styles.title, { color: colors.text }]}>Профиль</Text>
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
              <Text style={styles.profileName} numberOfLines={1}>
                {displayName}
              </Text>
              <Text style={styles.profileEmail} numberOfLines={1}>
                {email}
              </Text>
            </View>
            <View style={styles.healthPill}>
              <Text style={styles.healthPillText}>{healthScore}</Text>
            </View>
          </View>

          <View style={styles.statsGrid}>
            <Metric label="Доход" value={formatMoney(summary?.totalIncome)} />
            <Metric label="Расходы" value={formatMoney(summary?.totalExpenses)} />
            <Metric label="Сбережения" value={`${savingsRate}%`} />
          </View>
        </LinearGradient>

        <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.panelHeader}>
            <Text style={[styles.panelTitle, { color: colors.text }]}>Личные данные</Text>
            <Text style={[styles.panelHint, { color: colors.textMuted }]}>{hasProfile ? "Сохранено локально" : "Можно заполнить позже"}</Text>
          </View>

          {isEditing ? (
            <View style={styles.form}>
              <ProfileInput label="Имя" placeholder="Например, Даниил" value={profile.displayName} onChangeText={(value) => updateField("displayName", value)} />
              <ProfileInput label="Телефон" placeholder="+7..." value={profile.phone} onChangeText={(value) => updateField("phone", value)} keyboardType="phone-pad" />
              <ProfileInput label="Город" placeholder="Ваш город" value={profile.city} onChangeText={(value) => updateField("city", value)} />
              <View style={styles.actionRow}>
                <Pressable style={[styles.secondaryButton, { borderColor: colors.border }]} onPress={() => setIsEditing(false)}>
                  <Text style={[styles.secondaryButtonText, { color: colors.textSecondary }]}>Отмена</Text>
                </Pressable>
                <Pressable style={styles.primaryButtonWrap} onPress={saveProfile} disabled={saving}>
                  <LinearGradient colors={gradients.successDeep} style={styles.primaryButton}>
                    <Text style={styles.primaryButtonText}>{saving ? "Сохранение..." : "Сохранить"}</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.fields}>
              <ProfileField icon="phone" label="Телефон" value={profile.phone || "Не указан"} />
              <ProfileField icon="map-pin" label="Город" value={profile.city || "Не указан"} />
            </View>
          )}
        </View>

        <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.panelTitle, { color: colors.text }]}>Финансовый контур</Text>
          <View style={styles.healthRow}>
            <ScoreRing score={healthScore} />
            <View style={styles.healthCopy}>
              <Text style={[styles.healthTitle, { color: colors.text }]}>Индекс контроля</Text>
              <Text style={[styles.healthText, { color: colors.textMuted }]}>
                В расчете используются транзакции, бюджеты и цели из общего контура FinApp.
              </Text>
            </View>
          </View>
          <View style={styles.quickStats}>
            <SmallStat icon="list" label="Операций" value={String(transactionCount || summary?.transactionCount || 0)} />
            <SmallStat icon="trending-up" label="Чистый поток" value={formatMoney(summary?.netSavings)} />
          </View>
        </View>

        <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.panelTitle, { color: colors.text }]}>Настройки</Text>
          <SettingsRow icon="bell" label="Умные уведомления" right={<Switch value={notificationsEnabled} onValueChange={setNotificationsEnabled} trackColor={{ false: colors.border, true: colors.accent }} thumbColor={colors.white} />} />
          <SettingsRow icon="moon" label="Темная тема" right={<Switch value={mode === "dark"} onValueChange={toggleMode} trackColor={{ false: colors.border, true: colors.primaryLight }} thumbColor={colors.white} />} />
          <SettingsRow icon="settings" label="Параметры приложения" onPress={() => navigation.navigate("Settings")} />
          <SettingsRow icon="shield" label="Безопасность и аудит" onPress={() => Alert.alert("FinApp", "JWT-сессия, refresh tokens и аудит операций подключены на backend-контуре.")} />
          <SettingsRow icon="log-out" label="Выйти" danger onPress={confirmLogout} />
        </View>

        <Text style={[styles.version, { color: colors.textMuted }]}>FinApp 1.0 · сбор и анализ финансов</Text>
      </ScrollView>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue} numberOfLines={1}>
        {value}
      </Text>
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
        style={[styles.input, props.multiline ? styles.multilineInput : null, { color: colors.text, borderColor: colors.border, backgroundColor: colors.backgroundAlt }]}
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
        <Text style={[styles.fieldValue, { color: colors.text }]} numberOfLines={2}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function ScoreRing({ score }: { score: number }) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.scoreRing, { borderColor: colors.accent }]}>
      <Text style={[styles.scoreValue, { color: colors.primary }]}>{score}</Text>
      <Text style={[styles.scoreLabel, { color: colors.textMuted }]}>баллов</Text>
    </View>
  );
}

function SmallStat({ icon, label, value }) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.smallStat, { backgroundColor: colors.backgroundAlt }]}>
      <Feather name={icon} size={17} color={colors.primary} />
      <Text style={[styles.smallStatValue, { color: colors.text }]} numberOfLines={1}>
        {value}
      </Text>
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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    gap: 16,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 6,
  },
  title: {
    fontSize: 30,
    fontFamily: "Inter_700Bold",
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  profileCard: {
    borderRadius: 28,
    padding: 22,
    gap: 22,
    shadowColor: "#6B46C1",
    shadowOpacity: 0.22,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 24,
    elevation: 8,
  },
  profileHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.22)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.42)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 21,
    fontFamily: "Inter_700Bold",
  },
  profileText: {
    flex: 1,
    gap: 4,
  },
  profileName: {
    color: "#FFFFFF",
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  profileEmail: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  healthPill: {
    minWidth: 44,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  healthPillText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  statsGrid: {
    flexDirection: "row",
    gap: 10,
  },
  metric: {
    flex: 1,
    minHeight: 74,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.16)",
    padding: 12,
    justifyContent: "center",
    gap: 5,
  },
  metricValue: {
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  metricLabel: {
    color: "rgba(255,255,255,0.74)",
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  panel: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
    gap: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 2,
  },
  panelHeader: {
    gap: 3,
  },
  panelTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  panelHint: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  form: {
    gap: 12,
  },
  inputGroup: {
    gap: 7,
  },
  inputLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  input: {
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  multilineInput: {
    minHeight: 92,
    paddingTop: 12,
    textAlignVertical: "top",
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 2,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  primaryButtonWrap: {
    flex: 1,
  },
  primaryButton: {
    minHeight: 50,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  fields: {
    gap: 10,
  },
  fieldRow: {
    minHeight: 62,
    borderRadius: 18,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  fieldIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  fieldCopy: {
    flex: 1,
    gap: 2,
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  fieldValue: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  healthRow: {
    flexDirection: "row",
    gap: 15,
    alignItems: "center",
  },
  scoreRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreValue: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
  },
  scoreLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  healthCopy: {
    flex: 1,
    gap: 5,
  },
  healthTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  healthText: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "Inter_500Medium",
  },
  quickStats: {
    flexDirection: "row",
    gap: 10,
  },
  smallStat: {
    flex: 1,
    minHeight: 82,
    borderRadius: 18,
    padding: 12,
    justifyContent: "space-between",
  },
  smallStatValue: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  smallStatLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  settingsRow: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  settingsLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  settingsIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  settingsLabel: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  version: {
    textAlign: "center",
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginTop: 2,
  },
});
