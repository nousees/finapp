// @ts-nocheck
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export const SETTINGS_KEY = "app_settings";

export const defaultAppSettings = {
  currency: "RUB",
  language: "ru",
  pushEnabled: true,
  backgroundSync: true,
  pullToRefresh: true,
  biometricEnabled: false,
  auditEnabled: true,
};

const currencyMeta = {
  RUB: { locale: "ru-RU", currency: "RUB", rate: 1 },
  USD: { locale: "en-US", currency: "USD", rate: 90 },
  EUR: { locale: "de-DE", currency: "EUR", rate: 100 },
};

const languageLabels = {
  ru: "Русский",
  en: "English",
};

const AppSettingsContext = createContext({
  settings: defaultAppSettings,
  languageLabel: languageLabels.ru,
  setSetting: async () => {},
  updateSettings: async () => {},
  formatMoney: (value: number, options?: Record<string, unknown>) => `${Number(value || 0)} ₽`,
});

export function AppSettingsProvider({ children }) {
  const [settings, setSettings] = useState(defaultAppSettings);

  useEffect(() => {
    AsyncStorage.getItem(SETTINGS_KEY)
      .then((saved) => {
        if (!saved) return;
        const parsed = JSON.parse(saved);
        setSettings(normalizeSettings(parsed));
      })
      .catch((error) => console.error("Settings load error:", error));
  }, []);

  const persist = useCallback(async (next) => {
    const normalized = normalizeSettings(next);
    setSettings(normalized);
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(normalized));
  }, []);

  const setSetting = useCallback((key, value) => persist({ ...settings, [key]: value }), [persist, settings]);
  const updateSettings = useCallback((patch) => persist({ ...settings, ...patch }), [persist, settings]);

  const formatMoney = useCallback(
    (value, options = {}) => {
      const meta = currencyMeta[settings.currency] || currencyMeta.RUB;
      const amount = Math.abs(Number(value || 0)) / meta.rate;
      const sign = options.sign ? (Number(value || 0) >= 0 ? "+" : "-") : "";
      const formatter = new Intl.NumberFormat(meta.locale, {
        style: "currency",
        currency: meta.currency,
        minimumFractionDigits: options.cents ? 2 : 0,
        maximumFractionDigits: options.cents ? 2 : 0,
      });
      return `${sign}${formatter.format(amount)}`;
    },
    [settings.currency],
  );

  const value = useMemo(
    () => ({
      settings,
      languageLabel: languageLabels[settings.language] || languageLabels.ru,
      setSetting,
      updateSettings,
      formatMoney,
    }),
    [formatMoney, setSetting, settings, updateSettings],
  );

  return <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>;
}

export function useAppSettings() {
  return useContext(AppSettingsContext);
}

function normalizeSettings(value) {
  const language = value?.language === "English" ? "en" : value?.language === "Русский" ? "ru" : value?.language || "ru";
  return {
    ...defaultAppSettings,
    ...value,
    currency: currencyMeta[value?.currency] ? value.currency : "RUB",
    language: language === "en" ? "en" : "ru",
  };
}
