from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DATASET = ROOT / "tests/quality_gates/fixtures/recommendations_eval_sample.json"
GENERIC_TITLES = {"recommendation", "tip", "save money", "review expenses"}


def main() -> None:
    parser = argparse.ArgumentParser(description="FinApp recommendation sanity quality gate")
    parser.add_argument("--dataset", type=Path, default=DEFAULT_DATASET)
    parser.add_argument("--min-types", type=int, default=2)
    args = parser.parse_args()

    rows = json.loads(args.dataset.read_text(encoding="utf-8"))
    if not rows:
        raise SystemExit("recommendation eval dataset is empty")

    failures: list[str] = []
    titles: set[str] = set()
    types: set[str] = set()
    for index, item in enumerate(rows, start=1):
        title = str(item.get("title", "")).strip()
        description = str(item.get("description", "")).strip()
        rec_type = str(item.get("type", "")).strip()
        action_items = item.get("actionItems") or item.get("action_items")

        if not rec_type:
            failures.append(f"#{index}: missing type")
        if not title:
            failures.append(f"#{index}: missing title")
        if not description or len(description) < 20:
            failures.append(f"#{index}: description is too short")
        if not isinstance(action_items, list) or len(action_items) < 2:
            failures.append(f"#{index}: actionItems must contain at least two actions")
        if title.lower() in GENERIC_TITLES:
            failures.append(f"#{index}: generic title '{title}'")
        if title in titles:
            failures.append(f"#{index}: duplicate title '{title}'")

        titles.add(title)
        types.add(rec_type)

    if len(types) < args.min_types:
        failures.append(f"recommendation type diversity {len(types)} < {args.min_types}")

    metrics = {
        "recommendations": len(rows),
        "types": sorted(types),
        "unique_titles": len(titles),
    }
    print(json.dumps(metrics, indent=2, sort_keys=True))

    if failures:
        print("recommendation-quality: FAIL: " + "; ".join(failures), file=sys.stderr)
        raise SystemExit(1)


if __name__ == "__main__":
    main()
