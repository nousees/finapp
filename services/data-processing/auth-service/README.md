# Auth Service (FinApp)

Сервис авторизации для FinApp. Поддерживает регистрацию, вход и обновление access‑токена.

## Эндпоинты

- `POST /sign-up`
- `POST /sign-in`
- `POST /refresh`
- `GET /health`

## Запуск

1. Скопируйте переменные окружения:
```
cp .env.example .env
```

2. Запуск:
```
docker compose up --build
```
