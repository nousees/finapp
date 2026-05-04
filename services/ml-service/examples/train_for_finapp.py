"""Dataset-aware training bootstrap for FinApp ML models."""
from __future__ import annotations

import csv
import json
from pathlib import Path
from typing import Any


BASE_DIR = Path(__file__).resolve().parents[1]
DEFAULT_DATASET = BASE_DIR / "final_shuffled_transactions_dataset.csv"
DEFAULT_JSON_DATASET = BASE_DIR / "financial_dataset.json"
MODELS_DIR = BASE_DIR / "ml_models"


def _normalize_row(row: dict[str, Any]) -> dict[str, Any]:
    text = row.get("text") or row.get("\ufefftext") or row.get("description") or ""
    category = row.get("category", "other")
    merchant = row.get("merchant") or "unknown"
    amount = float(row.get("amount") or 0)
    return {"text": text.strip(), "amount": amount, "merchant": merchant.strip(), "category": str(category).strip()}


def load_transactions(dataset_path: Path = DEFAULT_DATASET) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    if dataset_path.suffix == ".csv":
        with open(dataset_path, encoding="utf-8", newline="") as f:
            for row in csv.DictReader(f):
                rows.append(_normalize_row(row))
    elif dataset_path.suffix == ".json":
        payload = json.loads(dataset_path.read_text(encoding="utf-8"))
        for row in payload.get("transactions", payload if isinstance(payload, list) else []):
            rows.append(_normalize_row(row))
    return [r for r in rows if r["text"]]


def train_catboost_for_finapp(rows: list[dict[str, Any]], model_path: Path) -> None:
    import pandas as pd
    from model_recipes import train_catboost_categorizer

    df = pd.DataFrame(rows)
    model_path.parent.mkdir(parents=True, exist_ok=True)
    train_catboost_categorizer(df=df.rename(columns={"text": "description"}), model_path=str(model_path))


def train_bert_for_finapp(rows: list[dict[str, Any]], out_dir: Path) -> None:
    import pandas as pd
    from model_recipes import fine_tune_bert_classifier

    df = pd.DataFrame({"text": [r["text"] for r in rows], "label": [r["category"] for r in rows]})
    out_dir.mkdir(parents=True, exist_ok=True)
    fine_tune_bert_classifier(df, str(out_dir))


def print_dataset_report(rows: list[dict[str, Any]]) -> None:
    from collections import Counter

    cnt = Counter(r["category"] for r in rows)
    print(f"rows={len(rows)} categories={len(cnt)}")
    for name, value in cnt.most_common(10):
        print(f"  {name}: {value}")


if __name__ == "__main__":
    rows = load_transactions(DEFAULT_DATASET if DEFAULT_DATASET.exists() else DEFAULT_JSON_DATASET)
    print_dataset_report(rows)
    train_catboost_for_finapp(rows, MODELS_DIR / "catboost_finapp.cbm")
    train_bert_for_finapp(rows, MODELS_DIR / "bert_finapp")
    print("Training finished.")
