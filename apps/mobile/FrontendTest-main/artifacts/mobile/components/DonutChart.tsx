import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle, G } from "react-native-svg";

interface Slice {
  category: string;
  amount: number;
  color: string;
}

interface Props {
  data: Slice[];
  size?: number;
  innerRadius?: number;
  centerLabel?: string;
  centerSub?: string;
}

export default function DonutChart({
  data,
  size = 160,
  innerRadius = 55,
  centerLabel,
  centerSub,
}: Props) {
  const radius = size / 2;
  const strokeWidth = radius - innerRadius;
  const circumference = 2 * Math.PI * innerRadius;
  const total = data.reduce((s, d) => s + d.amount, 0);

  if (total === 0) return null;

  let cumOffset = 0;

  const slices = data.map((d) => {
    const pct = d.amount / total;
    const dash = pct * circumference;
    const gap = circumference - dash;
    const rotation = (cumOffset / total) * 360 - 90;
    cumOffset += d.amount;
    return { ...d, dash, gap, rotation };
  });

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <G rotation={0} origin={`${radius},${radius}`}>
          {slices.map((s, i) => (
            <Circle
              key={i}
              cx={radius}
              cy={radius}
              r={innerRadius}
              fill="none"
              stroke={s.color}
              strokeWidth={strokeWidth - 2}
              strokeDasharray={`${s.dash} ${s.gap}`}
              strokeLinecap="round"
              rotation={s.rotation}
              origin={`${radius},${radius}`}
            />
          ))}
        </G>
      </Svg>
      {centerLabel && (
        <View style={styles.center}>
          <Text style={styles.centerLabel}>{centerLabel}</Text>
          {centerSub && <Text style={styles.centerSub}>{centerSub}</Text>}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    position: "absolute",
    alignItems: "center",
  },
  centerLabel: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },
  centerSub: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.7)",
  },
});
