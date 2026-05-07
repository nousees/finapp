# FinApp

**Слоган:** «ТВОЙ ПУТЬ ОТ ХАОСА В РАСХОДАХ К ФИНАНСОВОЙ СВОБОДЕ.»

FinApp — мобильное приложение для управления личными финансами с микросервисной архитектурой в монорепозитории.

## Ключевая идея

Проект разделён на два этапа (два модуля ВКР):

1. **Модуль 1 — Сбор и обработка финансовых данных** (основной фокус текущей реализации)
2. **Модуль 2 — Анализ и контроль финансов**

> На текущем этапе интеграция с банками реализуется через импорт CSV/Excel. Open Banking API отложен.

## Технологический стек

- **Мобильный клиент:** React Native + TypeScript (iOS + Android)
- **Backend:**
  - Golang + Gin (auth, collection, processing, subscription-detector)
  - Java + Spring Boot (analysis-control)
- **ML:** Python + FastAPI (Whisper Large-v3, NER RuBERT-tiny, CatBoost + CNN)
- **Данные:** PostgreSQL (единая БД), Redis (кэш/очереди)
- **Инфраструктура:** Docker + docker-compose (локально), Railway/Render (prod)
- **Безопасность:** JWT + refresh tokens, TLS 1.3, аудит операций

## Структура репозитория

```text
finapp/
├── apps/mobile/                                  # React Native приложение
├── services/
│   ├── data-processing/
│   │   ├── auth/                                 # Go: аутентификация
│   │   ├── collection/                           # Go: сбор данных (голос/импорт/ручной ввод)
│   │   ├── processing/                           # Go: категоризация и обогащение транзакций
│   │   └── subscription-detector/                # Go: анализ подписок
│   ├── analysis-control/                         # Java/Spring Boot: модуль анализа и контроля
│   └── ml-service/                               # Python/FastAPI: ML-сервис
├── infrastructure/                               # инфраструктурные материалы
├── docs/                                         # проектная документация
└── docker-compose.yml
```

## Модули и ответственность

### Модуль 1 (Go + ML)

- Импорт банковских выписок CSV/Excel
- Голосовой ввод транзакций на русском языке
- Ручной ввод с автоподсказками
- Автокатегоризация транзакций (целевая точность ~94% на синтетических данных)
- Детекция подписок и финансовых привычек
- Первичные рекомендации по экономии

### Модуль 2 (Java)

- Дашборд расходов/доходов
- Бюджеты по категориям и общие
- Финансовые цели и прогресс
- Отчёты и аналитика
- Умные уведомления

## База данных (PostgreSQL)

### Основные таблицы

- users, categories, transactions, subscriptions, imports
- budgets, goals, notifications, recommendations, audit_logs

### Границы владения таблицами

- **Модуль 1 (Go):** users, categories, transactions, imports, subscriptions, voice_transcriptions, counterparties, sync_queue
- **Модуль 2 (Java):** budgets, goals, goal_transactions, reports, dashboard_widgets
- **Общие:** notifications, notification_templates, recommendations, audit_logs

## Наблюдаемость и надёжность

- Sentry для ошибок клиента/сервисов
- Prometheus + Grafana для метрик
- Structured logging (zap/structlog)
- 4 уровня синхронизации: Pull-to-Refresh, фоновая синхронизация, оффлайн-очередь, Redis-кэш

## Архитектура после объединения

### Порты сервисов
- **Gateway (Nginx):** `localhost:8080` - единая точка входа
- **Auth (Go):** `localhost:8082` → контейнер `auth:8082` - аутентификация и JWT
- **Collection (Go):** `localhost:8086` → контейнер `collection:8080` - сбор данных (транзакции, импорт, голос)
- **Processing (Go):** `localhost:8081` → контейнер `processing:8081` - ML-обработка и категоризация
- **Subscription Detector (Go):** `localhost:8083` → контейнер `subscription-detector:8083` - детектор подписок
- **Analysis Control (Java):** `localhost:8084` → контейнер `analysis-control:8084` - бюджеты, цели, отчеты
- **ML Service (Python):** `localhost:8000` → контейнер `ml-service:8000` - Whisper, NER, CatBoost
- **PostgreSQL:** `localhost:5433` → контейнер `postgres:5432` - единая база данных
- **Redis:** `localhost:6379` - кэш и очереди

### API маршрутизация через Gateway
```
/api/v1/auth/*          → auth:8082
/api/v1/transactions/*  → collection:8080
/api/v1/imports/*       → collection:8080
/api/v1/voice/*         → collection:8080
/api/v1/process/*       → processing:8081
/api/v1/categorize/*    → processing:8081
/api/v1/subscriptions/* → subscription-detector:8083
/api/v1/budgets/*       → analysis-control:8084
/api/v1/goals/*         → analysis-control:8084
/api/v1/reports/*       → analysis-control:8084
/api/v1/notifications/* → analysis-control:8084
/api/v1/insights/*      → analysis-control:8084
/api/v1/ml/*            → ml-service:8000
```

## 🚀 Быстрый старт (локально)

### 1. Подготовка окружения
Убедитесь, что установлены Docker Desktop / Docker Engine с Compose v2, Node.js 20+ и npm.

Если база уже запускалась со старой схемой и нужно проверить проект с чистого состояния, удалите старые контейнеры и volume:

```bash
docker compose down -v --remove-orphans
```

### 2. Запуск всех сервисов
```bash
# Собрать и запустить полный стек в фоновом режиме
docker compose up -d --build

# Посмотреть статус контейнеров
docker compose ps

# Смотреть логи всех сервисов, если какой-то контейнер не стал healthy
docker compose logs -f --tail=200
```

### 3. Проверка системы
```bash
# Проверить gateway
curl http://localhost:8080/health

# Проверить Java analysis-control напрямую
curl http://localhost:8084/api/test/health

# Установить зависимости для интеграционных тестов
cd tests && npm install

# Проверить здоровье всех сервисов через gateway
node ../test-system.js

# Запустить интеграционные тесты
npm test
```

### 4. Доступ к сервисам
- **API Gateway:** http://localhost:8080
- **Health Check:** http://localhost:8080/health
- **База данных:** `localhost:5433` (`finapp`/`finapp`, внутри Docker-сети `postgres:5432`)
- **Redis:** `localhost:6379`

### 5. Остановка проекта
```bash
# Остановить контейнеры, сохранив данные PostgreSQL volume
docker compose down

# Полностью очистить локальные данные PostgreSQL и пересоздать схему при следующем запуске
docker compose down -v --remove-orphans
```

## 📱 Мобильное приложение

### Запуск React Native
```bash
cd apps/mobile
npm install
npm start
```

### Тестовый пользователь
- **Email:** test@finapp.local
- **Password:** test

## 🧪 Тестирование

### Интеграционные тесты
```bash
cd tests
npm install
npm test
```

### Проверка системы
```bash
node test-system.js
```

### API маршруты через Gateway
```
/api/v1/auth/*          → auth:8081 (аутентификация)
/api/v1/transactions/*  → collection:8082 (транзакции)
/api/v1/imports/*       → collection:8082 (импорт файлов)
/api/v1/voice/*         → collection:8082 (голосовой ввод)
/api/v1/process/*       → processing:8083 (ML обработка)
/api/v1/categorize/*    → processing:8083 (категоризация)
/api/v1/subscriptions/* → subscription:8084 (подписки)
/api/v1/budgets/*       → analysis:8085 (бюджеты)
/api/v1/goals/*         → analysis:8085 (цели)
/api/v1/reports/*       → analysis:8085 (отчеты)
/api/v1/notifications/* → analysis:8085 (уведомления)
/api/v1/ml/*            → ml-service:8000 (ML сервисы)
```

## 📊 Текущее состояние

### ✅ **Выполнено:**
- ✅ Объединены Go и Java модули в единую архитектуру
- ✅ Создана единая схема БД (20+ таблиц)
- ✅ Настроен API Gateway с маршрутизацией
- ✅ Исправлены конфликты портов между сервисами
- ✅ Создан базовый ML сервис с заглушками
- ✅ Написаны интеграционные тесты
- ✅ Создан скрипт проверки системы
- ✅ Подготовлена структура для фронтенда

### ✅ **Доступно:**
- Полный стек микросервисов (Go + Java + Python)
- Единая база данных PostgreSQL с триггерами
- Redis для кэширования
- API Gateway с CORS поддержкой
- Интеграционные тесты
- Скрипты для проверки здоровья системы

### ⚠️ **В работе:**
- Фронтенд React Native (структура готова, нужно исправить TypeScript)
- Полноценная авторизация в мобильном приложении
- Реальные ML модели (сейчас заглушки)

### 🔄 **Следующие шаги:**
- Исправить проблемы с TypeScript в React Native
- Подключить фронтенд к API
- Добавить реальные ML модели
- Настроить CI/CD
- Продуктивное развертывание

## 🛠️ Разработка

### Структура проекта
```
finapp-main/
├── apps/mobile/                 # React Native приложение
├── services/
│   ├── data-processing/         # Go микросервисы
│   │   ├── auth/               # Аутентификация
│   │   ├── collection/         # Сбор данных
│   │   ├── processing/         # ML обработка
│   │   └── subscription/      # Детектор подписок
│   ├── analysis-control/       # Java Spring Boot
│   ├── gateway/                # Nginx API Gateway
│   └── ml-service/             # Python FastAPI
├── infrastructure/
│   └── database/               # SQL схема БД
├── tests/                      # Интеграционные тесты
├── test-system.js              # Скрипт проверки
└── docker-compose.yml          # Конфигурация всех сервисов
```

### Локальная разработка
```bash
# Запустить только базу данных и Redis
docker compose up -d postgres redis

# Разработка Go сервисов
cd services/data-processing/collection
go run ./cmd/collection/main.go

# Разработка Java сервиса
cd services/analysis-control
./mvnw spring-boot:run

# Разработка ML сервиса
cd services/ml-service
uvicorn main:app --reload
```
