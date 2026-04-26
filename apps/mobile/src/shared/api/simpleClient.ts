// @ts-nocheck
// Простой API клиент без сложных типов для React Native
import React from 'react';

const API_BASE_URL = 'http://localhost:8080';

class SimpleApiClient {
  constructor(baseURL = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  // Простое получение токена
  async getToken() {
    try {
      const token = await AsyncStorage.getItem('access_token');
      return token;
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  }

  // Простая установка токенов
  async setTokens(accessToken, refreshToken) {
    try {
      await AsyncStorage.setItem('access_token', accessToken);
      await AsyncStorage.setItem('refresh_token', refreshToken);
    } catch (error) {
      console.error('Error setting tokens:', error);
    }
  }

  // Очистка токенов
  async clearTokens() {
    try {
      await AsyncStorage.removeItem('access_token');
      await AsyncStorage.removeItem('refresh_token');
    } catch (error) {
      console.error('Error clearing tokens:', error);
    }
  }

  // Базовый метод запроса
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const token = await this.getToken();

    const headers = {
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

      return { data, success: true };
    } catch (error) {
      console.error('API request error:', error);
      return { 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        success: false
      };
    }
  }

  // Авторизация
  async login(email, password) {
    return this.request('/api/v1/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(email, password, fullName) {
    return this.request('/api/v1/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, full_name: fullName }),
    });
  }

  // Транзакции
  async getTransactions(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/api/v1/transactions${queryString ? `?${queryString}` : ''}`;
    return this.request(endpoint);
  }

  async createTransaction(transaction) {
    return this.request('/api/v1/transactions', {
      method: 'POST',
      body: JSON.stringify(transaction),
    });
  }

  // Категории
  async getCategories() {
    return this.request('/api/v1/categories');
  }

  // Бюджеты
  async getBudgets() {
    return this.request('/api/v1/budgets');
  }

  async createBudget(budget) {
    return this.request('/api/v1/budgets', {
      method: 'POST',
      body: JSON.stringify(budget),
    });
  }

  // Цели
  async getGoals() {
    return this.request('/api/v1/goals');
  }

  async createGoal(goal) {
    return this.request('/api/v1/goals', {
      method: 'POST',
      body: JSON.stringify(goal),
    });
  }

  // Уведомления
  async getNotifications() {
    return this.request('/api/v1/notifications');
  }

  // Отчеты
  async getReports(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/api/v1/reports${queryString ? `?${queryString}` : ''}`;
    return this.request(endpoint);
  }
}

// Экспорт экземпляра
export const apiClient = new SimpleApiClient();

// Простой хук авторизации
export const useSimpleAuth = () => {
  const [isLoading, setIsLoading] = React.useState(false);
  const [user, setUser] = React.useState(null);
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);

  React.useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      const userData = await AsyncStorage.getItem('user_data');
      
      if (token && userData) {
        setUser(JSON.parse(userData));
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    }
  };

  const login = async (email, password) => {
    setIsLoading(true);
    try {
      const response = await apiClient.login(email, password);
      
      if (response.success && response.data) {
        await apiClient.setTokens(response.data.access_token, response.data.refresh_token);
        await AsyncStorage.setItem('user_data', JSON.stringify(response.data.user));
        
        setUser(response.data.user);
        setIsAuthenticated(true);
        return { success: true };
      }
      
      return { success: false, error: response.error };
    } catch (error) {
      return { success: false, error: 'Network error' };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email, password, fullName) => {
    setIsLoading(true);
    try {
      const response = await apiClient.register(email, password, fullName);
      
      if (response.success && response.data) {
        await apiClient.setTokens(response.data.access_token, response.data.refresh_token);
        await AsyncStorage.setItem('user_data', JSON.stringify(response.data.user));
        
        setUser(response.data.user);
        setIsAuthenticated(true);
        return { success: true };
      }
      
      return { success: false, error: response.error };
    } catch (error) {
      return { success: false, error: 'Network error' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await apiClient.clearTokens();
      await AsyncStorage.removeItem('user_data');
      
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Error during logout:', error);
    }
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
