import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Feather } from "@expo/vector-icons";
import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "@shared/theme/ThemeProvider";

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  minimumDate?: Date;
  maximumDate?: Date;
  helper?: string;
};

export function DatePickerField({ label, value, onChange, minimumDate, maximumDate, helper }: Props) {
  const { colors } = useAppTheme();
  const [visible, setVisible] = useState(false);
  const selectedDate = parseDate(value) || clampDate(new Date(), minimumDate, maximumDate);

  const handleChange = (_event: DateTimePickerEvent, nextDate?: Date) => {
    if (Platform.OS !== "ios") {
      setVisible(false);
    }
    if (!nextDate) return;
    onChange(formatISODate(clampDate(nextDate, minimumDate, maximumDate)));
  };

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
      <Pressable style={[styles.button, { backgroundColor: colors.surfaceAlt }]} onPress={() => setVisible((current) => !current)}>
        <Feather name="calendar" size={17} color={colors.primary} />
        <Text style={[styles.value, { color: colors.text }]}>{formatHumanDate(selectedDate)}</Text>
        <Feather name={visible ? "chevron-up" : "chevron-down"} size={17} color={colors.textMuted} />
      </Pressable>
      {helper ? <Text style={[styles.helper, { color: colors.textMuted }]}>{helper}</Text> : null}
      {visible ? (
        <View style={Platform.OS === "ios" ? [styles.iosPicker, { backgroundColor: colors.surfaceAlt }] : undefined}>
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display={Platform.OS === "ios" ? "inline" : "default"}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            onChange={handleChange}
          />
          {Platform.OS === "ios" ? (
            <Pressable onPress={() => setVisible(false)} style={[styles.doneButton, { backgroundColor: colors.primary }]}>
              <Text style={styles.doneText}>Готово</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export function formatISODate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function tomorrow(): Date {
  const date = startOfDay(new Date());
  date.setDate(date.getDate() + 1);
  return date;
}

export function today(): Date {
  return startOfDay(new Date());
}

function parseDate(value?: string): Date | null {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function clampDate(value: Date, minimumDate?: Date, maximumDate?: Date): Date {
  const date = startOfDay(value);
  if (minimumDate && date < startOfDay(minimumDate)) return startOfDay(minimumDate);
  if (maximumDate && date > startOfDay(maximumDate)) return startOfDay(maximumDate);
  return date;
}

function startOfDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function formatHumanDate(value: Date): string {
  return value.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

const styles = StyleSheet.create({
  wrap: { gap: 6, marginBottom: 16 },
  label: { fontSize: 13, fontFamily: "Inter_500Medium" },
  button: { minHeight: 48, borderRadius: 12, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 10 },
  value: { flex: 1, fontSize: 15, fontFamily: "Inter_600SemiBold" },
  helper: { fontSize: 12, lineHeight: 17, fontFamily: "Inter_400Regular" },
  iosPicker: { borderRadius: 16, padding: 8, overflow: "hidden" },
  doneButton: { minHeight: 42, borderRadius: 12, alignItems: "center", justifyContent: "center", marginTop: 8 },
  doneText: { color: "#FFFFFF", fontSize: 14, fontFamily: "Inter_700Bold" },
});
