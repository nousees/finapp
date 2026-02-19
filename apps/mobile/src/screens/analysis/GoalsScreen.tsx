import { StyleSheet, Text, View } from "react-native";
import { Screen } from "@shared/ui/Screen";
import { SectionCard } from "@shared/ui/SectionCard";
import { goals } from "@shared/mocks/fixtures";
import { colors } from "@shared/theme/colors";

export function GoalsScreen() {
  return (
    <Screen>
      <SectionCard title="Financial Goals">
        {goals.map((goal) => (
          <View style={styles.goal} key={goal.id}>
            <Text style={styles.title}>{goal.title}</Text>
            <Text style={styles.meta}>Current: {goal.current}</Text>
            <Text style={styles.meta}>Target: {goal.target}</Text>
            <Text style={styles.deadline}>Deadline: {goal.deadline}</Text>
          </View>
        ))}
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  goal: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
    padding: 12,
    gap: 2,
  },
  title: {
    color: colors.text,
    fontWeight: "700",
  },
  meta: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  deadline: {
    color: colors.accent,
    marginTop: 4,
    fontWeight: "600",
    fontSize: 12,
  },
});
