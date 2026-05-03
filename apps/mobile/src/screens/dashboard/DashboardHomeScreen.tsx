// @ts-nocheck
import React from 'react';
import { useMemo, useState } from "react";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from "react-native-svg";
import { DashboardStackParamList } from "@app/navigation/types";
import { Screen } from "@shared/ui/Screen";
import { SectionCard } from "@shared/ui/SectionCard";
import { useAppTheme } from "@shared/theme/ThemeProvider";
import { useUser } from "@shared/contexts/UserContext";
import { radius, spacing } from "@shared/theme/spacing";
import { MaterialIcons } from "@expo/vector-icons";

// Заглушки будут заменены реальными данными с API
const categories = [];
const recentTransactions = [];

export function DashboardHomeScreen({ navigation }: Props) {
  const { colors, gradients, isDark } = useAppTheme();
  const { user } = useUser();
  const [activeCategory, setActiveCategory] = useState(null);
  const isPositiveBalance = true;
  const balanceColor = isPositiveBalance ? colors.success : colors.danger;

  const spentTotal = useMemo(() => categories.reduce((sum, item) => sum + item.percent, 0), []);

  return (
    <Screen>
      <LinearGradient colors={gradients.success} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
        <Text style={styles.balanceLabel}>
          {user ? `Добро пожаловать, ${user.full_name || user.email}!` : "Добро пожаловать!"}
        </Text>
        <Text style={[styles.balanceValue, { color: balanceColor }]}>{`47 820 \u20BD`}</Text>
      </LinearGradient>

      <SectionCard
        title={"\u0421\u0442\u0440\u0443\u043A\u0442\u0443\u0440\u0430 \u0440\u0430\u0441\u0445\u043E\u0434\u043E\u0432"}
        subtitle={"\u041D\u0430\u0436\u043C\u0438\u0442\u0435 \u043D\u0430 \u043A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u044E, \u0447\u0442\u043E\u0431\u044B \u0443\u0432\u0438\u0434\u0435\u0442\u044C \u0434\u0435\u0442\u0430\u043B\u0438"}
      >
        {categories.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              {"\u041F\u043E\u043A\u0430 \u043D\u0435\u0442 \u0434\u0430\u043D\u043D\u044B\u0445 \u043E \u0440\u0430\u0441\u0445\u043E\u0434\u0430\u0445. \u0414\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u0442\u0440\u0430\u043D\u0437\u0430\u043A\u0446\u0438\u0438 \u043D\u0430 \u0432\u043A\u043B\u0430\u0434\u043A\u0435 \"\u0422\u0440\u0430\u043D\u0437\u0430\u043A\u0446\u0438\u0438\""}
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.chartRow}>
              <DonutChart percentage={spentTotal} />
              <View style={styles.legendWrap}>
                {categories.map((item) => (
                  <Pressable key={item.id} style={styles.legendItem} onPress={() => setActiveCategory(item)}>
                    <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                    <Text style={[styles.legendText, { color: colors.text }]}>{item.title}</Text>
                    <Text style={[styles.legendPercent, { color: colors.textMuted }]}>{item.percent}%</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {activeCategory && (
              <View style={[styles.categoryDetails, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                <Text style={[styles.categoryTitle, { color: colors.text }]}>{activeCategory.title}</Text>
                <Text style={[styles.categoryAmount, { color: colors.primaryDark }]}>{activeCategory.amount}</Text>
                <Text style={[styles.categoryHint, { color: colors.textMuted }]}>
                  {"\u0414\u043E\u043B\u044F \u043E\u0442 \u043C\u0435\u0441\u044F\u0447\u043D\u044B\u0445 \u0440\u0430\u0441\u0445\u043E\u0434\u043E\u0432:"} {activeCategory.percent}%
                </Text>
              </View>
            )}
          </>
        )}
      </SectionCard>

      <SectionCard title={"\u0411\u043B\u0438\u0436\u0430\u0439\u0448\u0430\u044F \u0446\u0435\u043B\u044C"}>
        <View style={styles.goalCard}>
          <View style={styles.goalLeft}>
            <View style={[styles.goalIcon, { backgroundColor: colors.surfaceAlt }]}> 
              <MaterialIcons name="flight-takeoff" size={22} color={colors.primaryDark} />
            </View>
            <View style={styles.goalTextWrap}>
              <Text style={[styles.goalTitle, { color: colors.text }]}>{"\u041F\u0443\u0442\u0435\u0448\u0435\u0441\u0442\u0432\u0438\u0435 \u0432 \u0422\u043E\u043A\u0438\u043E"}</Text>
              <Text style={[styles.goalHint, { color: colors.textMuted }]}>{`\u041D\u0443\u0436\u043D\u043E \u043E\u0442\u043A\u043B\u0430\u0434\u044B\u0432\u0430\u0442\u044C 18 400 \u20BD/\u043C\u0435\u0441`}</Text>
            </View>
          </View>
          <CircularProgress value={63} />
        </View>
      </SectionCard>

      <SectionCard title={"\u041F\u043E\u0441\u043B\u0435\u0434\u043D\u0438\u0435 \u0442\u0440\u0430\u043D\u0437\u0430\u043A\u0446\u0438\u0438"}>
        {recentTransactions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              {"\u0422\u0440\u0430\u043D\u0437\u0430\u043A\u0446\u0438\u0439 \u043F\u043E\u043A\u0430 \u043D\u0435\u0442. \u0414\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u043F\u0435\u0440\u0432\u0443\u044E \u0442\u0440\u0430\u043D\u0437\u0430\u043A\u0446\u0438\u044E \u043D\u0430 \u0432\u043A\u043B\u0430\u0434\u043A\u0435 \"\u0422\u0440\u0430\u043D\u0437\u0430\u043A\u0446\u0438\u0438\""}
            </Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.txRow}>
              {recentTransactions.map((item) => (
                <View key={item.id} style={[styles.txCard, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                  <View style={[styles.txIcon, { backgroundColor: colors.background }]}>
                    <MaterialIcons name={item.icon} size={18} color={colors.primaryDark} />
                  </View>
                  <Text style={[styles.txAmount, { color: item.amount.includes("+") ? colors.success : colors.text }]}>{item.amount}</Text>
                  <Text style={[styles.txTitle, { color: colors.text }]}>{item.title}</Text>
                  <Text style={[styles.txCategory, { color: colors.textMuted }]}>{item.category}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        )}
      </SectionCard>

      <SectionCard title={"\u0412\u0430\u0436\u043D\u044B\u0435 \u0441\u0438\u0433\u043D\u0430\u043B\u044B"}>
        <AlertCard title={`\u0411\u044E\u0434\u0436\u0435\u0442 \"\u0415\u0434\u0430\" \u043F\u0440\u0435\u0432\u044B\u0448\u0435\u043D \u043D\u0430 2 300 \u20BD`} tone="danger" />
        <AlertCard title={"Netflix \u043D\u0435 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u043B\u0430\u0441\u044C 29 \u0434\u043D\u0435\u0439 - \u043E\u0442\u043C\u0435\u043D\u0438\u0442\u044C?"} tone="success" />
        <AlertCard title={"\u0426\u0435\u043B\u044C \u00AB\u041F\u043E\u0434\u0443\u0448\u043A\u0430\u00BB \u0438\u0434\u0435\u0442 \u0441 \u043E\u043F\u0435\u0440\u0435\u0436\u0435\u043D\u0438\u0435\u043C +8%"} tone="success" />
        <Pressable style={styles.reportButton} onPress={() => navigation.navigate("Reports")}>
          <Text style={styles.reportButtonText}>{"\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u043F\u043E\u0434\u0440\u043E\u0431\u043D\u044B\u0435 \u043E\u0442\u0447\u0435\u0442\u044B"}</Text>
        </Pressable>
      </SectionCard>

      <View style={[styles.footerSpacer, { backgroundColor: isDark ? "transparent" : colors.backgroundAlt }]} />
    </Screen>
  );
}

function DonutChart({ percentage }: { percentage: number }) {
  const { colors, isDark } = useAppTheme();
  const size = 140;
  const stroke = 18;
  const radiusValue = (size - stroke) / 2;
  const circumference = radiusValue * Math.PI * 2;
  const progress = Math.min(percentage / 100, 1);
  const dash = circumference * progress;

  return (
    <View style={styles.donutWrap}>
      <Svg width={size} height={size}>
        <Defs>
          <SvgGradient id="greenGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#86EFAC" />
            <Stop offset="100%" stopColor="#22C55E" />
          </SvgGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={radiusValue} stroke={isDark ? "#334155" : "#DCFCE7"} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radiusValue}
          stroke="url(#greenGradient)"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${dash} ${circumference}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.donutCenter}>
        <Text style={[styles.donutValue, { color: colors.primaryDark }]}>{percentage}%</Text>
        <Text style={[styles.donutLabel, { color: colors.textSecondary }]}>{"\u0420\u0430\u0441\u0445\u043E\u0434\u044B"}</Text>
      </View>
    </View>
  );
}

function CircularProgress({ value }: { value: number }) {
  const size = 78;
  const stroke = 9;
  const radiusValue = (size - stroke) / 2;
  const circumference = radiusValue * Math.PI * 2;
  const progress = Math.min(value / 100, 1);
  const dash = circumference * progress;

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
        <Text style={styles.progressLabel}>{value}%</Text>
      </View>
    </View>
  );
}

function AlertCard({ title, tone }: { title: string; tone: "success" | "danger" }) {
  const { colors } = useAppTheme();
  const borderColor = tone === "success" ? colors.success : colors.danger;
  const icon = tone === "success" ? "check-circle-outline" : "warning-amber";

  return (
    <View style={[styles.alertCard, { borderColor }]}>
      <MaterialIcons name={icon} size={20} color={borderColor} />
      <Text style={[styles.alertText, { color: colors.text }]}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 3,
  },
  balanceLabel: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "#ECFDF5",
  },
  balanceValue: {
    fontSize: 36,
    fontFamily: "Inter_700Bold",
  },
  chartRow: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "center",
  },
  donutWrap: {
    width: 140,
    height: 140,
    justifyContent: "center",
    alignItems: "center",
  },
  donutCenter: {
    position: "absolute",
    alignItems: "center",
  },
  donutValue: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
  },
  donutLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  legendWrap: {
    flex: 1,
    gap: spacing.xs,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 2,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  legendPercent: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  categoryDetails: {
    marginTop: 2,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.sm,
    gap: 2,
  },
  categoryTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  categoryAmount: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
  },
  categoryHint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  goalCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  goalLeft: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "center",
    flex: 1,
  },
  goalIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  goalTextWrap: {
    flex: 1,
    gap: 3,
  },
  goalTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  goalHint: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
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
  progressLabel: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: "#16A34A",
  },
  txRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingRight: spacing.sm,
  },
  txCard: {
    width: 132,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.sm,
    gap: 4,
  },
  txIcon: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  txAmount: {
    marginTop: 2,
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  txTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  txCategory: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  alertCard: {
    borderWidth: 1.2,
    borderRadius: radius.md,
    padding: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  alertText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 19,
    fontFamily: "Inter_500Medium",
  },
  reportButton: {
    marginTop: 2,
    borderRadius: radius.md,
    backgroundColor: "#22C55E",
    paddingVertical: 14,
    alignItems: "center",
  },
  reportButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  footerSpacer: {
    height: 6,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
    lineHeight: 20,
  },
});
