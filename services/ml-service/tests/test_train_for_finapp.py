from pathlib import Path

from examples.train_for_finapp import load_transactions


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
