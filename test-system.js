#!/usr/bin/env node

const axios = require('axios');
const colors = require('colors');

const BASE_URL = 'http://localhost:8080';

// Цветной вывод
const log = {
  success: (msg) => console.log('✅'.green, msg),
  error: (msg) => console.log('❌'.red, msg),
  warning: (msg) => console.log('⚠️'.yellow, msg),
  info: (msg) => console.log('ℹ️'.blue, msg)
};

// Проверка доступности сервиса
async function checkService(name, url, method = 'GET', data = null) {
  try {
    const config = { method, url };
    if (data) config.data = data;
    if (method !== 'GET') config.headers = { 'Content-Type': 'application/json' };
    
    const response = await axios(config);
    log.success(`${name}: ${response.status} ${response.statusText}`);
    return true;
  } catch (error) {
    const status = error.response?.status;
    if (status === 401 || status === 405) {
      log.success(`${name}: ${status} (expected)`);
      return true;
    } else if (status === 404 || status === 502 || status === 503) {
      log.warning(`${name}: ${status} - service not ready`);
      return false;
    } else {
      log.error(`${name}: ${status} ${error.message}`);
      return false;
    }
  }
}

// Основная функция проверки
async function runSystemCheck() {
  console.log('\n🚀 FinApp System Health Check\n'.cyan.bold);
  
  let allServicesReady = true;
  
  // Проверяем API Gateway
  log.info('Checking API Gateway...');
  const gatewayReady = await checkService('API Gateway', `${BASE_URL}/health`);
  if (!gatewayReady) {
    log.error('API Gateway is not available. Please start the services first.');
    console.log('\n💡 To start all services:'.yellow);
    console.log('docker compose up --build\n');
    return;
  }
  
  log.success('API Gateway is healthy!\n');
  
  // Проверяем все сервисы
  const services = [
    { name: 'Auth Service', path: '/api/v1/auth/signin', method: 'POST', data: { email: 'test@test.com', password: 'test' } },
    { name: 'Collection Service', path: '/api/v1/transactions' },
    { name: 'Processing Service', path: '/api/v1/process' },
    { name: 'Subscription Service', path: '/api/v1/subscriptions' },
    { name: 'Analysis Service', path: '/api/v1/budgets' },
    { name: 'ML Service', path: '/api/v1/categorize', method: 'POST', data: { description: 'кофе', amount: 350, operation_type: 'expense' } }
  ];
  
  log.info('Checking microservices...\n');
  
  for (const service of services) {
    const ready = await checkService(service.name, `${BASE_URL}${service.path}`, service.method, service.data);
    if (!ready) allServicesReady = false;
  }
  
  console.log('\n' + '='.repeat(50));
  
  if (allServicesReady) {
    log.success('All services are ready! 🎉');
    console.log('\n📱 You can now start the mobile app:'.cyan);
    console.log('cd apps/mobile && npm start\n');
    console.log('🧪 Run integration tests:'.cyan);
    console.log('cd tests && npm test\n');
  } else {
    log.warning('Some services are not ready yet.');
    console.log('\n⏳ Wait a moment and run this check again.\n');
  }
}

// Запуск если файл вызван напрямую
if (require.main === module) {
  runSystemCheck().catch(console.error);
}

module.exports = { runSystemCheck, checkService };
