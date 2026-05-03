FROM python:3.11-slim

WORKDIR /app

# Устанавливаем системные зависимости и обновляем pip
RUN apt-get update && apt-get install -y gcc g++ && \
    pip install --upgrade pip setuptools wheel

# Устанавливаем зависимости
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Копируем исходный код
COPY . .

# Создаем директорию для логов
RUN mkdir -p /app/logs

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]