# FinApp ML training data

This folder contains the curated v2 dataset for FinApp transaction categorization and subscription detection.

## Files

- `finapp_transactions_training_v2.csv` - main supervised training table.
- `finapp_transactions_training_v2.jsonl` - the same rows in JSONL format for model experiments.
- `finapp_transactions_training_v2_report.json` - generated coverage report.

## Schema

- `text` / `description` - voice/manual/import transaction text.
- `amount`, `currency`, `date`, `merchant` - normalized transaction fields.
- `category_code` - canonical FinApp category code used by mobile and backend.
- `category` - duplicate of `category_code` for backward-compatible training scripts.
- `operation_type` - `EXPENSE`, `INCOME`, or `TRANSFER`.
- `is_subscription` - `1` for positive subscription examples, `0` otherwise.
- `source` - synthetic source type: `voice`, `manual`, `csv`, `hard_case`, `subscription_sequence`, `hard_negative`.
- `scenario` - why the row exists: core category, ambiguous prefix, positive recurring, or negative recurring.

## Regenerate

```bash
cd services/ml-service
python examples/generate_finapp_training_dataset.py
python examples/train_for_finapp.py --report-only
```

## Train

```bash
cd services/ml-service
python -m pip install -r requirements-training.txt
python examples/train_for_finapp.py --skip-bert
```

Full CatBoost + BERT training:

```bash
cd services/ml-service
python -m pip install -r requirements-training.txt
python examples/train_for_finapp.py
```

The dataset intentionally includes difficult Russian-language cases: generic bank descriptions, voice phrases, repeated non-subscription purchases, and real subscription-like monthly sequences.
