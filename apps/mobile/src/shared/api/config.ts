import { NativeModules } from "react-native";

const DEFAULT_USER_ID = "11111111-1111-1111-1111-111111111111";

function detectHost(): string {
  const configuredHost = process.env.EXPO_PUBLIC_API_HOST?.trim();
  if (configuredHost) return configuredHost;

  // Используем переменную окружения или IP адрес по умолчанию
  const scriptURL = NativeModules.SourceCode?.scriptURL;
  const metroHost = typeof scriptURL === "string" ? scriptURL.match(/https?:\/\/([^:/]+)/)?.[1] : undefined;

  return metroHost || "192.168.0.3";
}

const host = detectHost();

function resolveGatewayBaseUrl(): string {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (!configuredUrl) {
    return `http://${host}:8080`;
  }

  // On a real phone, localhost points to the phone itself, not the dev machine.
  return configuredUrl.replace(/\/\/(localhost|127\.0\.0\.1)(?=[:/]|$)/, `//${host}`);
}

const gatewayBaseUrl = resolveGatewayBaseUrl();

console.log("[apiConfig] gatewayBaseUrl", gatewayBaseUrl);

export const apiConfig = {
  gatewayBaseUrl,
  collectionBaseUrl: gatewayBaseUrl,
  processingBaseUrl: gatewayBaseUrl,
  subscriptionsBaseUrl: gatewayBaseUrl,
  authBaseUrl: gatewayBaseUrl,
  analysisBaseUrl: gatewayBaseUrl,
  mlBaseUrl: gatewayBaseUrl,
  devUserId: process.env.EXPO_PUBLIC_DEV_USER_ID?.trim() || DEFAULT_USER_ID,
};
