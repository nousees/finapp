from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
DEFAULT_VOICE = ROOT / "tests/quality_gates/fixtures/voice_eval_sample.jsonl"
DEFAULT_TX = ROOT / "tests/quality_gates/fixtures/transaction_eval_sample.jsonl"


def read_jsonl(path: Path) -> list[dict]:
    rows: list[dict] = []
    for line_number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        if line.strip():
            try:
                rows.append(json.loads(line))
            except json.JSONDecodeError as exc:
                raise SystemExit(f"{path}:{line_number}: invalid jsonl: {exc}") from exc
    return rows


def edit_distance(left: list[str], right: list[str]) -> int:
    previous = list(range(len(right) + 1))
    for i, left_token in enumerate(left, start=1):
        current = [i]
        for j, right_token in enumerate(right, start=1):
            current.append(
                min(
                    previous[j] + 1,
                    current[j - 1] + 1,
                    previous[j - 1] + (0 if left_token == right_token else 1),
                )
            )
        previous = current
    return previous[-1]


def wer(reference: str, prediction: str) -> float:
    reference_tokens = reference.lower().split()
    prediction_tokens = prediction.lower().split()
    if not reference_tokens:
        return 0.0 if not prediction_tokens else 1.0
    return edit_distance(reference_tokens, prediction_tokens) / len(reference_tokens)


def main() -> None:
    parser = argparse.ArgumentParser(description="FinApp dataset-driven ML quality gate")
    parser.add_argument("--voice", type=Path, default=DEFAULT_VOICE)
    parser.add_argument("--transactions", type=Path, default=DEFAULT_TX)
    parser.add_argument("--max-wer", type=float, default=0.35)
    parser.add_argument("--min-category-top1", type=float, default=0.80)
    parser.add_argument("--max-fallback-rate", type=float, default=0.25)
    args = parser.parse_args()

    voice_rows = read_jsonl(args.voice)
    tx_rows = read_jsonl(args.transactions)
    if not voice_rows:
        raise SystemExit("voice eval dataset is empty")
    if not tx_rows:
        raise SystemExit("transaction eval dataset is empty")

    voice_wer_values = [
        wer(row.get("reference_text", ""), row.get("predicted_text", ""))
        for row in voice_rows
    ]
    category_rows = [
        row for row in [*voice_rows, *tx_rows]
        if row.get("expected_category_code") and row.get("predicted_category_code")
    ]
    category_top1 = sum(
        1 for row in category_rows
        if row["expected_category_code"] == row["predicted_category_code"]
    ) / len(category_rows)
    fallback_rate = sum(
        1 for row in [*voice_rows, *tx_rows]
        if bool(row.get("used_fallback"))
    ) / (len(voice_rows) + len(tx_rows))

    metrics = {
        "voice_examples": len(voice_rows),
        "transaction_examples": len(tx_rows),
        "wer": round(sum(voice_wer_values) / len(voice_wer_values), 4),
        "category_top1": round(category_top1, 4),
        "fallback_rate": round(fallback_rate, 4),
    }
    print(json.dumps(metrics, indent=2, sort_keys=True))

    failures: list[str] = []
    if metrics["wer"] > args.max_wer:
        failures.append(f"WER {metrics['wer']} > {args.max_wer}")
    if metrics["category_top1"] < args.min_category_top1:
        failures.append(f"category_top1 {metrics['category_top1']} < {args.min_category_top1}")
    if metrics["fallback_rate"] > args.max_fallback_rate:
        failures.append(f"fallback_rate {metrics['fallback_rate']} > {args.max_fallback_rate}")
    if failures:
        print("ml-quality: FAIL: " + "; ".join(failures), file=sys.stderr)
        raise SystemExit(1)


if __name__ == "__main__":
    main()
