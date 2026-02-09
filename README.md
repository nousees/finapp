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

## Быстрый старт (локально)

1. Установить Docker и Docker Compose.
2. Подготовить переменные окружения по `.env.example` (если применимо для сервиса).
3. Запустить:

```bash
docker compose up --build
```

## Текущее состояние

- Монорепозиторий и базовая структура сервисов созданы.
- Поток обработки данных строится вокруг модуля 1 (сбор + ML + обработка).
- Модуль 2 реализуется как отдельный сервис `analysis-control`.
