import { PropsWithChildren } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@shared/theme/colors";
import { spacing } from "@shared/theme/spacing";

type ScreenProps = PropsWithChildren<{
  scroll?: boolean;
}>;

export function Screen({ children, scroll = true }: ScreenProps) {
  const content = <View style={styles.content}>{children}</View>;

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.glowTop} />
      <View style={styles.glowRight} />
      {scroll ? <ScrollView>{content}</ScrollView> : content}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  glowTop: {
    position: "absolute",
    width: 220,
    height: 220,
    top: -100,
    left: -60,
    borderRadius: 120,
    backgroundColor: colors.backgroundGreen,
  },
  glowRight: {
    position: "absolute",
    width: 180,
    height: 180,
    top: 40,
    right: -80,
    borderRadius: 100,
    backgroundColor: "#ECFDF5",
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
  },
});
