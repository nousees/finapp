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

## Model Recipes (Whisper, RuBERT-tiny NER, CatBoost, BERT)

Practical code examples are in `examples/model_recipes.py`:

- `transcribe_audio_whisper(audio_path)` — transcribes MP3/WAV with Whisper.
- `fine_tune_rubert_tiny_ner(train_df, output_dir)` — fine-tunes token classification model for transaction entities.
- `train_catboost_categorizer(df, model_path)` — trains CatBoost on `amount + description + merchant`.
- `fine_tune_bert_classifier(df, output_dir)` and `bert_predict` — fine-tunes and serves BERT category classifier.

### Minimal Whisper usage

```python
from examples.model_recipes import transcribe_audio_whisper

text = transcribe_audio_whisper("samples/transaction.wav", model_name="small")
print(text)
```

### Minimal RuBERT-tiny NER fine-tuning dataset format

`train_df` must contain:
- `tokens`: list[str]
- `ner_tags`: list[str] with BIO labels (for example `B-AMOUNT`, `B-MERCHANT`, `O`).

### Minimal CatBoost dataset format

`df` columns:
- `amount` (numeric)
- `description` (string)
- `merchant` (string)
- `category` (target string)

### Minimal BERT classifier dataset format

`df` columns:
- `text` (transaction description text)
- `label` (target category)

## Deployment with Docker / Docker Compose

Build and run model-oriented profile:

```bash
cd services/ml-service
docker compose -f docker-compose.models.yml up --build
```

Services:
- `whisper-service` on `localhost:8011`
- `ner-service` on `localhost:8012`
- `catboost-service` on `localhost:8013`
- `bert-classifier-service` on `localhost:8014`

Single image build command:

```bash
docker build -f Dockerfile.models -t finapp-ml-models:latest .
```

## Test Coverage Notes

Current tests already validate:
- Whisper-like voice endpoint behavior and format validation (`tests/test_voice.py`)
- NER entity extraction (`tests/test_ner.py`)
- Categorization (`tests/test_categorize.py`)
- End-to-end enrichment integration (`tests/test_enrich.py`)

Run:

```bash
cd services/ml-service
pytest
```

## Performance Improvements (Production Recommendations)

1. Whisper:
   - Use `small`/`base` model for low-latency paths and batch offline processing for `medium/large`.
   - Convert to CTranslate2/faster-whisper for CPU inference speed-up.
   - Pre-resample audio to 16kHz mono once in ingestion pipeline.

2. RuBERT-tiny NER:
   - Export to ONNX + int8 quantization.
   - Batch short texts (dynamic padding) to reduce GPU underutilization.
   - Cache tokenizer outputs for repeated merchant patterns.

3. CatBoost:
   - Use `model.shrink()`/feature pruning and lower tree depth for low-latency SLA.
   - Precompute text normalization features in upstream service.
   - Retrain with class weights to reduce overfitting and ensemble size.

4. BERT classifier:
   - Distill into smaller student model for online inference.
   - Use mixed precision (`fp16`/`bf16`) and ONNX Runtime/TensorRT.
   - Keep max sequence length at 64-128 for transaction texts.

5. Infra/common:
   - Warm model weights on startup + healthcheck that confirms model ready.
   - Isolate heavy models into separate autoscaled services.
   - Use async request queue for burst smoothing (Redis/RabbitMQ + worker pool).

## Важно: подходят ли модели под ваш датасет?

Короткий ответ: **предыдущие примеры были общими**, не полностью адаптированными под текущий датасет FinApp.

Что исправлено:
- Добавлен скрипт `examples/train_for_finapp.py`, который читает **ваши реальные файлы**:
  - `final_shuffled_transactions_dataset.csv`
  - `financial_dataset.json`
- Скрипт учитывает BOM-поле `\ufefftext`, приводит колонки к единому формату `text/amount/merchant/category` и запускает обучение CatBoost + BERT на ваших данных.

Запуск:

```bash
cd services/ml-service
python examples/train_for_finapp.py
```

После обучения артефакты будут сохранены в `ml_models/`.

### Что по каждой модели в контексте вашего проекта

- **Whisper**: дообучение обычно не требуется, используется готовая модель для ASR; для вашего проекта важнее выбрать размер модели (`base/small`) и настроить предобработку аудио.
- **RuBERT-tiny NER**: для полноценного дообучения нужен размеченный NER-корпус в BIO-формате (`tokens`, `ner_tags`). Ваш текущий транзакционный датасет подходит для классификации, но **не содержит готовой BIO-разметки**.
- **CatBoost**: ваш датасет подходит напрямую (есть `amount`, `merchant`, `text`, `category`).
- **BERT classifier**: ваш датасет подходит напрямую (`text` + `category`).

### Проверка корректности настройки под проект

1. Проверить, что сервис запускается в fallback и real-model режимах.
2. Для real-model режима указать пути:
   - `WHISPER_MODEL_PATH`
   - `NER_MODEL_PATH`
   - `CATEGORY_MODEL_PATH`
3. Переобученные модели из `ml_models/` подключить в загрузчиках `app/ml/*_loader.py` (если хотите, в следующем шаге могу сразу внести wiring в код сервиса).
