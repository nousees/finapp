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
  RUB: { locale: "ru-RU", currency: "RUB" },
  USD: { locale: "en-US", currency: "USD" },
  EUR: { locale: "de-DE", currency: "EUR" },
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
    settingsTitle: "Настройки приложения",
    settingsText: "Безопасность, синхронизация и параметры интерфейса.",
    main: "Основные",
    currency: "Валюта интерфейса",
    language: "Язык интерфейса",
    darkTheme: "Темная тема",
    sync: "Уведомления и синхронизация",
    push: "Push-уведомления",
    backgroundSync: "Фоновая синхронизация",
    security: "Безопасность",
    active: "Активно",
    changePassword: "Сменить пароль",
    open: "Открыть",
    biometric: "Биометрический вход",
    audit: "Аудит операций",
    data: "Данные",
    exportData: "Экспорт данных",
    clearCache: "Очистить локальный кэш",
    chooseCurrency: "Выберите валюту",
    chooseLanguage: "Выберите язык",
    passwordTitle: "Смена пароля",
    currentPassword: "Текущий пароль",
    newPassword: "Новый пароль",
    repeatPassword: "Повторите новый пароль",
    savePassword: "Сохранить пароль",
    done: "Готово",
    passwordChanged: "Пароль изменен.",
    error: "Ошибка",
    passwordTooShort: "Новый пароль должен содержать минимум 8 символов.",
    passwordMismatch: "Подтверждение пароля не совпадает.",
    passwordFailed: "Не удалось изменить пароль.",
    cacheCleared: "Локальный кэш очищен.",
    biometricsUnavailable: "Биометрия недоступна",
    biometricsUnavailableText: "На устройстве нет настроенной биометрической проверки.",
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
    settingsTitle: "App Settings",
    settingsText: "Security, sync and interface preferences.",
    main: "General",
    currency: "Display currency",
    language: "Interface language",
    darkTheme: "Dark theme",
    sync: "Notifications and sync",
    push: "Push notifications",
    backgroundSync: "Background sync",
    security: "Security",
    active: "Active",
    changePassword: "Change password",
    open: "Open",
    biometric: "Biometric login",
    audit: "Operation audit",
    data: "Data",
    exportData: "Export data",
    clearCache: "Clear local cache",
    chooseCurrency: "Choose currency",
    chooseLanguage: "Choose language",
    passwordTitle: "Change Password",
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
      const rubAmount = Math.abs(Number(value || 0));
      const rate = Number(rates.rates[currency] || 1);
      const amount = currency === "RUB" ? rubAmount : rubAmount / rate;
      const sign = options.sign ? (Number(value || 0) >= 0 ? "+" : "-") : "";
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

  const value = useMemo(
    () => ({
      settings,
      rates,
      languageLabel: languageLabels[settings.language] || languageLabels.ru,
      setSetting,
      updateSettings,
      refreshRates,
      formatMoney,
      t,
    }),
    [formatMoney, rates, refreshRates, setSetting, settings, t, updateSettings],
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
