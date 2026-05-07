import { StyleSheet, Text, View } from "react-native";
import { Screen } from "@shared/ui/Screen";
import { SectionCard } from "@shared/ui/SectionCard";
import { colors } from "@shared/theme/colors";

export function SettingsScreen() {
  return (
    <Screen>
      <SectionCard title="Настройки приложения">
        <SettingRow name="Валюта по умолчанию" value="RUB" />
        <SettingRow name="Язык" value="Русский" />
        <SettingRow name="Push-уведомления" value="Включены" />
        <SettingRow name="Биометрический вход" value="Выключен" />
      </SectionCard>
    </Screen>
  );
}

function SettingRow({ name, value }: { name: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.name}>{name}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 10,
  },
  name: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  value: {
    color: colors.text,
    fontWeight: "600",
    fontSize: 13,
  },
});
