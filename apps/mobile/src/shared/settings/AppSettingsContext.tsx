// @ts-nocheck
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export const SETTINGS_KEY = "app_settings";
const RATES_KEY = "currency_rates";
const CBR_DAILY_JSON_URL = "https://www.cbr-xml-daily.ru/daily_json.js";

export const defaultAppSettings = {
  currency: "RUB",
  language: "ru",
  pushEnabled: true,
  backgroundSync: true,
  pullToRefresh: true,
  biometricEnabled: false,
  auditEnabled: true,
};

const defaultRates = {
  base: "RUB",
  updatedAt: null,
  rates: {
    RUB: 1,
    USD: 90,
    EUR: 100,
  },
};

const currencyMeta = {
  RUB: { locale: "ru-RU", currency: "RUB", symbol: "₽" },
  USD: { locale: "en-US", currency: "USD", symbol: "$" },
  EUR: { locale: "de-DE", currency: "EUR", symbol: "€" },
};

export const languageLabels = {
  ru: "Русский",
  en: "English",
};

const dictionary = {
  ru: {
    home: "Главная",
    transactions: "Транзакции",
    budgets: "Бюджеты",
    goals: "Цели",
    profile: "Профиль",
    addTransaction: "Добавить транзакцию",
    inputMode: "Выберите способ ввода данных в FinApp",
    voice: "Голос",
    voiceDesc: "Сказать транзакцию",
    manual: "Вручную",
    manualDesc: "Ввести сумму и описание",
    file: "Файл",
    fileDesc: "CSV или Excel",

    goodMorning: "Доброе утро",
    totalBalance: "Общий баланс",
    income: "Доходы",
    expense: "Расходы",
    savings: "Сбережения",
    quickAccess: "Быстрый доступ",
    analytics: "Аналитика",
    subscriptions: "Подписки",
    reports: "Отчёты",
    thisMonth: "За этот месяц",
    details: "Подробнее",
    latest: "Последние",
    all: "Все",
    tips: "Советы",
    noTransactionsStructure: "Добавьте транзакции, чтобы увидеть структуру расходов.",
    noTransactionsYet: "Нажмите на центральную кнопку, чтобы добавить первую транзакцию.",
    noRecommendations: "Рекомендаций пока нет",
    noRecommendationsText: "Сформируйте рекомендации после добавления транзакций, бюджетов и целей.",
    transaction: "Транзакция",
    subscription: "Подписка",

    profileTitle: "Профиль",
    profileFallbackName: "Пользователь FinApp",
    emailMissing: "email не указан",
    personalData: "Личные данные",
    savedLocally: "Сохранено локально",
    canFillLater: "Можно заполнить позже",
    name: "Имя",
    namePlaceholder: "Например, Даниил",
    phone: "Телефон",
    city: "Город",
    cityPlaceholder: "Ваш город",
    cancel: "Отмена",
    save: "Сохранить",
    savingNow: "Сохранение...",
    notSpecified: "Не указан",
    financeContour: "Финансовый контур",
    controlIndex: "Индекс контроля",
    controlIndexText: "Расчёт синхронизирован с главной страницей: доходы, расходы, цели и операции берутся из общего контура FinApp.",
    points: "баллов",
    operations: "Операций",
    netFlow: "Чистый поток",
    appShortcuts: "Действия",
    openSettings: "Параметры приложения",
    securityAudit: "Безопасность и аудит",
    smartNotifications: "Умные уведомления",
    darkTheme: "Тёмная тема",
    logout: "Выйти",
    logoutTitle: "Выйти из аккаунта?",
    logoutText: "Локальная сессия будет завершена.",
    profileSaveError: "Не удалось сохранить профиль",
    securityAuditText: "JWT-сессия, refresh tokens и аудит операций подключены на backend-контуре.",
    profileVersion: "FinApp 1.0 · сбор и анализ финансов",
    dataSynced: "Данные синхронизированы",
    dataSyncedText: "Профиль использует те же транзакции и цели, что главная страница.",

    settingsTitle: "Настройки приложения",
    settingsText: "Безопасность, синхронизация и параметры интерфейса.",
    main: "Основные",
    currency: "Валюта интерфейса",
    language: "Язык интерфейса",
    sync: "Уведомления и синхронизация",
    push: "Push-уведомления",
    backgroundSync: "Фоновая синхронизация",
    pullToRefresh: "Pull-to-Refresh",
    security: "Безопасность",
    active: "Активно",
    changePassword: "Сменить пароль",
    open: "Открыть",
    biometric: "Биометрический вход",
    audit: "Аудит операций",
    data: "Данные",
    exportData: "Открыть отчёты",
    clearCache: "Очистить локальный кэш",
    chooseCurrency: "Выберите валюту",
    chooseLanguage: "Выберите язык",
    updateRates: "Обновить курсы",
    passwordTitle: "Смена пароля",
    currentPassword: "Текущий пароль",
    newPassword: "Новый пароль",
    repeatPassword: "Повторите новый пароль",
    savePassword: "Сохранить пароль",
    done: "Готово",
    passwordChanged: "Пароль изменён.",
    error: "Ошибка",
    passwordTooShort: "Новый пароль должен содержать минимум 8 символов.",
    passwordMismatch: "Подтверждение пароля не совпадает.",
    passwordFailed: "Не удалось изменить пароль.",
    cacheCleared: "Локальный кэш очищен.",
    biometricsUnavailable: "Биометрия недоступна",
    biometricsUnavailableText: "На устройстве нет настроенной биометрической проверки.",
    settingsUsefulText: "Настройки применяются к интерфейсу, валюте, уведомлениям и способам синхронизации.",
  },
  en: {
    home: "Home",
    transactions: "Transactions",
    budgets: "Budgets",
    goals: "Goals",
    profile: "Profile",
    addTransaction: "Add transaction",
    inputMode: "Choose how to add data to FinApp",
    voice: "Voice",
    voiceDesc: "Say a transaction",
    manual: "Manual",
    manualDesc: "Enter amount and description",
    file: "File",
    fileDesc: "CSV or Excel",

    goodMorning: "Good morning",
    totalBalance: "Total balance",
    income: "Income",
    expense: "Expenses",
    savings: "Savings",
    quickAccess: "Quick access",
    analytics: "Analytics",
    subscriptions: "Subscriptions",
    reports: "Reports",
    thisMonth: "This month",
    details: "Details",
    latest: "Latest",
    all: "All",
    tips: "Tips",
    noTransactionsStructure: "Add transactions to see your spending structure.",
    noTransactionsYet: "Tap the center button to add your first transaction.",
    noRecommendations: "No recommendations yet",
    noRecommendationsText: "Generate recommendations after adding transactions, budgets and goals.",
    transaction: "Transaction",
    subscription: "Subscription",

    profileTitle: "Profile",
    profileFallbackName: "FinApp User",
    emailMissing: "email not specified",
    personalData: "Personal data",
    savedLocally: "Saved locally",
    canFillLater: "Can be filled later",
    name: "Name",
    namePlaceholder: "For example, Daniel",
    phone: "Phone",
    city: "City",
    cityPlaceholder: "Your city",
    cancel: "Cancel",
    save: "Save",
    savingNow: "Saving...",
    notSpecified: "Not specified",
    financeContour: "Financial contour",
    controlIndex: "Control index",
    controlIndexText: "This profile is synced with the dashboard: income, expenses, goals and operations come from the shared FinApp data flow.",
    points: "points",
    operations: "Operations",
    netFlow: "Net flow",
    appShortcuts: "Actions",
    openSettings: "App settings",
    securityAudit: "Security and audit",
    smartNotifications: "Smart notifications",
    darkTheme: "Dark theme",
    logout: "Log out",
    logoutTitle: "Log out?",
    logoutText: "The local session will be closed.",
    profileSaveError: "Could not save profile",
    securityAuditText: "JWT session, refresh tokens and operation audit are connected in the backend layer.",
    profileVersion: "FinApp 1.0 · finance collection and analysis",
    dataSynced: "Data is synced",
    dataSyncedText: "Profile uses the same transactions and goals as the dashboard.",

    settingsTitle: "App settings",
    settingsText: "Security, sync and interface preferences.",
    main: "General",
    currency: "Display currency",
    language: "Interface language",
    sync: "Notifications and sync",
    push: "Push notifications",
    backgroundSync: "Background sync",
    pullToRefresh: "Pull-to-Refresh",
    security: "Security",
    active: "Active",
    changePassword: "Change password",
    open: "Open",
    biometric: "Biometric login",
    audit: "Operation audit",
    data: "Data",
    exportData: "Open reports",
    clearCache: "Clear local cache",
    chooseCurrency: "Choose currency",
    chooseLanguage: "Choose language",
    updateRates: "Update rates",
    passwordTitle: "Change password",
    currentPassword: "Current password",
    newPassword: "New password",
    repeatPassword: "Repeat new password",
    savePassword: "Save password",
    done: "Done",
    passwordChanged: "Password changed.",
    error: "Error",
    passwordTooShort: "New password must contain at least 8 characters.",
    passwordMismatch: "Password confirmation does not match.",
    passwordFailed: "Could not change password.",
    cacheCleared: "Local cache cleared.",
    biometricsUnavailable: "Biometrics unavailable",
    biometricsUnavailableText: "No biometric authentication is configured on this device.",
    settingsUsefulText: "Settings affect interface language, currency, notifications and sync behavior.",
  },
};

const AppSettingsContext = createContext({
  settings: defaultAppSettings,
  rates: defaultRates,
  languageLabel: languageLabels.ru,
  setSetting: async () => {},
  updateSettings: async () => {},
  refreshRates: async () => {},
  formatMoney: (value: number, options?: Record<string, unknown>) => `${Number(value || 0)} ₽`,
  formatExchangeHint: () => "",
  t: (key: string) => key,
});

export function AppSettingsProvider({ children }) {
  const [settings, setSettings] = useState(defaultAppSettings);
  const [rates, setRates] = useState(defaultRates);

  useEffect(() => {
    AsyncStorage.multiGet([SETTINGS_KEY, RATES_KEY])
      .then((entries) => {
        const savedSettings = entries.find(([key]) => key === SETTINGS_KEY)?.[1];
        const savedRates = entries.find(([key]) => key === RATES_KEY)?.[1];
        if (savedSettings) setSettings(normalizeSettings(JSON.parse(savedSettings)));
        if (savedRates) setRates(normalizeRates(JSON.parse(savedRates)));
      })
      .catch((error) => console.error("Settings load error:", error));
  }, []);

  useEffect(() => {
    void refreshRates();
  }, []);

  const persist = useCallback(async (next) => {
    const normalized = normalizeSettings(next);
    setSettings(normalized);
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(normalized));
  }, []);

  const setSetting = useCallback((key, value) => persist({ ...settings, [key]: value }), [persist, settings]);
  const updateSettings = useCallback((patch) => persist({ ...settings, ...patch }), [persist, settings]);

  const refreshRates = useCallback(async () => {
    try {
      const response = await fetch(CBR_DAILY_JSON_URL);
      const payload = await response.json();
      const nextRates = normalizeRates({
        updatedAt: payload?.Date || new Date().toISOString(),
        rates: {
          RUB: 1,
          USD: Number(payload?.Valute?.USD?.Value || defaultRates.rates.USD),
          EUR: Number(payload?.Valute?.EUR?.Value || defaultRates.rates.EUR),
        },
      });
      setRates(nextRates);
      await AsyncStorage.setItem(RATES_KEY, JSON.stringify(nextRates));
    } catch (error) {
      console.log("Currency rates refresh failed, using cached rates:", error);
    }
  }, []);

  const t = useCallback((key) => dictionary[settings.language]?.[key] || dictionary.ru[key] || key, [settings.language]);

  const formatMoney = useCallback(
    (value, options = {}) => {
      const currency = currencyMeta[settings.currency] ? settings.currency : "RUB";
      const meta = currencyMeta[currency];
      const raw = Number(value || 0);
      const rubAmount = Math.abs(raw);
      const rate = Number(rates.rates[currency] || 1);
      const amount = currency === "RUB" ? rubAmount : rubAmount / rate;
      const sign = options.sign ? (raw >= 0 ? "+" : "-") : "";
      const formatter = new Intl.NumberFormat(meta.locale, {
        style: "currency",
        currency: meta.currency,
        minimumFractionDigits: options.cents ? 2 : 0,
        maximumFractionDigits: options.cents ? 2 : 0,
      });
      return `${sign}${formatter.format(amount)}`;
    },
    [rates.rates, settings.currency],
  );

  const formatExchangeHint = useCallback(() => {
    const currency = currencyMeta[settings.currency] ? settings.currency : "RUB";
    if (currency === "RUB") return "";
    const rate = Number(rates.rates[currency] || 0);
    if (!rate) return "";
    const date = rates.updatedAt ? new Date(rates.updatedAt) : null;
    const dateText = date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString(settings.language === "en" ? "en-US" : "ru-RU") : "";
    return `1 ${currency} ≈ ${Math.round(rate * 100) / 100} ₽${dateText ? ` · ${dateText}` : ""}`;
  }, [rates.rates, rates.updatedAt, settings.currency, settings.language]);

  const value = useMemo(
    () => ({
      settings,
      rates,
      languageLabel: languageLabels[settings.language] || languageLabels.ru,
      setSetting,
      updateSettings,
      refreshRates,
      formatMoney,
      formatExchangeHint,
      t,
    }),
    [formatExchangeHint, formatMoney, rates, refreshRates, setSetting, settings, t, updateSettings],
  );

  return <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>;
}

export function useAppSettings() {
  return useContext(AppSettingsContext);
}

function normalizeSettings(value) {
  const language = value?.language === "English" ? "en" : value?.language === "Русский" ? "ru" : value?.language;
  return {
    ...defaultAppSettings,
    ...value,
    currency: currencyMeta[value?.currency] ? value.currency : "RUB",
    language: language === "en" ? "en" : "ru",
  };
}

function normalizeRates(value) {
  return {
    ...defaultRates,
    ...value,
    rates: {
      ...defaultRates.rates,
      ...(value?.rates || {}),
      RUB: 1,
    },
  };
}
