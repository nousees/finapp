import { StyleSheet, Text, View } from "react-native";
import { Screen } from "@shared/ui/Screen";
import { SectionCard } from "@shared/ui/SectionCard";
import { colors } from "@shared/theme/colors";

export function ImportCenterScreen() {
  return (
    <Screen>
      <SectionCard title="File Upload" subtitle="CSV/Excel import flow">
        <DropArea />
        <Text style={styles.note}>Supported formats: `.csv`, `.xlsx`</Text>
      </SectionCard>

      <SectionCard title="Import Preview">
        <Row label="Detected records" value="128" />
        <Row label="Valid records" value="124" />
        <Row label="Warnings" value="4 (amount format)" />
      </SectionCard>

      <SectionCard title="Import History">
        <HistoryItem name="sber_jan.csv" status="COMPLETED" meta="124 / 128 records" />
        <HistoryItem name="tbank_feb.xlsx" status="FAILED" meta="date column not found" failed />
      </SectionCard>
    </Screen>
  );
}

function DropArea() {
  return (
    <View style={styles.dropArea}>
      <Text style={styles.dropTitle}>Tap to choose file</Text>
      <Text style={styles.dropSub}>Upload control is stubbed for now.</Text>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function HistoryItem({
  name,
  status,
  meta,
  failed = false,
}: {
  name: string;
  status: string;
  meta: string;
  failed?: boolean;
}) {
  return (
    <View style={styles.historyItem}>
      <View>
        <Text style={styles.historyName}>{name}</Text>
        <Text style={styles.historyMeta}>{meta}</Text>
      </View>
      <Text style={[styles.status, failed ? styles.statusFailed : styles.statusOk]}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  dropArea: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.primary,
    borderRadius: 14,
    backgroundColor: "#ECFDF5",
    padding: 20,
    gap: 4,
    alignItems: "center",
  },
  dropTitle: {
    fontWeight: "700",
    color: colors.primary,
  },
  dropSub: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  note: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  rowLabel: {
    color: colors.textSecondary,
  },
  rowValue: {
    color: colors.text,
    fontWeight: "600",
  },
  historyItem: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  historyName: {
    color: colors.text,
    fontWeight: "600",
  },
  historyMeta: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  status: {
    fontWeight: "700",
    fontSize: 12,
  },
  statusOk: {
    color: colors.success,
  },
  statusFailed: {
    color: colors.danger,
  },
});
