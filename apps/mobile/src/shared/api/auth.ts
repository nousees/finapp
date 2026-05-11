import { apiConfig } from "./config";
import { requestJson, setAccessToken, clearAccessToken } from "./http";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  full_name: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: {
    id: string;
    email: string;
  };
}

/**
 * Аутентификация - все запросы идут через Gateway
 * Gateway маршрутизирует на /api/v1/auth/* → auth-service
 */
export async function login(credentials: LoginRequest): Promise<AuthResponse> {
  const response = await requestJson<AuthResponse>({
    baseUrl: apiConfig.authBaseUrl,
    path: "/api/v1/auth/signin",
    method: "POST",
    body: credentials,
  });

  // Сохраняем access token для будущих запросов
  if (response.access_token) {
    await setAccessToken(response.access_token);
  }

  return response;
}

export async function signup(data: SignupRequest): Promise<AuthResponse> {
  const response = await requestJson<AuthResponse>({
    baseUrl: apiConfig.authBaseUrl,
    path: "/api/v1/auth/signup",
    method: "POST",
    body: data,
  });

  // Сохраняем access token
  if (response.access_token) {
    await setAccessToken(response.access_token);
  }

  return response;
}

export async function logout(): Promise<void> {
  await clearAccessToken();
}

export async function refreshToken(refreshTokenValue: string): Promise<AuthResponse> {
  return requestJson<AuthResponse>({
    baseUrl: apiConfig.authBaseUrl,
    path: "/api/v1/auth/refresh",
    method: "POST",
    body: { refresh_token: refreshTokenValue },
  });
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await requestJson({
    baseUrl: apiConfig.authBaseUrl,
    path: "/api/v1/auth/change-password",
    method: "POST",
    body: {
      current_password: currentPassword,
      new_password: newPassword,
    },
  });
}
