import { apiConfig } from "./config";
import AsyncStorage from '@react-native-async-storage/async-storage';

type RequestOptions = Omit<RequestInit, "body" | "headers"> & {
  baseUrl: string;
  path: string;
  body?: BodyInit | object;
  headers?: Record<string, string>;
};

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

function tryParseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}
