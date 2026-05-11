// @ts-nocheck
import React from 'react';
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useAppTheme } from "@shared/theme/ThemeProvider";
import { spacing } from "@shared/theme/spacing";

export function Screen({ children, scroll = true, withGradient = true }: ScreenProps) {
  const { colors, gradients, isDark } = useAppTheme();
  const content = <View style={[styles.content, !scroll ? styles.contentStatic : undefined]}>{children}</View>;
  const screenGradient = isDark ? gradients.darkScreen : gradients.lightScreen;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={["top", "bottom"]}>
      {withGradient ? (
        <LinearGradient colors={screenGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      ) : null}
      {scroll ? (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 92,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  contentStatic: {
    flex: 1,
  },
});
