// Простой API клиент для React Native без TypeScript проблем

const API_BASE_URL = 'http://localhost:8080';

class ApiClient {
  constructor(baseURL = API_BASE_URL) {
    this.baseURL = baseURL;
    this.accessToken = null;
  }

  // Управление токенами
  async setTokens(accessToken, refreshToken) {
    this.accessToken = accessToken;
    try {
      await AsyncStorage.setItem('access_token', accessToken);
      await AsyncStorage.setItem('refresh_token', refreshToken);
    } catch (error) {
      console.error('Error setting tokens:', error);
    }
  }

  async getAccessToken() {
    if (!this.accessToken) {
      try {
        this.accessToken = await AsyncStorage.getItem('access_token');
      } catch (error) {
        console.error('Error getting token:', error);
        return null;
      }
    }
    return this.accessToken;
  }

  async clearTokens() {
    this.accessToken = null;
    try {
      await AsyncStorage.removeItem('access_token');
      await AsyncStorage.removeItem('refresh_token');
    } catch (error) {
      console.error('Error clearing tokens:', error);
    }
  }

  // Базовый метод для запросов
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const token = await this.getAccessToken();

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

  // Auth методы
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

  async refreshTokens() {
    try {
      const refreshToken = await AsyncStorage.getItem('refresh_token');
      if (!refreshToken) {
        return { error: 'No refresh token available', success: false };
      }

      return this.request('/api/v1/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
    } catch (error) {
      return { error: 'Refresh token error', success: false };
    }
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

  // Голосовой ввод
  async transcribeAudio(audioFile) {
    const formData = new FormData();
    formData.append('audio', audioFile);

    return this.request('/api/v1/voice/upload', {
      method: 'POST',
      body: formData,
      headers: {}, // Убираем Content-Type для FormData
    });
  }

  // Импорт
  async importBankStatement(file) {
    const formData = new FormData();
    formData.append('file', file);

    return this.request('/api/v1/import', {
      method: 'POST',
      body: formData,
      headers: {}, // Убираем Content-Type для FormData
    });
  }

  // Уведомления
  async getNotifications() {
    return this.request('/api/v1/notifications');
  }

  async markNotificationAsRead(notificationId) {
    return this.request(`/api/v1/notifications/${notificationId}/read`, {
      method: 'PATCH',
    });
  }

  // Отчеты
  async getReports(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/api/v1/reports${queryString ? `?${queryString}` : ''}`;
    return this.request(endpoint);
  }
}

// Экспорт экземпляра клиента
export const apiClient = new ApiClient();

// Хук для авторизации
export const useAuth = () => {
  const [isLoading, setIsLoading] = React.useState(false);
  const [user, setUser] = React.useState(null);
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);

  React.useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      setIsAuthenticated(!!token);
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

  const register = async (email, password, fullName) => {
    setIsLoading(true);
    try {
      const response = await apiClient.register(email, password, fullName);
      if (response.success && response.data) {
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
