import { apiConfig } from "./config";
import AsyncStorage from '@react-native-async-storage/async-storage';

type RequestOptions = Omit<RequestInit, "body" | "headers"> & {
  baseUrl: string;
  path: string;
  body?: BodyInit | object;
  headers?: Record<string, string>;
  skipAuthRefresh?: boolean;
};

export async function setAccessToken(token: string): Promise<void> {
  await AsyncStorage.setItem('access_token', token);
}

export async function clearAccessToken(): Promise<void> {
  await AsyncStorage.removeItem('access_token');
  await AsyncStorage.removeItem('refresh_token');
  await AsyncStorage.removeItem('user_data');
}

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
  }
}

export async function requestJson<T>({
  baseUrl,
  path,
  body,
  headers,
  skipAuthRefresh,
  ...init
}: RequestOptions): Promise<T> {
  // Получаем токен из AsyncStorage
  const token = await AsyncStorage.getItem('access_token');
  
  const requestHeaders: Record<string, string> = {
    Accept: "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...headers,
  };

  let requestBody: BodyInit | undefined;
  if (body instanceof FormData) {
    requestBody = body;
  } else if (body !== undefined) {
    requestHeaders["Content-Type"] = "application/json";
    requestBody = JSON.stringify(body);
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: requestHeaders,
    body: requestBody,
  });

  if (response.status === 401 && !skipAuthRefresh) {
    const refreshedToken = await refreshAccessToken();
    if (refreshedToken) {
      return requestJson<T>({
        baseUrl,
        path,
        body,
        headers,
        skipAuthRefresh: true,
        ...init,
      });
    }
  }

  const text = await response.text();
  const payload = text ? tryParseJson(text) : null;

  if (!response.ok) {
    const message =
      typeof payload === "object" && payload && "error" in payload && typeof payload.error === "string"
        ? payload.error
        : `HTTP ${response.status}`;
    throw new ApiError(message, response.status);
  }

  return payload as T;
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await AsyncStorage.getItem("refresh_token");
  if (!refreshToken) {
    await clearAccessToken();
    return null;
  }

  try {
    const response = await fetch(`${apiConfig.authBaseUrl}/api/v1/auth/refresh`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    const text = await response.text();
    const payload = text ? tryParseJson(text) : null;

    if (!response.ok || typeof payload !== "object" || !payload || !("access_token" in payload)) {
      await clearAccessToken();
      return null;
    }

    const accessToken = String((payload as { access_token: string }).access_token);
    await AsyncStorage.setItem("access_token", accessToken);
    if ("refresh_token" in payload && (payload as { refresh_token?: string }).refresh_token) {
      await AsyncStorage.setItem("refresh_token", String((payload as { refresh_token: string }).refresh_token));
    }
    return accessToken;
  } catch (error) {
    console.error("Token refresh failed:", error);
    await clearAccessToken();
    return null;
  }
}

function tryParseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}
