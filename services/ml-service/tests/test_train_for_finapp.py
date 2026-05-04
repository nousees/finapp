from pathlib import Path

from examples.train_for_finapp import _has_bert_training_deps, load_transactions


def test_load_transactions_from_csv_normalizes_columns() -> None:
    rows = load_transactions(Path("final_shuffled_transactions_dataset.csv"))
    assert rows
    sample = rows[0]
    assert "text" in sample and sample["text"]
    assert "amount" in sample
    assert "merchant" in sample
    assert "category" in sample


def test_load_transactions_from_json_normalizes_columns() -> None:
    rows = load_transactions(Path("financial_dataset.json"))
    assert rows
    sample = rows[0]
    assert isinstance(sample["amount"], float)
    assert sample["text"]


def test_has_bert_training_deps_reports_missing(monkeypatch) -> None:
    import importlib.util

    monkeypatch.setattr(importlib.util, "find_spec", lambda name: None if name == "accelerate" else object())
    ok, reason = _has_bert_training_deps()
    assert ok is False
    assert "accelerate" in reason
