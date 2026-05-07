# FinApp: Полная инструкция по запуску

Этот документ описывает рекомендуемый запуск всего проекта: backend, ML, gateway, PostgreSQL, Redis и мобильного клиента через Expo Go.

## Что входит в проект

- `apps/mobile` - React Native / Expo клиент
- `services/gateway` - единая точка входа `http://<host>:8080`
- `services/data-processing/auth-service` - авторизация
- `services/data-processing/collection` - транзакции, импорт, голосовой ввод
- `services/data-processing/processing` - обработка и категоризация транзакций
- `services/data-processing/subscription-detector` - анализ подписок
- `services/analysis-control` - бюджеты, цели, отчеты, уведомления
- `services/ml-service` - NER, категоризация, обогащение транзакций и аналитический ML-слой
- `postgres` - основная база данных
- `redis` - кеш и вспомогательное хранилище

## Рекомендуемый способ запуска

Лучший сценарий для локальной разработки:

1. Поднять весь backend через Docker Compose.
2. Запустить мобильный клиент локально через Expo Go.
3. Подключать телефон к тому же Wi-Fi, что и компьютер.

Такой вариант ближе всего к реальному пользовательскому сценарию и требует меньше ручной настройки.

## Что нужно установить

Минимально:

- Docker Desktop с Docker Compose v2
- Node.js 20+ и `npm`
- Expo Go на телефоне

Для ручного запуска отдельных сервисов дополнительно:

- Go 1.22+
- Java 17
- Python 3.11+

## Вариант 1. Полный запуск через Docker

### 1. Перейти в корень проекта

```powershell
cd C:\Users\Денис\Desktop\finapp_diplom\finapp
```

### 2. Поднять весь стек

```powershell
docker compose up -d --build
```

### 3. Проверить, что контейнеры поднялись

```powershell
docker compose ps
```

Если какой-то сервис не стал `healthy`, посмотри логи:

```powershell
docker compose logs -f --tail=200
```

### 4. Основные адреса сервисов

- Gateway: `http://localhost:8080`
- Auth: `http://localhost:8082`
- Collection: `http://localhost:8086`
- Processing: `http://localhost:8081`
- Subscription detector: `http://localhost:8083`
- Analysis control: `http://localhost:8084`
- ML service: `http://localhost:8000`
- PostgreSQL: `localhost:5433`
- Redis: `localhost:6379`

### 5. Быстрая проверка здоровья

```powershell
curl http://localhost:8080/health
curl http://localhost:8000/health
curl http://localhost:8084/api/test/health
```

Если ответы приходят, backend готов.

## Вариант 2. Мобильный клиент через Expo Go

Это основной способ для фронтенда, если ты запускаешь приложение на телефоне.

### 1. Узнать IP-адрес компьютера в локальной сети

На Windows:

```powershell
ipconfig
```

Нужен IPv4-адрес твоего компьютера в текущем Wi-Fi, например `192.168.0.15`.

### 2. Настроить API host для Expo

Открой `apps/mobile/.env.local` и укажи:

```env
EXPO_PUBLIC_API_HOST=192.168.0.15
```

Подставь свой реальный IP.

Важно:

- телефон и компьютер должны быть в одной сети;
- для Expo Go нельзя использовать `localhost`, потому что для телефона это будет сам телефон, а не твой ПК.

### 3. Установить зависимости фронтенда

```powershell
cd apps/mobile
npm install
```

### 4. Запустить Expo

```powershell
npx expo start
```

После этого:

- открой Expo Go на телефоне;
- отсканируй QR-код;
- дождись загрузки приложения.

### 5. Если LAN-режим не сработал

Попробуй tunnel-режим:

```powershell
npx expo start --tunnel
```

## Как приложение обращается к backend

Для мобильного клиента лучше использовать gateway:

- все основные пользовательские запросы идут через `http://<IP_КОМПЬЮТЕРА>:8080`

Актуальная маршрутизация:

- `/api/v1/auth/*` -> `auth`
- `/api/v1/transactions/*` -> `collection`
- `/api/v1/imports/*` -> `collection`
- `/api/v1/voice/*` -> `ml-service`
- `/api/v1/ner/*` -> `ml-service`
- `/api/v1/categorize/*` -> `ml-service`
- `/api/v1/enrich/*` -> `ml-service`
- `/api/v1/process/*` -> `processing`
- `/api/v1/subscriptions/*` -> `subscription-detector`
- `/api/v1/budgets/*` -> `analysis-control`
- `/api/v1/goals/*` -> `analysis-control`
- `/api/v1/reports/*` -> `analysis-control`
- `/api/v1/notifications/*` -> `analysis-control`
- `/api/v1/recommendations/*` -> `analysis-control`

## Тестовый пользователь

Если используется тестовый сценарий из локальной БД:

- email: `test@finapp.local`
- password: `test`

## Что важно знать про мобильный клиент

Сейчас `apps/mobile` уже можно запускать и использовать как фронтенд-оболочку, но в проекте есть смешанное состояние:

- часть экранов уже работает через реальные API-конфиги;
- часть логики пока остается заготовкой или UI-stub;
- некоторые сценарии могут быть не полностью доведены до production-уровня.

Чтобы Expo Go работал стабильнее, все базовые API-клиенты должны использовать `EXPO_PUBLIC_API_HOST`, а не `localhost`.

## Ручной запуск без полного Docker Compose

Если нужно запускать сервисы по отдельности для отладки.

### Инфраструктура

Сначала подними PostgreSQL и Redis:

```powershell
docker compose up -d postgres redis
```

### Auth service

```powershell
cd services/data-processing/auth-service
go run .
```

### Collection service

```powershell
cd services/data-processing/collection
go run ./cmd/collection
```

### Processing service

```powershell
cd services/data-processing/processing
go run .
```

### Subscription detector

```powershell
cd services/data-processing/subscription-detector
go run .
```

### Analysis control

Через Maven Wrapper:

```powershell
cd services/analysis-control
.\mvnw.cmd spring-boot:run
```

### ML service

```powershell
cd services/ml-service
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Gateway

Для полного пользовательского сценария gateway тоже должен быть поднят. Самый простой вариант - запускать его через Docker Compose вместе с остальными сервисами.

## Полезные команды

### Перезапуск всего стека

```powershell
docker compose down
docker compose up -d --build
```

### Полная очистка контейнеров и базы

```powershell
docker compose down -v --remove-orphans
```

Используй эту команду только если действительно хочешь сбросить локальные данные PostgreSQL.

### Просмотр логов одного сервиса

```powershell
docker compose logs -f gateway
docker compose logs -f ml-service
docker compose logs -f analysis-control
```

## Частые проблемы

### Телефон не может подключиться к API

Проверь:

- в `apps/mobile/.env.local` указан IP компьютера, а не `localhost`;
- backend поднят;
- телефон и компьютер в одной сети;
- Windows Firewall не блокирует входящие подключения к портам `8080`, `8082`, `8081`, `8083`, `8084`, `8000`.

### Открывается Expo, но запросы падают

Проверь:

- отвечает ли `http://<IP_КОМПЬЮТЕРА>:8080/health`;
- правильно ли заполнен `EXPO_PUBLIC_API_HOST`;
- не закешировал ли Expo старую конфигурацию.

Иногда помогает:

```powershell
npx expo start --clear
```

### Не поднимается analysis-control

Проверь:

- доступен ли PostgreSQL;
- свободен ли порт `8084`;
- если запускаешь вручную, используй Java 17.

### Не поднимается ml-service

Проверь:

- установлен ли Python 3.11+;
- установились ли зависимости из `requirements.txt`;
- не занят ли порт `8000`.

## Рекомендуемый ежедневный сценарий

1. В корне проекта выполнить `docker compose up -d --build`.
2. Убедиться, что `gateway`, `ml-service`, `analysis-control`, `postgres` и `redis` healthy.
3. В `apps/mobile/.env.local` указать текущий локальный IP.
4. Запустить `npx expo start`.
5. Открыть приложение через Expo Go.

Это сейчас самый удобный и правильный путь для запуска всего проекта целиком.
