FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    APP_ENV=local \
    APP_VERSION=1.0.0 \
    ENABLE_REAL_MODELS=false

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

ARG INSTALL_REAL_MODEL_DEPS=false
COPY requirements.txt requirements-real.txt ./
RUN pip install --no-cache-dir --upgrade "pip<26" "setuptools<81" wheel \
    && pip install --no-cache-dir --no-build-isolation -r requirements.txt \
    && if [ "$INSTALL_REAL_MODEL_DEPS" = "true" ]; then pip install --no-cache-dir --no-build-isolation -r requirements-real.txt; fi

COPY app ./app
COPY main.py ./main.py
COPY ml_models.py ./ml_models.py

EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --retries=5 CMD curl -fsS http://localhost:8000/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
