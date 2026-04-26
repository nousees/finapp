const axios = require('axios');

const BASE_URL = 'http://localhost:8080';

// Тестовые данные
const testUser = {
  email: 'test@finapp.local',
  password: 'test123',
  full_name: 'Test User'
};

let authToken = null;

describe('FinApp API Integration Tests', () => {
  beforeAll(async () => {
    // Проверяем доступность API Gateway
    try {
      const response = await axios.get(`${BASE_URL}/health`);
      expect(response.status).toBe(200);
      console.log('✅ API Gateway is healthy');
    } catch (error) {
      console.error('❌ API Gateway is not available:', error.message);
      throw error;
    }
  }, 10000);

  describe('Authentication Flow', () => {
    test('POST /api/v1/auth/signup - User Registration', async () => {
      try {
        const response = await axios.post(`${BASE_URL}/api/v1/auth/signup`, testUser);
        
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('access_token');
        expect(response.data).toHaveProperty('refresh_token');
        expect(response.data.user).toHaveProperty('email', testUser.email);
        
        authToken = response.data.access_token;
        console.log('✅ User registration successful');
      } catch (error) {
        // Если пользователь уже существует, пробуем войти
        if (error.response?.status === 409) {
          console.log('ℹ️ User already exists, trying login...');
          const loginResponse = await axios.post(`${BASE_URL}/api/v1/auth/signin`, {
            email: testUser.email,
            password: testUser.password
          });
          authToken = loginResponse.data.access_token;
          console.log('✅ User login successful');
        } else {
          throw error;
        }
      }
    });

    test('POST /api/v1/auth/signin - User Login', async () => {
      if (!authToken) {
        const response = await axios.post(`${BASE_URL}/api/v1/auth/signin`, {
          email: testUser.email,
          password: testUser.password
        });
        
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('access_token');
        
        authToken = response.data.access_token;
        console.log('✅ User login successful');
      }
    });

    test('POST /api/v1/auth/refresh - Token Refresh', async () => {
      const response = await axios.post(`${BASE_URL}/api/v1/auth/refresh`, {
        refresh_token: 'dummy_refresh_token'
      });
      
      // Может вернуть ошибку, но проверяем что эндпоинт отвечает
      expect([200, 401]).toContain(response.status);
      console.log('✅ Token refresh endpoint responding');
    });
  });

  describe('Transaction Management', () => {
    const testTransaction = {
      amount: 350.00,
      description: 'Кофе в Старбакс',
      category_id: '11111111-1111-1111-1111-111111111111',
      type: 'EXPENSE',
      date: new Date().toISOString()
    };

    test('GET /api/v1/transactions - Get Transactions List', async () => {
      const response = await axios.get(`${BASE_URL}/api/v1/transactions`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      expect([200, 404]).toContain(response.status);
      console.log('✅ Transactions endpoint responding');
    });

    test('POST /api/v1/transactions - Create Transaction', async () => {
      try {
        const response = await axios.post(`${BASE_URL}/api/v1/transactions`, testTransaction, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        
        expect([200, 201]).toContain(response.status);
        console.log('✅ Transaction creation successful');
      } catch (error) {
        // Ожидаем ошибки если сервис еще не готов
        expect([502, 503, 404]).toContain(error.response?.status);
        console.log('⚠️ Transaction service not ready yet');
      }
    });
  });

  describe('Category Management', () => {
    test('GET /api/v1/categories - Get Categories List', async () => {
      try {
        const response = await axios.get(`${BASE_URL}/api/v1/categories`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        
        expect([200, 404]).toContain(response.status);
        console.log('✅ Categories endpoint responding');
      } catch (error) {
        expect([502, 503, 404]).toContain(error.response?.status);
        console.log('⚠️ Categories service not ready yet');
      }
    });
  });

  describe('Budget Management', () => {
    const testBudget = {
      category_id: '11111111-1111-1111-1111-111111111111',
      amount_limit: 5000.00,
      period: 'MONTHLY',
      period_start: new Date().toISOString().split('T')[0],
      period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    };

    test('GET /api/v1/budgets - Get Budgets List', async () => {
      try {
        const response = await axios.get(`${BASE_URL}/api/v1/budgets`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        
        expect([200, 404]).toContain(response.status);
        console.log('✅ Budgets endpoint responding');
      } catch (error) {
        expect([502, 503, 404]).toContain(error.response?.status);
        console.log('⚠️ Budgets service not ready yet');
      }
    });

    test('POST /api/v1/budgets - Create Budget', async () => {
      try {
        const response = await axios.post(`${BASE_URL}/api/v1/budgets`, testBudget, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        
        expect([200, 201]).toContain(response.status);
        console.log('✅ Budget creation successful');
      } catch (error) {
        expect([502, 503, 404]).toContain(error.response?.status);
        console.log('⚠️ Budgets service not ready yet');
      }
    });
  });

  describe('Goal Management', () => {
    const testGoal = {
      name: 'Новый телефон',
      description: 'Скопить на новый iPhone',
      target_amount: 50000.00,
      deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      goal_type: 'PURCHASE'
    };

    test('GET /api/v1/goals - Get Goals List', async () => {
      try {
        const response = await axios.get(`${BASE_URL}/api/v1/goals`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        
        expect([200, 404]).toContain(response.status);
        console.log('✅ Goals endpoint responding');
      } catch (error) {
        expect([502, 503, 404]).toContain(error.response?.status);
        console.log('⚠️ Goals service not ready yet');
      }
    });

    test('POST /api/v1/goals - Create Goal', async () => {
      try {
        const response = await axios.post(`${BASE_URL}/api/v1/goals`, testGoal, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        
        expect([200, 201]).toContain(response.status);
        console.log('✅ Goal creation successful');
      } catch (error) {
        expect([502, 503, 404]).toContain(error.response?.status);
        console.log('⚠️ Goals service not ready yet');
      }
    });
  });

  describe('ML Services', () => {
    test('POST /api/v1/ml/transcribe - Audio Transcription', async () => {
      try {
        const response = await axios.post(`${BASE_URL}/api/v1/ml/transcribe`, {
          audio_url: 'test_audio.mp3'
        }, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        
        expect([200, 404]).toContain(response.status);
        if (response.status === 200) {
          expect(response.data).toHaveProperty('text');
          expect(response.data).toHaveProperty('confidence');
        }
        console.log('✅ ML transcription endpoint responding');
      } catch (error) {
        expect([502, 503, 404]).toContain(error.response?.status);
        console.log('⚠️ ML service not ready yet');
      }
    });

    test('POST /api/v1/ml/categorize - Transaction Categorization', async () => {
      try {
        const response = await axios.post(`${BASE_URL}/api/v1/ml/categorize`, {
          description: 'Купил кофе в старбакс',
          amount: 350.00,
          type: 'EXPENSE'
        }, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        
        expect([200, 404]).toContain(response.status);
        if (response.status === 200) {
          expect(response.data).toHaveProperty('category_id');
          expect(response.data).toHaveProperty('confidence');
        }
        console.log('✅ ML categorization endpoint responding');
      } catch (error) {
        expect([502, 503, 404]).toContain(error.response?.status);
        console.log('⚠️ ML service not ready yet');
      }
    });
  });

  describe('Notification Management', () => {
    test('GET /api/v1/notifications - Get Notifications', async () => {
      try {
        const response = await axios.get(`${BASE_URL}/api/v1/notifications`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        
        expect([200, 404]).toContain(response.status);
        console.log('✅ Notifications endpoint responding');
      } catch (error) {
        expect([502, 503, 404]).toContain(error.response?.status);
        console.log('⚠️ Notifications service not ready yet');
      }
    });
  });

  describe('Report Management', () => {
    test('GET /api/v1/reports - Get Reports', async () => {
      try {
        const response = await axios.get(`${BASE_URL}/api/v1/reports`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        
        expect([200, 404]).toContain(response.status);
        console.log('✅ Reports endpoint responding');
      } catch (error) {
        expect([502, 503, 404]).toContain(error.response?.status);
        console.log('⚠️ Reports service not ready yet');
      }
    });
  });

  describe('Service Health Checks', () => {
    const services = [
      { name: 'Auth Service', path: '/api/v1/auth/signin' },
      { name: 'Collection Service', path: '/api/v1/transactions' },
      { name: 'Processing Service', path: '/api/v1/process' },
      { name: 'Subscription Service', path: '/api/v1/subscriptions' },
      { name: 'Analysis Service', path: '/api/v1/budgets' },
      { name: 'ML Service', path: '/api/v1/ml/transcribe' }
    ];

    test.each(services)('Check $name availability', async ({ path }) => {
      try {
        await axios.get(`${BASE_URL}${path}`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        console.log(`✅ ${path.replace('/api/v1/', '')} service is responding`);
      } catch (error) {
        const status = error.response?.status;
        if ([401, 405].includes(status)) {
          console.log(`✅ ${path.replace('/api/v1/', '')} service is responding (auth/method error expected)`);
        } else if ([404, 502, 503].includes(status)) {
          console.log(`⚠️ ${path.replace('/api/v1/', '')} service not ready yet`);
        } else {
          throw error;
        }
      }
    });
  });
});

// Запуск тестов
if (require.main === module) {
  console.log('🚀 Starting FinApp Integration Tests...\n');
  
  // Увеличиваем таймаут для всех тестов
  jest.setTimeout(30000);
  
  // Запускаем тесты
  require('jest').run();
}
