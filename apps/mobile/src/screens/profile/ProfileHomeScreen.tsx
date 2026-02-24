import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ProfileStackParamList } from "@app/navigation/types";
import { ActionTile } from "@shared/ui/ActionTile";
import { Screen } from "@shared/ui/Screen";
import { SectionCard } from "@shared/ui/SectionCard";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "@shared/theme/colors";

type Props = NativeStackScreenProps<ProfileStackParamList, "ProfileHome">;

export function ProfileHomeScreen({ navigation }: Props) {
  return (
    <Screen>
      <SectionCard title="Аккаунт">
        <View style={styles.row}>
          <View style={styles.avatar} />
          <View>
            <Text style={styles.name}>Danil FinUser</Text>
            <Text style={styles.email}>test@finapp.local</Text>
          </View>
        </View>
        <View style={styles.premium}>
          <Text style={styles.premiumText}>Premium</Text>
        </View>
        <View style={styles.button}>
          <Text style={styles.buttonText}>Перейти на Premium</Text>
        </View>
      </SectionCard>

      <SectionCard title="Параметры">
        <ActionTile
          title="Настройки"
          description="Язык, валюта, уведомления и безопасность."
          onPress={() => navigation.navigate("Settings")}
        />
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#BBF7D0",
  },
  name: {
    color: colors.text,
    fontWeight: "700",
  },
  email: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  premium: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: colors.warning,
  },
  premiumText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 12,
  },
  button: {
    borderRadius: 12,
    backgroundColor: colors.primaryDark,
    paddingVertical: 12,
    alignItems: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
});
