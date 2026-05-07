// @ts-nocheck
import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import { apiConfig } from './config';

const API_BASE_URL = apiConfig.collectionBaseUrl;

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    email: string;
    full_name: string;
  };
}

class ApiClient {
  private baseURL: string;
  private accessToken: string | null = null;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  // Управление токенами
  async setTokens(accessToken: string, refreshToken: string) {
    this.accessToken = accessToken;
    await AsyncStorage.setItem('access_token', accessToken);
    await AsyncStorage.setItem('refresh_token', refreshToken);
  }

  async getAccessToken(): Promise<string | null> {
    if (!this.accessToken) {
      this.accessToken = await AsyncStorage.getItem('access_token');
    }
    return this.accessToken;
  }

  async clearTokens() {
    this.accessToken = null;
    await AsyncStorage.removeItem('access_token');
    await AsyncStorage.removeItem('refresh_token');
  }

  // Базовый метод для запросов
  private async request<T>(
    endpoint: string,
    options: any = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    const token = await this.getAccessToken();

    const headers: any = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      return { data };
    } catch (error: any) {
      console.error('API request error:', error);
      return { 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  // Auth методы
  async login(credentials: LoginRequest): Promise<ApiResponse<AuthResponse>> {
    return this.request<AuthResponse>('/api/v1/auth/signin', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async register(userData: RegisterRequest): Promise<ApiResponse<AuthResponse>> {
    return this.request<AuthResponse>('/api/v1/auth/signup', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async refreshTokens(): Promise<ApiResponse<AuthResponse>> {
    const refreshToken = await AsyncStorage.getItem('refresh_token');
    if (!refreshToken) {
      return { error: 'No refresh token available' };
    }

    return this.request<AuthResponse>('/api/v1/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  }

  // Транзакции
  async getTransactions(params?: {
    limit?: number;
    offset?: number;
    category_id?: string;
  }): Promise<ApiResponse<any[]>> {
    const queryParams = new URLSearchParams(params as any).toString();
    const endpoint = `/api/v1/transactions${queryParams ? `?${queryParams}` : ''}`;
    return this.request(endpoint);
  }

  async createTransaction(transaction: {
    amount: number;
    description: string;
    category_id: string;
    type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
    date: string;
  }): Promise<ApiResponse<any>> {
    return this.request('/api/v1/transactions', {
      method: 'POST',
      body: JSON.stringify(transaction),
    });
  }

  // Категории
  // Бюджеты
  async getBudgets(): Promise<ApiResponse<any[]>> {
    return this.request('/api/v1/budgets');
  }

  async createBudget(budget: {
    categoryId?: string;
    amountLimit: number;
    period: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
    periodStart: string;
    periodEnd: string;
  }): Promise<ApiResponse<any>> {
    return this.request('/api/v1/budgets', {
      method: 'POST',
      body: JSON.stringify(budget),
    });
  }

  // Цели
  async getGoals(): Promise<ApiResponse<any[]>> {
    return this.request('/api/v1/goals');
  }

  async createGoal(goal: {
    name: string;
    description?: string;
    targetAmount: number;
    deadline: string;
    goalType: 'SAVING' | 'DEBT_REPAYMENT' | 'INVESTMENT' | 'PURCHASE';
  }): Promise<ApiResponse<any>> {
    return this.request('/api/v1/goals', {
      method: 'POST',
      body: JSON.stringify(goal),
    });
  }

  // Голосовой ввод
  async transcribeAudio(audioFile: File): Promise<ApiResponse<{
    text: string;
    confidence: number;
    entities: any;
  }>> {
    const formData = new FormData();
    formData.append('audio', audioFile);

    return this.request('/api/v1/voice/upload', {
      method: 'POST',
      body: formData as any,
      headers: {}, // Убираем Content-Type для FormData
    });
  }

  // Импорт
  async importBankStatement(file: File): Promise<ApiResponse<{
    total_records: number;
    processed_records: number;
    errors: any[];
  }>> {
    const formData = new FormData();
    formData.append('file', file);

    return this.request('/api/v1/import', {
      method: 'POST',
      body: formData as any,
      headers: {}, // Убираем Content-Type для FormData
    });
  }

  // Уведомления
  async getNotifications(): Promise<ApiResponse<any[]>> {
    return this.request('/api/v1/notifications');
  }

  async markNotificationAsRead(notificationId: string): Promise<ApiResponse<any>> {
    return this.request(`/api/v1/notifications/${notificationId}/read`, {
      method: 'PATCH',
    });
  }

  // Отчеты
  async getReports(params?: {
    report_type?: string;
    period_start?: string;
    period_end?: string;
  }): Promise<ApiResponse<any[]>> {
    const queryParams = new URLSearchParams(params as any).toString();
    const endpoint = `/api/v1/reports${queryParams ? `?${queryParams}` : ''}`;
    return this.request(endpoint);
  }
}

// Экспорт экземпляра клиента
export const apiClient = new ApiClient();

// Хук для авторизации
export const useAuth = () => {
  const [isLoading, setIsLoading] = React.useState(false);
  const [user, setUser] = React.useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);

  React.useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    const token = await apiClient.getAccessToken();
    setIsAuthenticated(!!token);
  };

  const login = async (credentials: LoginRequest) => {
    setIsLoading(true);
    try {
      const response = await apiClient.login(credentials);
      if (response.data) {
        await apiClient.setTokens(response.data.access_token, response.data.refresh_token);
        setUser(response.data.user);
        setIsAuthenticated(true);
        return { success: true };
      }
      return { success: false, error: response.error };
    } catch (error) {
      return { success: false, error: 'Login failed' };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: RegisterRequest) => {
    setIsLoading(true);
    try {
      const response = await apiClient.register(userData);
      if (response.data) {
        await apiClient.setTokens(response.data.access_token, response.data.refresh_token);
        setUser(response.data.user);
        setIsAuthenticated(true);
        return { success: true };
      }
      return { success: false, error: response.error };
    } catch (error) {
      return { success: false, error: 'Registration failed' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await apiClient.clearTokens();
    setUser(null);
    setIsAuthenticated(false);
  };

  return {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
  };
};
