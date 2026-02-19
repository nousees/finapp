# Collection (Модуль 1 — сбор данных)

Сервис приёма финансовых данных: ручной ввод, импорт CSV/Excel, голосовой ввод.

## Функции

- **POST /api/v1/transactions** — создание одной транзакции (ручной ввод)
- **POST /api/v1/transactions/batch** — создание нескольких транзакций
- **POST /api/v1/import** — загрузка файла (CSV или Excel), разбор и сохранение транзакций
- **POST /api/v1/voice/upload** — загрузка аудио, отправка в ML (transcribe), сохранение в `voice_transcriptions`

Все маршруты требуют аутентификации (JWT или заголовок `X-User-Id` для разработки).

## Переменные окружения

| Переменная        | Описание                    | По умолчанию |
|-------------------|-----------------------------|--------------|
| `PORT`            | Порт HTTP                   | `8080`       |
| `DATABASE_DSN`    | PostgreSQL DSN              | см. .env     |
| `ML_SERVICE_URL`  | Базовый URL ML-сервиса      | `http://localhost:8000` |
| `JWT_SECRET`      | Секрет для проверки JWT     | (dev-значение) |

## Как запустить для теста

**1. Поднять PostgreSQL** (из корня репозитория):

```bash
docker compose up -d postgres
```

При первом запуске выполнится `infrastructure/init-collection.sql`: создадутся нужные таблицы и тестовый пользователь с id `11111111-1111-1111-1111-111111111111`.

**2. Переменные окружения** (при необходимости скопируйте из корня):

```bash
# В корне проекта есть .env.example
# По умолчанию collection уже ожидает: postgres://finapp:finapp@localhost:5432/finapp?sslmode=disable
```

**3. Запустить сервис** из каталога `services/data-processing/collection`:

```bash
go run ./cmd/collection
```

Сервис слушает порт **8080**.

**4. Проверить:**

```bash
# Health (без авторизации)
curl http://localhost:8080/health

# Ручная транзакция (с заголовком для разработки — без JWT)
curl -X POST http://localhost:8080/api/v1/transactions \
  -H "Content-Type: application/json" \
  -H "X-User-Id: 11111111-1111-1111-1111-111111111111" \
  -d "{\"amount\": 500, \"type\": \"EXPENSE\", \"description\": \"Кофе\"}"
```

Голосовой эндпоинт без поднятого ML-сервиса сохранит запись со статусом `FAILED` (это ожидаемо).

## Сборка и запуск (Docker образа сервиса)

```bash
# Локально (бинарник)
go build -o collection ./cmd/collection
./collection

# Docker-образ сервиса
docker build -t finapp-collection .
docker run -p 8080:8080 -e DATABASE_DSN=postgres://finapp:finapp@host.docker.internal:5432/finapp?sslmode=disable finapp-collection
```

## Структура

```
collection/
├── cmd/collection/main.go      # точка входа, роутер, DI
├── internal/
│   ├── config/                 # конфигурация из env
│   ├── handler/                # HTTP-обработчики
│   ├── middleware/             # JWT auth
│   ├── model/                  # DTO и доменные модели
│   ├── repository/             # работа с БД (transactions, imports, voice_transcriptions)
│   └── service/                # бизнес-логика
├── go.mod
├── Dockerfile
└── README.md
```

## Зависимости

- **PostgreSQL** — таблицы `transactions`, `imports`, `voice_transcriptions` (схема в `infrastructure/Схема базы данных.txt`)
- **ML-сервис** — для голоса вызывается `POST {ML_SERVICE_URL}/transcribe` (тело — аудио, ответ — `{ "text": "...", "entities": {...} }`)

## Примеры запросов

**Ручная транзакция (JSON):**
```json
POST /api/v1/transactions
{ "amount": 1500, "type": "EXPENSE", "description": "Обед", "date": "2025-02-08" }
```

**Импорт:** `POST /api/v1/import` с `multipart/form-data`, поле `file` — CSV или .xlsx. Ожидаемые колонки: дата, сумма, тип (опционально), описание (опционально). Разделитель CSV — `;`.

**Голос:** `POST /api/v1/voice/upload` с `multipart/form-data`, поле `file` — аудиофайл. Опционально `audio_url`.
