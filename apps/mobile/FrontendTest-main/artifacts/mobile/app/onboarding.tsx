import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: W, height: H } = Dimensions.get("window");

const SLIDES = [
  {
    icon: "mic" as const,
    gradient: ["#3D1A8A", "#6B46C1", "#8B5CF6"] as const,
    title: "Голос — это сила",
    desc: "Просто скажите: «Кофе 350 рублей» — и транзакция добавлена. Никакой лишней возни.",
    accent: "#A8E6CF",
  },
  {
    icon: "pie-chart" as const,
    gradient: ["#1A3A5C", "#2563EB", "#7ED9B6"] as const,
    title: "Полный контроль",
    desc: "Понятные графики и диаграммы покажут, куда уходят деньги. Вы всегда в курсе.",
    accent: "#A8E6CF",
  },
  {
    icon: "target" as const,
    gradient: ["#1A4A2E", "#059669", "#A8E6CF"] as const,
    title: "Ставьте цели",
    desc: "Отпуск, MacBook или резервный фонд — отслеживайте прогресс и достигайте целей.",
    accent: "#FFFFFF",
  },
  {
    icon: "shield" as const,
    gradient: ["#4A1A5C", "#7C3AED", "#C4B5FD"] as const,
    title: "Ваши данные защищены",
    desc: "Банковский уровень шифрования. Ваши финансы — только ваши.",
    accent: "#A8E6CF",
  },
  {
    icon: "trending-up" as const,
    gradient: ["#6B46C1", "#8B5CF6", "#7ED9B6"] as const,
    title: "Путь к свободе",
    desc: "Твой путь от хаоса в расходах к финансовой свободе начинается здесь.",
    accent: "#FFFFFF",
    isLast: true,
  },
];

async function markOnboardingDone() {
  try {
    await AsyncStorage.setItem("onboarding_done", "1");
  } catch {}
}

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const topPt = Platform.OS === "web" ? 67 : insets.top;
  const pb = Platform.OS === "web" ? 34 : insets.bottom;

  const goTo = (index: number) => {
    Haptics.selectionAsync();
    scrollRef.current?.scrollTo({ x: index * W, animated: true });
    setCurrentIndex(index);
  };

  const handleScroll = (e: any) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / W);
    setCurrentIndex(idx);
  };

  const proceed = async () => {
    await markOnboardingDone();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.replace("/(tabs)");
  };

  const slide = SLIDES[currentIndex];

  return (
    <LinearGradient
      colors={[...slide.gradient]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={[styles.container, { paddingTop: topPt }]}
    >
      <View style={styles.hexBg} pointerEvents="none">
        {[...Array(12)].map((_, i) => (
          <View
            key={i}
            style={[styles.hex, {
              left: ((i * 83) % W) - 20,
              top: ((i * 67) % (H * 0.7)) - 20,
              opacity: 0.06 + (i % 3) * 0.02,
            }]}
          />
        ))}
      </View>

      <View style={styles.skipRow}>
        <TouchableOpacity onPress={proceed} style={styles.skipBtn}>
          <Text style={styles.skipText}>Пропустить</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        style={styles.slides}
      >
        {SLIDES.map((s, i) => (
          <View key={i} style={[styles.slide, { width: W }]}>
            <View style={[styles.iconRing, { borderColor: "rgba(255,255,255,0.2)" }]}>
              <LinearGradient
                colors={["rgba(255,255,255,0.25)", "rgba(255,255,255,0.1)"]}
                style={styles.iconCircle}
              >
                <Feather name={s.icon} size={52} color="#FFFFFF" />
              </LinearGradient>
            </View>

            {i === 4 && (
              <View style={styles.logoRow}>
                <LinearGradient colors={["#A8E6CF", "#7ED9B6"]} style={styles.logoIcon}>
                  <Feather name="zap" size={18} color="#1A1A2E" />
                </LinearGradient>
                <Text style={styles.logoText}>FinApp</Text>
              </View>
            )}

            <Text style={[styles.slideTitle, { color: "#FFFFFF" }]}>{s.title}</Text>
            <Text style={[styles.slideDesc, { color: "rgba(255,255,255,0.78)" }]}>{s.desc}</Text>

            {s.isLast && (
              <View style={styles.authButtons}>
                <TouchableOpacity onPress={proceed} activeOpacity={0.85}>
                  <LinearGradient
                    colors={["#A8E6CF", "#7ED9B6"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.primaryBtn}
                  >
                    <Text style={styles.primaryBtnText}>Создать аккаунт</Text>
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={proceed}
                  style={[styles.secondaryBtn]}
                  activeOpacity={0.8}
                >
                  <Text style={styles.secondaryBtnText}>Войти</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={proceed} activeOpacity={0.7}>
                  <Text style={styles.guestText}>Продолжить без регистрации</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: pb + 20 }]}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <TouchableOpacity key={i} onPress={() => goTo(i)}>
              <View
                style={[
                  styles.dot,
                  currentIndex === i
                    ? styles.dotActive
                    : { backgroundColor: "rgba(255,255,255,0.3)" },
                ]}
              />
            </TouchableOpacity>
          ))}
        </View>

        {currentIndex < SLIDES.length - 1 && (
          <TouchableOpacity
            onPress={() => goTo(currentIndex + 1)}
            style={styles.nextBtn}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={["rgba(255,255,255,0.25)", "rgba(255,255,255,0.15)"]}
              style={styles.nextBtnInner}
            >
              <Feather name="arrow-right" size={22} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hexBg: { position: "absolute", inset: 0 },
  hex: {
    position: "absolute",
    width: 40,
    height: 46,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
    borderRadius: 4,
    transform: [{ rotate: "30deg" }],
  },
  skipRow: {
    alignItems: "flex-end",
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  skipBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 20,
  },
  skipText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  slides: { flex: 1 },
  slide: {
    paddingHorizontal: 32,
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
  },
  iconRing: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  iconCircle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    alignItems: "center",
    justifyContent: "center",
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  logoIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    color: "#FFFFFF",
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  slideTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    lineHeight: 36,
    letterSpacing: -0.5,
  },
  slideDesc: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 26,
  },
  authButtons: {
    width: "100%",
    gap: 12,
    marginTop: 8,
  },
  primaryBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryBtnText: {
    color: "#1A1A2E",
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  secondaryBtn: {
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  secondaryBtnText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
  },
  guestText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    textDecorationLine: "underline",
    marginTop: 4,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingTop: 16,
    position: "relative",
  },
  dots: {
    flexDirection: "row",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 24,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FFFFFF",
  },
  nextBtn: {
    position: "absolute",
    right: 32,
  },
  nextBtnInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
});
