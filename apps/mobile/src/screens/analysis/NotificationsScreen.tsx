import { StyleSheet, Text, View } from "react-native";
import { Screen } from "@shared/ui/Screen";
import { SectionCard } from "@shared/ui/SectionCard";
import { notifications } from "@shared/mocks/fixtures";
import { colors } from "@shared/theme/colors";

export function NotificationsScreen() {
  return (
    <Screen>
      <SectionCard title="Notification Feed" subtitle="Overspend alerts and reminders">
        {notifications.map((item) => (
          <View key={item.id} style={styles.item}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.body}>{item.text}</Text>
            <Text style={styles.time}>{item.time}</Text>
          </View>
        ))}
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  item: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    gap: 2,
    backgroundColor: colors.surface,
  },
  title: {
    color: colors.text,
    fontWeight: "700",
  },
  body: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  time: {
    color: colors.accent,
    fontSize: 11,
    marginTop: 4,
  },
});
