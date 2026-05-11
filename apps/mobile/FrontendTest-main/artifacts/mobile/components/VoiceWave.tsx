import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

const BAR_COUNT = 28;

function WaveBar({ index, isActive }: { index: number; isActive: boolean }) {
  const anim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (!isActive) {
      Animated.timing(anim, { toValue: 0.3, duration: 200, useNativeDriver: false }).start();
      return;
    }
    const delay = (index % 7) * 80;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, {
          toValue: 0.2 + Math.random() * 0.8,
          duration: 300 + Math.random() * 400,
          useNativeDriver: false,
        }),
        Animated.timing(anim, {
          toValue: 0.1 + Math.random() * 0.5,
          duration: 300 + Math.random() * 300,
          useNativeDriver: false,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [isActive, index]);

  const height = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [6, 72],
  });

  return (
    <Animated.View
      style={[
        styles.bar,
        {
          height,
          opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }),
        },
      ]}
    />
  );
}

export default function VoiceWave({ isActive }: { isActive: boolean }) {
  return (
    <View style={styles.container}>
      {Array.from({ length: BAR_COUNT }, (_, i) => (
        <WaveBar key={i} index={i} isActive={isActive} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    height: 80,
  },
  bar: {
    flex: 1,
    borderRadius: 4,
    backgroundColor: "#FFFFFF",
  },
});
