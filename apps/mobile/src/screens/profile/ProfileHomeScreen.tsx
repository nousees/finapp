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
      <SectionCard title="Account">
        <View style={styles.row}>
          <View style={styles.avatar} />
          <View>
            <Text style={styles.name}>Danil FinUser</Text>
            <Text style={styles.email}>test@finapp.local</Text>
          </View>
        </View>
      </SectionCard>

      <SectionCard title="Preferences">
        <ActionTile
          title="Settings"
          description="Language, currency, notifications and security stubs."
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
    backgroundColor: "#BFDBFE",
  },
  name: {
    color: colors.text,
    fontWeight: "700",
  },
  email: {
    color: colors.textSecondary,
    fontSize: 12,
  },
});
