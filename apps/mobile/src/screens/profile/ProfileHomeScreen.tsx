import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialIcons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { ProfileStackParamList } from "@app/navigation/types";
import { useUser } from "@shared/contexts/UserContext";
import { useAppTheme } from "@shared/theme/ThemeProvider";
import { radius, spacing } from "@shared/theme/spacing";
import { Screen } from "@shared/ui/Screen";
import { SectionCard } from "@shared/ui/SectionCard";

type Props = NativeStackScreenProps<ProfileStackParamList, "ProfileHome">;

type EditableProfile = {
  displayName: string;
  phone: string;
  city: string;
  notes: string;
};

const PROFILE_STORAGE_KEY = "profile_details";
const emptyProfile: EditableProfile = {
  displayName: "",
  phone: "",
  city: "",
  notes: "",
};

export function ProfileHomeScreen({ navigation }: Props) {
  const { colors } = useAppTheme();
  const { user } = useUser();
  const [profile, setProfile] = useState<EditableProfile>(emptyProfile);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void loadProfile();
  }, []);

  const hasProfile = useMemo(
    () => Object.values(profile).some((value) => value.trim().length > 0),
    [profile],
  );

  const initials = useMemo(() => {
    const source = profile.displayName.trim() || user?.full_name || user?.email || "";
    return source.trim().slice(0, 2).toUpperCase() || "?";
  }, [profile.displayName, user?.email, user?.full_name]);

  const loadProfile = async () => {
    try {
      const savedProfile = await AsyncStorage.getItem(PROFILE_STORAGE_KEY);
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
        notes: profile.notes.trim(),
      };
      await AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(normalizedProfile));
      setProfile(normalizedProfile);
      setIsEditing(false);
    } catch (error) {
      console.error("Profile save error:", error);
      Alert.alert("Ошибка", "Не удалось сохранить профиль");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <SectionCard
        title="Профиль"
        subtitle={hasProfile ? "Ваши данные без демо-заглушек" : "Заполните профиль, чтобы здесь появились ваши данные"}
      >
        {isEditing ? (
          <>
            <ProfileHeader initials={initials} label="Аккаунт" value={user?.email || "Email не найден"} />
            <ProfileInput
              label="Имя в профиле"
              placeholder="Например, Даниил"
              value={profile.displayName}
              onChangeText={(value) => updateField("displayName", value)}
            />
            <ProfileInput
              label="Телефон"
              placeholder="+7..."
              value={profile.phone}
              onChangeText={(value) => updateField("phone", value)}
              keyboardType="phone-pad"
            />
            <ProfileInput
              label="Город"
              placeholder="Ваш город"
              value={profile.city}
              onChangeText={(value) => updateField("city", value)}
            />
            <ProfileInput
              label="Заметка"
              placeholder="Любая информация для себя"
              value={profile.notes}
              onChangeText={(value) => updateField("notes", value)}
              multiline
            />
            <View style={styles.buttonRow}>
              <Pressable style={[styles.secondaryButton, { borderColor: colors.borderStrong }]} onPress={() => setIsEditing(false)}>
                <Text style={[styles.secondaryButtonText, { color: colors.primaryDark }]}>Отмена</Text>
              </Pressable>
              <Pressable style={[styles.saveButton, { backgroundColor: colors.primaryDark }]} onPress={saveProfile} disabled={saving}>
                <Text style={styles.saveButtonText}>{saving ? "Сохранение..." : "Сохранить"}</Text>
              </Pressable>
            </View>
          </>
        ) : hasProfile ? (
          <>
            <ProfileHeader
              initials={initials}
              label={profile.displayName || "Профиль"}
              value={user?.email || "Email не найден"}
            />
            <ProfileField icon="phone" label="Телефон" value={profile.phone} />
            <ProfileField icon="location-city" label="Город" value={profile.city} />
            <ProfileField icon="notes" label="Заметка" value={profile.notes} />
            <Pressable style={[styles.saveButton, { backgroundColor: colors.primaryDark }]} onPress={() => setIsEditing(true)}>
              <Text style={styles.saveButtonText}>Редактировать профиль</Text>
            </Pressable>
          </>
        ) : (
          <View style={styles.emptyState}>
            <ProfileHeader initials="?" label="Профиль пока пустой" value={user?.email || "Email не найден"} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              Здесь больше нет фейковых банков и премиум-данных. Добавьте только то, что хотите видеть в профиле.
            </Text>
            <Pressable style={[styles.saveButton, { backgroundColor: colors.primaryDark }]} onPress={() => setIsEditing(true)}>
              <Text style={styles.saveButtonText}>Заполнить профиль</Text>
            </Pressable>
          </View>
        )}
      </SectionCard>

      <SectionCard title="Настройки">
        <Pressable style={styles.settingsRow} onPress={() => navigation.navigate("Settings")}>
          <View style={styles.settingsLeft}>
            <MaterialIcons name="settings" size={20} color={colors.primaryDark} />
            <Text style={[styles.settingsText, { color: colors.text }]}>Открыть настройки приложения</Text>
          </View>
          <MaterialIcons name="chevron-right" size={22} color={colors.textMuted} />
        </Pressable>
      </SectionCard>
    </Screen>
  );
}

function ProfileHeader({ initials, label, value }: { initials: string; label: string; value: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.profileRow}>
      <View style={[styles.avatar, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
        <Text style={[styles.avatarText, { color: colors.textMuted }]}>{initials}</Text>
      </View>
      <View style={styles.nameWrap}>
        <Text style={[styles.accountLabel, { color: colors.textMuted }]}>{label}</Text>
        <Text style={[styles.accountText, { color: colors.text }]}>{value}</Text>
      </View>
    </View>
  );
}

function ProfileField({ icon, label, value }: { icon: keyof typeof MaterialIcons.glyphMap; label: string; value: string }) {
  const { colors } = useAppTheme();
  if (!value) {
    return null;
  }

  return (
    <View style={[styles.fieldRow, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}>
      <MaterialIcons name={icon} size={18} color={colors.primaryDark} />
      <View style={styles.fieldTextWrap}>
        <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{label}</Text>
        <Text style={[styles.fieldValue, { color: colors.text }]}>{value}</Text>
      </View>
    </View>
  );
}

function ProfileInput({
  label,
  ...props
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: "default" | "phone-pad";
  multiline?: boolean;
}) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.inputGroup}>
      <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{label}</Text>
      <TextInput
        {...props}
        style={[
          styles.input,
          props.multiline ? styles.multilineInput : undefined,
          { color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceAlt },
        ]}
        placeholderTextColor={colors.textMuted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  nameWrap: {
    flex: 1,
    gap: 2,
  },
  accountLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  accountText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  emptyState: {
    gap: spacing.md,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Inter_500Medium",
  },
  fieldRow: {
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.sm,
  },
  fieldTextWrap: {
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
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  input: {
    minHeight: 46,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  multilineInput: {
    minHeight: 90,
    paddingTop: 12,
    textAlignVertical: "top",
  },
  buttonRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  saveButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  settingsRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  settingsLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  settingsText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
});
