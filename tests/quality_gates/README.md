# FinApp quality gates

These checks are intentionally lightweight and deterministic, so they can run on every pull request.

## Gates

- `check_category_registry.py` verifies that category codes are consistent across the shared registry, mobile app, ML service and Java bootstrap.
- `eval_ml_quality.py` calculates WER, category top-1 accuracy and fallback-rate from anonymized voice/transaction examples.
- `eval_subscriptions.py` calculates precision, recall and F1 for subscription detection scenarios.
- `eval_recommendations.py` performs sanity checks for recommendation quality and diversity.

## Real evaluation datasets

For diploma and release validation, replace the small fixtures in `fixtures/` with 300-1000 anonymized examples:

- voice rows: `reference_text`, `predicted_text`, `expected_category_code`, `predicted_category_code`, `used_fallback`;
- transaction rows: `text`, `expected_category_code`, `predicted_category_code`, `used_fallback`;
- subscription rows: `expected_is_subscription` plus dated transaction sequences;
- recommendation rows: `type`, `title`, `description`, `actionItems`, `estimatedSavings`, `priority`.

Do not commit raw audio, personal names, card numbers, account numbers or exact merchant receipts. Keep only anonymized text and labels, or store raw artifacts outside Git.
