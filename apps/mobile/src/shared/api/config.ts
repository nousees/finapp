import { NativeModules } from "react-native";

const DEFAULT_USER_ID = "11111111-1111-1111-1111-111111111111";

function detectHost(): string {
  const scriptURL = NativeModules.SourceCode?.scriptURL as string | undefined;
  if (scriptURL) {
    try {
      return new URL(scriptURL).hostname;
    } catch {
      return "127.0.0.1";
    }
  }

  return "127.0.0.1";
}

const host = detectHost();

export const apiConfig = {
  collectionBaseUrl: process.env.EXPO_PUBLIC_COLLECTION_API_URL?.trim() || `http://${host}:8080`,
  processingBaseUrl: process.env.EXPO_PUBLIC_PROCESSING_API_URL?.trim() || `http://${host}:8083`,
  subscriptionsBaseUrl: process.env.EXPO_PUBLIC_SUBSCRIPTIONS_API_URL?.trim() || `http://${host}:8084`,
  devUserId: process.env.EXPO_PUBLIC_DEV_USER_ID?.trim() || DEFAULT_USER_ID,
};
