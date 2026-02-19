import { StyleSheet, Text, View } from "react-native";
import { Screen } from "@shared/ui/Screen";
import { SectionCard } from "@shared/ui/SectionCard";
import { colors } from "@shared/theme/colors";

export function VoiceCaptureScreen() {
  return (
    <Screen>
      <SectionCard title="Voice Intake" subtitle="Whisper + NER flow UI placeholder">
        <View style={styles.recorder}>
          <View style={styles.dot} />
          <Text style={styles.recorderText}>Tap to start recording</Text>
        </View>
      </SectionCard>

      <SectionCard title="Transcription Preview">
        <Text style={styles.text}>
          "Potratil 850 rublei na taksi segodnya utrom"
        </Text>
      </SectionCard>

      <SectionCard title="Extracted Entities">
        <EntityRow label="amount" value="850 RUB" />
        <EntityRow label="category" value="Transport" />
        <EntityRow label="datetime" value="today morning" />
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
