import { Platform } from "react-native";

const DEFAULT_USER_ID = "11111111-1111-1111-1111-111111111111";

function detectHost(): string {
  // Используем переменную окружения или IP адрес по умолчанию
  return process.env.EXPO_PUBLIC_API_HOST || "192.168.0.3";
}

const host = detectHost();

export const apiConfig = {
  collectionBaseUrl: process.env.EXPO_PUBLIC_COLLECTION_API_URL?.trim() || `http://${host}:8080`,
  processingBaseUrl: process.env.EXPO_PUBLIC_PROCESSING_API_URL?.trim() || `http://${host}:8081`,
  subscriptionsBaseUrl: process.env.EXPO_PUBLIC_SUBSCRIPTIONS_API_URL?.trim() || `http://${host}:8083`,
  authBaseUrl: process.env.EXPO_PUBLIC_AUTH_API_URL?.trim() || `http://${host}:8082`,
  analysisBaseUrl: process.env.EXPO_PUBLIC_ANALYSIS_API_URL?.trim() || `http://${host}:8080`,
  devUserId: process.env.EXPO_PUBLIC_DEV_USER_ID?.trim() || DEFAULT_USER_ID,
};
