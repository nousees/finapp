import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useAppTheme } from "@shared/theme/ThemeProvider";
import { radius, spacing } from "@shared/theme/spacing";

type ActionTileProps = {
  title: string;
  description: string;
  onPress?: () => void;
};

export function ActionTile({ title, description, onPress }: ActionTileProps) {
  const { colors } = useAppTheme();

  return (
    <Pressable style={[styles.tile, { backgroundColor: colors.background, borderColor: colors.border }]} onPress={onPress}>
      <View style={styles.row}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <MaterialIcons name="arrow-forward-ios" size={16} color={colors.primaryDark} />
      </View>
      <Text style={[styles.description, { color: colors.textMuted }]}>{description}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.xs,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  description: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
});
