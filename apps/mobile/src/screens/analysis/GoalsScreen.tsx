import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle } from "react-native-svg";
import { MaterialIcons } from "@expo/vector-icons";
import { Screen } from "@shared/ui/Screen";
import { SectionCard } from "@shared/ui/SectionCard";
import { useAppTheme } from "@shared/theme/ThemeProvider";
import { radius, spacing } from "@shared/theme/spacing";

const goals = [
  {
    id: "1",
    title: "Подушка безопасности",
    current: "184 000 ₽",
    target: "300 000 ₽",
    percent: 61,
    icon: "shield",
    monthly: "Нужно откладывать 18 400 ₽/мес",
  },
  {
    id: "2",
    title: "Путешествие в Италию",
    current: "128 000 ₽",
    target: "220 000 ₽",
    percent: 58,
    icon: "flight",
    monthly: "Нужно откладывать 15 300 ₽/мес",
  },
  {
    id: "3",
    title: "Новый MacBook",
    current: "74 000 ₽",
    target: "190 000 ₽",
    percent: 39,
    icon: "laptop-mac",
    monthly: "Нужно откладывать 23 200 ₽/мес",
  },
];

export function GoalsScreen() {
  const { colors, gradients } = useAppTheme();

  return (
    <Screen>
      <SectionCard title="Финансовые цели" subtitle="Ваши накопления и темп достижения">
        {goals.map((goal) => (
          <View key={goal.id} style={[styles.goalCard, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}>
            <View style={styles.headRow}>
              <View style={styles.iconAndTitle}>
                <LinearGradient colors={gradients.success} style={styles.goalIcon}>
                  <MaterialIcons name={goal.icon as keyof typeof MaterialIcons.glyphMap} size={20} color="#FFFFFF" />
                </LinearGradient>
                <View style={styles.titleWrap}>
                  <Text style={[styles.goalTitle, { color: colors.text }]}>{goal.title}</Text>
                  <Text style={[styles.goalNumbers, { color: colors.textMuted }]}>
                    {goal.current} из {goal.target}
                  </Text>
                </View>
              </View>
              <GoalProgress value={goal.percent} />
            </View>
            <Text style={[styles.monthly, { color: colors.primaryDark }]}>{goal.monthly}</Text>
          </View>
        ))}
      </SectionCard>
    </Screen>
  );
}

function GoalProgress({ value }: { value: number }) {
  const size = 78;
  const stroke = 9;
  const radiusValue = (size - stroke) / 2;
  const circumference = radiusValue * Math.PI * 2;
  const dash = circumference * (value / 100);

  return (
    <View style={styles.progressWrap}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={radiusValue} stroke="#DCFCE7" strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radiusValue}
          stroke="#22C55E"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${dash} ${circumference}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.progressCenter}>
        <Text style={styles.progressText}>{value}%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  goalCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  headRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
  },
  iconAndTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
  },
  goalIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  titleWrap: {
    flex: 1,
    gap: 2,
  },
  goalTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  goalNumbers: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  monthly: {
    fontSize: 19,
    lineHeight: 25,
    fontFamily: "Inter_700Bold",
  },
  progressWrap: {
    width: 78,
    height: 78,
    justifyContent: "center",
    alignItems: "center",
  },
  progressCenter: {
    position: "absolute",
  },
  progressText: {
    color: "#16A34A",
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
});
