import { ReactNode, useState } from "react";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import { ProfileStackParamList } from "@app/navigation/types";
import { Screen } from "@shared/ui/Screen";
import { SectionCard } from "@shared/ui/SectionCard";
import { useAppTheme } from "@shared/theme/ThemeProvider";
import { radius, spacing } from "@shared/theme/spacing";

type Props = NativeStackScreenProps<ProfileStackParamList, "ProfileHome">;

const banks = [
  { id: "1", name: "Сбер", last4: "8841" },
  { id: "2", name: "Т-Банк", last4: "1033" },
  { id: "3", name: "Альфа-Банк", last4: "5520" },
];

export function ProfileHomeScreen({ navigation }: Props) {
  const { colors, gradients, mode, toggleMode } = useAppTheme();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [currency, setCurrency] = useState<"RUB" | "USD">("RUB");

  return (
    <Screen>
      <SectionCard title="Профиль">
        <View style={styles.profileRow}>
          <LinearGradient colors={["#86EFAC", "#22C55E"]} style={styles.avatar}>
            <Text style={styles.avatarText}>DF</Text>
          </LinearGradient>
          <View style={styles.nameWrap}>
            <Text style={[styles.name, { color: colors.text }]}>Danil FinUser</Text>
            <Text style={[styles.subName, { color: colors.textMuted }]}>Прокачиваю финансовую дисциплину 218 дней</Text>
          </View>
        </View>

        <View style={styles.badgeRow}>
          <View style={[styles.premiumBadge, { backgroundColor: colors.gold }]}>
            <Text style={styles.premiumText}>Premium</Text>
          </View>
          <Pressable onPress={() => navigation.navigate("Settings")}>
            <Text style={[styles.settingsLink, { color: colors.primaryDark }]}>Настройки</Text>
          </Pressable>
        </View>
      </SectionCard>

      <SectionCard title="Подключенные банки">
        {banks.map((bank) => (
          <View key={bank.id} style={[styles.bankCard, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}>
            <View style={styles.bankLeft}>
              <View style={[styles.bankIcon, { backgroundColor: colors.surface }]}>
                <MaterialIcons name="account-balance" size={20} color={colors.primaryDark} />
              </View>
              <Text style={[styles.bankName, { color: colors.text }]}>{bank.name}</Text>
            </View>
            <Text style={[styles.bankMask, { color: colors.textMuted }]}>•••• {bank.last4}</Text>
          </View>
        ))}
      </SectionCard>

      <SectionCard title="Предпочтения">
        <SettingRow
          label="Темная тема"
          valueComponent={<Switch value={mode === "dark"} onValueChange={toggleMode} thumbColor={colors.white} trackColor={{ false: "#CBD5E1", true: "#22C55E" }} />}
        />
        <SettingRow
          label="Уведомления"
          valueComponent={
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              thumbColor={colors.white}
              trackColor={{ false: "#CBD5E1", true: "#22C55E" }}
            />
          }
        />
        <View style={styles.currencyRow}>
          <Text style={[styles.settingLabel, { color: colors.text }]}>Валюта</Text>
          <View style={styles.currencyActions}>
            <Pressable
              style={[styles.currencyButton, currency === "RUB" ? styles.currencyButtonActive : undefined]}
              onPress={() => setCurrency("RUB")}
            >
              <Text style={[styles.currencyText, currency === "RUB" ? styles.currencyTextActive : undefined]}>RUB</Text>
            </Pressable>
            <Pressable
              style={[styles.currencyButton, currency === "USD" ? styles.currencyButtonActive : undefined]}
              onPress={() => setCurrency("USD")}
            >
              <Text style={[styles.currencyText, currency === "USD" ? styles.currencyTextActive : undefined]}>USD</Text>
            </Pressable>
          </View>
        </View>
      </SectionCard>

      <Pressable>
        <LinearGradient colors={gradients.success} style={styles.premiumButton}>
          <MaterialIcons name="workspace-premium" size={20} color="#FFFFFF" />
          <Text style={styles.premiumButtonText}>Перейти на Premium</Text>
        </LinearGradient>
      </Pressable>
    </Screen>
  );
}

function SettingRow({ label, valueComponent }: { label: string; valueComponent: ReactNode }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.settingRow}>
      <Text style={[styles.settingLabel, { color: colors.text }]}>{label}</Text>
      {valueComponent}
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
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  nameWrap: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  subName: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
  },
  badgeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  premiumBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  premiumText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  settingsLink: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  bankCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.sm,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bankLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  bankIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  bankName: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  bankMask: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  settingLabel: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  currencyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  currencyActions: {
    flexDirection: "row",
    gap: 8,
  },
  currencyButton: {
    height: 34,
    minWidth: 58,
    borderRadius: 12,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  currencyButtonActive: {
    backgroundColor: "#22C55E",
  },
  currencyText: {
    color: "#334155",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  currencyTextActive: {
    color: "#FFFFFF",
  },
  premiumButton: {
    height: 56,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  premiumButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
});
