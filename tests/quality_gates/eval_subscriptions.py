from __future__ import annotations

import argparse
import json
import sys
from datetime import date
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DATASET = ROOT / "tests/quality_gates/fixtures/subscription_eval_sample.json"


def parse_date(value: str) -> date:
    return date.fromisoformat(value)


def predict_subscription(transactions: list[dict]) -> bool:
    if len(transactions) < 3:
        return False

    ordered = sorted(transactions, key=lambda item: parse_date(item["date"]))
    amounts = [float(item["amount"]) for item in ordered]
    avg_amount = sum(amounts) / len(amounts)
    if avg_amount <= 0:
        return False

    max_deviation = max(abs(amount - avg_amount) / avg_amount for amount in amounts)
    if max_deviation > 0.12:
        return False

    intervals = [
        (parse_date(right["date"]) - parse_date(left["date"])).days
        for left, right in zip(ordered, ordered[1:])
    ]
    if not intervals:
        return False

    monthly_like = all(26 <= interval <= 35 for interval in intervals)
    weekly_like = all(6 <= interval <= 8 for interval in intervals)
    return monthly_like or weekly_like


def f1_score(tp: int, fp: int, fn: int) -> float:
    precision = tp / (tp + fp) if tp + fp else 0.0
    recall = tp / (tp + fn) if tp + fn else 0.0
    if precision + recall == 0:
        return 0.0
    return 2 * precision * recall / (precision + recall)


def main() -> None:
    parser = argparse.ArgumentParser(description="FinApp subscription precision/recall gate")
    parser.add_argument("--dataset", type=Path, default=DEFAULT_DATASET)
    parser.add_argument("--min-f1", type=float, default=0.75)
    args = parser.parse_args()

    rows = json.loads(args.dataset.read_text(encoding="utf-8"))
    if not rows:
        raise SystemExit("subscription eval dataset is empty")

    tp = fp = tn = fn = 0
    for row in rows:
        expected = bool(row["expected_is_subscription"])
        predicted = predict_subscription(row.get("transactions", []))
        if expected and predicted:
            tp += 1
        elif expected and not predicted:
            fn += 1
        elif not expected and predicted:
            fp += 1
        else:
            tn += 1

    precision = tp / (tp + fp) if tp + fp else 0.0
    recall = tp / (tp + fn) if tp + fn else 0.0
    f1 = f1_score(tp, fp, fn)
    metrics = {
        "examples": len(rows),
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1": round(f1, 4),
        "tp": tp,
        "fp": fp,
        "tn": tn,
        "fn": fn,
    }
    print(json.dumps(metrics, indent=2, sort_keys=True))

    if f1 < args.min_f1:
        print(f"subscription-quality: FAIL: f1 {f1:.4f} < {args.min_f1}", file=sys.stderr)
        raise SystemExit(1)


if __name__ == "__main__":
    main()
