import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "@shared/theme/colors";
import { spacing } from "@shared/theme/spacing";

type ActionTileProps = {
  title: string;
  description: string;
  onPress?: () => void;
};

export function ActionTile({ title, description, onPress }: ActionTileProps) {
  return (
    <Pressable style={styles.tile} onPress={onPress}>
      <View style={styles.row}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.arrow}>{"->"}</Text>
      </View>
      <Text style={styles.description}>{description}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  arrow: {
    fontSize: 15,
    color: colors.accent,
    fontWeight: "700",
  },
  description: {
    color: colors.textSecondary,
    fontSize: 13,
  },
});
