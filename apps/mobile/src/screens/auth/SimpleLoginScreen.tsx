// @ts-nocheck
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Modal,
  Text,
  TextInput,
  View,
} from "react-native";
import { apiConfig } from "../../shared/api/config";

const { width: screenWidth } = Dimensions.get("window");

const slides = [
  {
    icon: "mic",
    title: "Голос - это сила",
    text: "Скажите: «кофе 350 рублей», и FinApp подготовит транзакцию через ML-обработку.",
    gradient: ["#3D1A8A", "#6B46C1", "#8B5CF6"],
  },
  {
    icon: "pie-chart",
    title: "Полный контроль",
    text: "Дашборд, бюджеты, цели и рекомендации показывают, куда уходят деньги.",
    gradient: ["#1A3A5C", "#2563EB", "#7ED9B6"],
  },
  {
    icon: "shield",
    title: "Ваши данные защищены",
    text: "JWT-сессия, refresh tokens и аудит операций работают вместе с backend FinApp.",
    gradient: ["#6B46C1", "#8B5CF6", "#7ED9B6"],
  },
];

export const SimpleLoginScreen = ({ onLogin }) => {
  const scrollRef = useRef<ScrollView>(null);
  const [slideIndex, setSlideIndex] = useState(0);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState("");
  const [isPolicyAccepted, setIsPolicyAccepted] = useState(false);
  const [isPolicyModalVisible, setIsPolicyModalVisible] = useState(false);
  const onboardingDone = slideIndex === slides.length - 1;

  const getErrorMessage = (data, fallback) => {
    if (data?.error) {
      if (data.error.includes("Email")) return "Введите корректный email, например name@example.com";
      if (data.error.includes("Password")) return "Пароль должен содержать минимум 8 символов";
      if (data.error.includes("FullName")) return "Имя должно содержать минимум 2 символа";
      return data.error;
    }
    return data?.message || fallback;
  };

  const persistSession = async (data) => {
    await AsyncStorage.setItem("access_token", data.access_token);
    await AsyncStorage.setItem("refresh_token", data.refresh_token);
    await AsyncStorage.setItem("user_data", JSON.stringify(data.user));

    if (!isLogin && data.user) {
      await AsyncStorage.setItem(
        `profile_details:${data.user.id || data.user.email}`,
        JSON.stringify({
          displayName: fullName.trim(),
          phone: phone.trim(),
          city: city.trim(),
        }),
      );
    }

    onLogin();
  };


  const handleEmailVerification = async () => {
    if (!pendingVerificationEmail || verificationCode.trim().length !== 6) {
      Alert.alert("Ошибка", "Введите 6-значный код из письма");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${apiConfig.authBaseUrl}/api/v1/auth/verify-email-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pendingVerificationEmail, code: verificationCode.trim(), password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        Alert.alert("Ошибка", getErrorMessage(data, "Неверный код подтверждения"));
        return;
      }

      await persistSession(data);
    } catch (error) {
      Alert.alert("Ошибка", "Проблема с подключением к серверу");
      console.error("Email verification error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!email || !password || (!isLogin && (!fullName || !confirmPassword))) {
      Alert.alert("Ошибка", "Заполните обязательные поля");
      return;
    }
    if (!email.includes("@")) {
      Alert.alert("Ошибка", "Введите email в формате name@example.com");
      return;
    }
    if (password.length < 8) {
      Alert.alert("Ошибка", "Пароль должен содержать минимум 8 символов");
      return;
    }
    if (!isLogin && password !== confirmPassword) {
      Alert.alert("Ошибка", "Пароли не совпадают");
      return;
    }
    if (!isLogin && !isPolicyAccepted) {
      Alert.alert("Ошибка", "Подтвердите согласие с политикой конфиденциальности");
      return;
    }

    setIsLoading(true);
    const path = isLogin ? "/api/v1/auth/signin" : "/api/v1/auth/signup";
    const body = isLogin
      ? { email: email.trim(), password }
      : { email: email.trim(), password, full_name: fullName.trim(), phone: phone.trim() || undefined };

    try {
      const response = await fetch(`${apiConfig.authBaseUrl}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        Alert.alert("Ошибка", getErrorMessage(data, isLogin ? "Неверные данные для входа" : "Ошибка регистрации"));
        return;
      }

      if (!isLogin && data?.requires_email_verification) {
        setPendingVerificationEmail(email.trim());
        Alert.alert("Подтвердите почту", "Мы отправили 6-значный код на вашу почту");
        return;
      }

      await persistSession(data);
    } catch (error) {
      Alert.alert("Ошибка", "Проблема с подключением к серверу");
      console.error("Auth error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSlide = (event) => {
    setSlideIndex(Math.round(event.nativeEvent.contentOffset.x / screenWidth));
  };

  const goNext = () => {
    scrollRef.current?.scrollTo({ x: Math.min(slideIndex + 1, slides.length - 1) * screenWidth, animated: true });
  };

  return (
    <LinearGradient colors={slides[slideIndex].gradient} style={styles.container}>
      <View style={styles.pattern} pointerEvents="none">
        {Array.from({ length: 12 }).map((_, index) => (
          <View key={index} style={[styles.hex, { left: ((index * 83) % screenWidth) - 20, top: (index * 67) % 520, opacity: 0.06 + (index % 3) * 0.02 }]} />
        ))}
      </View>

      <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={styles.pageContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleSlide}
            style={styles.slides}
          >
            {slides.map((slide) => (
              <View key={slide.title} style={[styles.slide, { width: screenWidth }]}>
                <View style={styles.iconRing}>
                  <LinearGradient colors={["rgba(255,255,255,0.25)", "rgba(255,255,255,0.1)"]} style={styles.iconCircle}>
                    <Feather name={slide.icon} size={46} color="#FFFFFF" />
                  </LinearGradient>
                </View>
                <Text style={styles.slideTitle}>{slide.title}</Text>
                <Text style={styles.slideText}>{slide.text}</Text>
              </View>
            ))}
          </ScrollView>

          <View style={styles.dots}>
            {slides.map((_, index) => (
              <Pressable key={index} onPress={() => scrollRef.current?.scrollTo({ x: index * screenWidth, animated: true })}>
                <View style={[styles.dot, index === slideIndex ? styles.dotActive : null]} />
              </Pressable>
            ))}
          </View>

          {!onboardingDone ? (
            <Pressable onPress={goNext} style={styles.nextWrap}>
              <LinearGradient colors={["#A8E6CF", "#7ED9B6"]} style={styles.nextButton}>
                <Text style={styles.nextText}>Дальше</Text>
                <Feather name="arrow-right" size={18} color="#1A1A2E" />
              </LinearGradient>
            </Pressable>
          ) : (
            <View style={styles.authCard}>
              <View style={styles.logoRow}>
                <LinearGradient colors={["#A8E6CF", "#7ED9B6"]} style={styles.logoIcon}>
                  <Feather name="zap" size={18} color="#1A1A2E" />
                </LinearGradient>
                <View>
                  <Text style={styles.logoText}>FinApp</Text>
                  <Text style={styles.logoSub}>от хаоса к финансовой свободе</Text>
                </View>
              </View>

              <View style={styles.segment}>
                <Pressable onPress={() => { setIsLogin(true); setConfirmPassword(""); setVerificationCode(""); setPendingVerificationEmail(""); setIsPolicyAccepted(false); }} style={[styles.segmentItem, isLogin ? styles.segmentActive : null]}>
                  <Text style={[styles.segmentText, isLogin ? styles.segmentTextActive : null]}>Войти</Text>
                </Pressable>
                <Pressable onPress={() => { setIsLogin(false); setConfirmPassword(""); setVerificationCode(""); setPendingVerificationEmail(""); setIsPolicyAccepted(false); }} style={[styles.segmentItem, !isLogin ? styles.segmentActive : null]}>
                  <Text style={[styles.segmentText, !isLogin ? styles.segmentTextActive : null]}>Регистрация</Text>
                </Pressable>
              </View>

              {!isLogin ? (
                <>
                  <AuthInput icon="user" placeholder="Полное имя" value={fullName} onChangeText={setFullName} autoCapitalize="words" />
                  <AuthInput icon="phone" placeholder="Телефон" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
                  <AuthInput icon="map-pin" placeholder="Город" value={city} onChangeText={setCity} autoCapitalize="words" />
                </>
              ) : null}
              <AuthInput icon="mail" placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
              <AuthInput icon="lock" placeholder="Пароль минимум 8 символов" value={password} onChangeText={setPassword} secureTextEntry />
              {!isLogin ? <AuthInput icon="lock" placeholder="Повторите пароль" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry /> : null}
              {!isLogin && pendingVerificationEmail ? <AuthInput icon="hash" placeholder="Код из письма (6 цифр)" value={verificationCode} onChangeText={setVerificationCode} keyboardType="number-pad" maxLength={6} /> : null}

              {!isLogin ? (
                <View style={styles.policyRow}>
                  <Pressable onPress={() => setIsPolicyAccepted((prev) => !prev)} style={[styles.checkbox, isPolicyAccepted ? styles.checkboxChecked : null]}>
                    {isPolicyAccepted ? <Feather name="check" size={13} color="#FFFFFF" /> : null}
                  </Pressable>
                  <Text style={styles.policyText}>
                    Я принимаю
                    <Text style={styles.policyLink} onPress={() => setIsPolicyModalVisible(true)}> политику конфиденциальности</Text>
                  </Text>
                </View>
              ) : null}

              <Pressable onPress={!isLogin && pendingVerificationEmail ? handleEmailVerification : handleSubmit} disabled={isLoading}>
                <LinearGradient colors={["#6B46C1", "#8B5CF6", "#7ED9B6"]} style={[styles.submit, isLoading ? { opacity: 0.72 } : null]}>
                  {isLoading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitText}>{!isLogin && pendingVerificationEmail ? "Подтвердить почту" : isLogin ? "Войти" : "Создать аккаунт"}</Text>}
                </LinearGradient>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      <Modal visible={isPolicyModalVisible} animationType="slide" transparent onRequestClose={() => setIsPolicyModalVisible(false)}>
        <View style={styles.policyModalBackdrop}>
          <View style={styles.policyModalCard}>
            <Text style={styles.policyModalTitle}>Политика конфиденциальности</Text>
            <ScrollView style={styles.policyModalScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.policyModalText}>{`1. Какие данные мы собираем
• Email и пароль для регистрации и входа.
• Профильные данные: имя, при желании телефон и город.
• Технические данные безопасности: токены сессий, служебные логи авторизации и подтверждения почты.

2. Для чего мы используем данные
• Создание и защита аккаунта пользователя.
• Подтверждение владения email через одноразовый код.
• Обеспечение работы функций приложения и поддержки пользователей.

3. Передача данных третьим сторонам
• Мы не продаем персональные данные.
• Для отправки кода подтверждения может использоваться инфраструктура Supabase Auth и связанный email-провайдер.

4. Хранение и защита
• Используются механизмы авторизации и сессионной защиты (access/refresh token).
• Доступ к данным ограничивается служебной необходимостью.

5. Права пользователя
• Вы можете запросить исправление или удаление данных через поддержку проекта.

6. Изменения политики
• Мы можем обновлять документ; актуальная версия доступна в приложении и репозитории.`}</Text>
            </ScrollView>
            <Pressable onPress={() => setIsPolicyModalVisible(false)}>
              <LinearGradient colors={["#6B46C1", "#8B5CF6", "#7ED9B6"]} style={styles.policyModalButton}>
                <Text style={styles.policyModalButtonText}>Понятно</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </Modal>

    </LinearGradient>
  );
};

function AuthInput({ icon, ...props }) {
  return (
    <View style={styles.inputWrap}>
      <Feather name={icon} size={17} color="#6B46C1" />
      <TextInput {...props} placeholderTextColor="#6B7280" style={styles.input} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboard: { flex: 1 },
  pageContent: { flexGrow: 1, justifyContent: "flex-end", paddingBottom: 20 },
  pattern: { ...StyleSheet.absoluteFillObject },
  hex: { position: "absolute", width: 40, height: 46, borderWidth: 1.5, borderColor: "#FFFFFF", borderRadius: 4, transform: [{ rotate: "30deg" }] },
  slides: { maxHeight: 430, minHeight: 340 },
  slide: { paddingHorizontal: 34, alignItems: "center", justifyContent: "center", gap: 18 },
  iconRing: { width: 138, height: 138, borderRadius: 69, borderWidth: 1, borderColor: "rgba(255,255,255,0.22)", alignItems: "center", justifyContent: "center" },
  iconCircle: { width: 108, height: 108, borderRadius: 54, alignItems: "center", justifyContent: "center" },
  slideTitle: { color: "#FFFFFF", fontSize: 28, lineHeight: 35, textAlign: "center", fontFamily: "Inter_700Bold" },
  slideText: { color: "rgba(255,255,255,0.78)", fontSize: 15, lineHeight: 23, textAlign: "center", fontFamily: "Inter_400Regular" },
  dots: { flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: 14 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.32)" },
  dotActive: { width: 24, backgroundColor: "#FFFFFF" },
  nextWrap: { marginHorizontal: 20, marginTop: 8 },
  nextButton: { minHeight: 54, borderRadius: 18, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  nextText: { color: "#1A1A2E", fontSize: 16, fontFamily: "Inter_700Bold" },
  authCard: { margin: 20, borderRadius: 24, padding: 18, gap: 12, backgroundColor: "rgba(255,255,255,0.96)" },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 },
  logoIcon: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  logoText: { color: "#1A1A2E", fontSize: 22, fontFamily: "Inter_700Bold" },
  logoSub: { color: "#6B7280", fontSize: 12, fontFamily: "Inter_400Regular" },
  segment: { flexDirection: "row", borderRadius: 14, padding: 4, backgroundColor: "#F3F4F6" },
  segmentItem: { flex: 1, minHeight: 40, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  segmentActive: { backgroundColor: "#FFFFFF" },
  segmentText: { color: "#6B7280", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  segmentTextActive: { color: "#6B46C1" },
  inputWrap: { minHeight: 48, borderRadius: 14, backgroundColor: "#F3F4F6", paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 10 },
  input: { flex: 1, color: "#1A1A2E", fontSize: 15, fontFamily: "Inter_400Regular", paddingVertical: 0 },
  policyRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 2 },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: "#9CA3AF", alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF" },
  checkboxChecked: { backgroundColor: "#6B46C1", borderColor: "#6B46C1" },
  policyText: { flex: 1, color: "#4B5563", fontSize: 12, fontFamily: "Inter_400Regular" },
  policyLink: { color: "#6B46C1", fontFamily: "Inter_600SemiBold", textDecorationLine: "underline" },
  policyModalBackdrop: { flex: 1, backgroundColor: "rgba(17,24,39,0.55)", justifyContent: "flex-end" },
  policyModalCard: { maxHeight: "78%", backgroundColor: "#FFFFFF", borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 20, gap: 12 },
  policyModalTitle: { color: "#1A1A2E", fontSize: 18, fontFamily: "Inter_700Bold" },
  policyModalScroll: { maxHeight: 360 },
  policyModalText: { color: "#374151", fontSize: 14, lineHeight: 21, fontFamily: "Inter_400Regular" },
  policyModalButton: { minHeight: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  policyModalButtonText: { color: "#FFFFFF", fontSize: 15, fontFamily: "Inter_700Bold" },
  submit: { minHeight: 52, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  submitText: { color: "#FFFFFF", fontSize: 16, fontFamily: "Inter_700Bold" },
});
