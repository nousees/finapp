import { StyleSheet, Text, View } from "react-native";
import { Screen } from "@shared/ui/Screen";
import { SectionCard } from "@shared/ui/SectionCard";
import { colors } from "@shared/theme/colors";

export function VoiceCaptureScreen() {
  return (
    <Screen>
      <SectionCard title="Голосовой ввод" subtitle="Whisper + NER, пока без бизнес-логики">
        <View style={styles.recorder}>
          <View style={styles.dot} />
          <Text style={styles.recorderText}>Нажмите, чтобы начать запись</Text>
        </View>
      </SectionCard>

      <SectionCard title="Результат распознавания">
        <Text style={styles.text}>
          "Потратил 850 рублей на такси сегодня утром"
        </Text>
      </SectionCard>

      <SectionCard title="Извлеченные сущности">
        <EntityRow label="сумма" value="850 ₽" />
        <EntityRow label="категория" value="Транспорт" />
        <EntityRow label="время" value="сегодня утром" />
      </SectionCard>
    </Screen>
  );
}

function EntityRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.entityRow}>
      <Text style={styles.entityKey}>{label}</Text>
      <Text style={styles.entityValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  recorder: {
    borderRadius: 14,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    padding: 16,
    alignItems: "center",
    gap: 8,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.danger,
  },
  recorderText: {
    color: colors.text,
    fontWeight: "600",
  },
  text: {
    color: colors.text,
    fontStyle: "italic",
  },
  entityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 8,
  },
  entityKey: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  entityValue: {
    color: colors.text,
    fontWeight: "600",
    fontSize: 13,
  },
});
