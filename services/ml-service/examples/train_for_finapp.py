"""Dataset-aware training bootstrap for FinApp ML models."""
from __future__ import annotations

import csv
import importlib.util
import json
import argparse
from pathlib import Path
from typing import Any

BASE_DIR = Path(__file__).resolve().parents[1]
DEFAULT_DATASET = BASE_DIR / "training_data" / "finapp_transactions_training_v2.csv"
LEGACY_CSV_DATASET = BASE_DIR / "final_shuffled_transactions_dataset.csv"
DEFAULT_JSON_DATASET = BASE_DIR / "financial_dataset.json"
MODELS_DIR = BASE_DIR / "ml_models"


def _normalize_row(row: dict[str, Any]) -> dict[str, Any]:
    text = row.get("text") or row.get("\ufefftext") or row.get("description") or ""
    category = row.get("category_code") or row.get("category") or "other"
    merchant = row.get("merchant") or "unknown"
    amount = float(row.get("amount") or 0)
    operation_type = row.get("operation_type") or row.get("type") or "EXPENSE"
    is_subscription = str(row.get("is_subscription") or "0").strip().lower() in {"1", "true", "yes"}
    return {
        "text": text.strip(),
        "amount": amount,
        "merchant": merchant.strip(),
        "category": str(category).strip(),
        "operation_type": str(operation_type).strip().upper(),
        "is_subscription": is_subscription,
    }


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


def _has_bert_training_deps() -> tuple[bool, str]:
    if importlib.util.find_spec("torch") is None:
        return False, "Missing dependency: torch"
    if importlib.util.find_spec("accelerate") is None:
        return False, "Missing dependency: accelerate>=1.1.0"
    if importlib.util.find_spec("transformers") is None:
        return False, "Missing dependency: transformers"
    if importlib.util.find_spec("datasets") is None:
        return False, "Missing dependency: datasets"
    return True, "ok"


def _has_catboost_training_deps() -> tuple[bool, str]:
    if importlib.util.find_spec("catboost") is None:
        return False, "Missing dependency: catboost"
    return True, "ok"


def train_catboost_for_finapp(rows: list[dict[str, Any]], model_path: Path) -> None:
    ok, reason = _has_catboost_training_deps()
    if not ok:
        raise RuntimeError(
            f"{reason}. Install training dependencies first: "
            "python -m pip install -r requirements-training.txt"
        )

    import pandas as pd
    from model_recipes import train_catboost_categorizer

    df = pd.DataFrame(rows)
    model_path.parent.mkdir(parents=True, exist_ok=True)
    train_catboost_categorizer(df=df.rename(columns={"text": "description"}), model_path=str(model_path))


def train_bert_for_finapp(rows: list[dict[str, Any]], out_dir: Path) -> None:
    ok, reason = _has_bert_training_deps()
    if not ok:
        print(f"[WARN] Skip BERT training: {reason}")
        print("[WARN] Install with: pip install \"transformers[torch]\" \"accelerate>=1.1.0\"")
        return

    import pandas as pd
    from model_recipes import fine_tune_bert_classifier

    df = pd.DataFrame({"text": [r["text"] for r in rows], "label": [r["category"] for r in rows]})
    out_dir.mkdir(parents=True, exist_ok=True)
    fine_tune_bert_classifier(df, str(out_dir))


def print_dataset_report(rows: list[dict[str, Any]]) -> None:
    from collections import Counter

    cnt = Counter(r["category"] for r in rows)
    by_type = Counter(r["operation_type"] for r in rows)
    subscription_rows = sum(1 for r in rows if r["is_subscription"])
    print(f"rows={len(rows)} categories={len(cnt)} subscription_rows={subscription_rows}")
    print(f"operation_types={dict(sorted(by_type.items()))}")
    for name, value in cnt.most_common(10):
        print(f"  {name}: {value}")


def resolve_dataset(explicit_path: str | None) -> Path:
    if explicit_path:
        return Path(explicit_path).resolve()
    return next(path for path in (DEFAULT_DATASET, LEGACY_CSV_DATASET, DEFAULT_JSON_DATASET) if path.exists())


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train FinApp transaction categorization models.")
    parser.add_argument("--dataset", help="Path to CSV or JSON dataset. Defaults to training_data/finapp_transactions_training_v2.csv.")
    parser.add_argument("--report-only", action="store_true", help="Only validate and print dataset coverage.")
    parser.add_argument("--skip-bert", action="store_true", help="Train CatBoost only and skip the heavier BERT fine-tuning step.")
    args = parser.parse_args()

    dataset = resolve_dataset(args.dataset)
    print(f"dataset={dataset}")
    rows = load_transactions(dataset)
    print_dataset_report(rows)
    if args.report_only:
        raise SystemExit(0)
    train_catboost_for_finapp(rows, MODELS_DIR / "catboost_finapp.cbm")
    if not args.skip_bert:
        train_bert_for_finapp(rows, MODELS_DIR / "bert_finapp")
    print("Training finished.")
