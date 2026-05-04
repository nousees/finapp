# FinApp ml-service

`ml-service` belongs to FinApp Module 1: collection and processing of financial data. It does not store transactions and does not manage budgets, goals, reports, or user analytics. The service accepts voice/text transaction data, runs ML/fallback processing, and returns stable JSON contracts for Go services `collection` and `processing`.

## Endpoints

- `GET /health`
- `POST /api/v1/voice/transcribe`
- `POST /api/v1/ner/extract`
- `POST /api/v1/categorize`
- `POST /api/v1/enrich`

## Configuration

```env
APP_ENV=local
APP_VERSION=1.0.0
LOG_LEVEL=INFO
MAX_AUDIO_SIZE_MB=25
ENABLE_REAL_MODELS=false
TEST_MODE=true
WHISPER_MODEL_PATH=/models/whisper-large-v3
NER_MODEL_PATH=/models/rubert-tiny-ner
CATEGORY_MODEL_PATH=/models/category-ensemble
REDIS_URL=redis://redis:6379/0
DATABASE_URL=postgresql://finapp:finapp@postgres:5432/finapp
```

When `ENABLE_REAL_MODELS=false`, the service uses deterministic fallbacks:

- voice transcription returns demo Russian transaction text when `TEST_MODE=true`;
- NER extracts amount, currency, date, merchant, and operation type heuristically;
- categorization uses rules for groceries, transport, subscriptions, health, restaurants, salary, and other.

## Local Run

```bash
cd services/ml-service
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

On Windows PowerShell:

```powershell
cd services/ml-service
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Docker

```bash
docker compose up --build ml-service
```

The service is available at `http://localhost:8000`.

## Curl Examples

Health:

```bash
curl http://localhost:8000/health
```

Voice transcription:

```bash
curl -X POST http://localhost:8000/api/v1/voice/transcribe \
  -F "file=@sample.wav"
```

NER:

```bash
curl -X POST http://localhost:8000/api/v1/ner/extract \
  -H "Content-Type: application/json" \
  -d '{"text":"потратил 450 рублей на продукты в пятерочке вчера"}'
```

Categorization:

```bash
curl -X POST http://localhost:8000/api/v1/categorize \
  -H "Content-Type: application/json" \
  -d '{"description":"пятерочка продукты","amount":450,"merchant":"Пятерочка","operation_type":"expense"}'
```

Full enrichment:

```bash
curl -X POST http://localhost:8000/api/v1/enrich \
  -H "Content-Type: application/json" \
  -d '{"text":"потратил 450 рублей на продукты в пятерочке вчера"}'
```

## Tests

```bash
cd services/ml-service
pytest
```

## Integration Notes For Go Services

- Send `X-Request-ID` or `X-Correlation-ID`; the same ID is returned in the response header and included in structured logs.
- Treat `needs_review=true` from `/api/v1/enrich` as a signal to ask the user to confirm or edit extracted fields.
- Persist transactions only in Go services. `ml-service` returns processing results only.
