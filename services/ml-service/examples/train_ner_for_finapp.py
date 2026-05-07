from pathlib import Path
import ast

import pandas as pd

from model_recipes import fine_tune_rubert_tiny_ner


BASE = Path(__file__).resolve().parents[1]
DATASET = BASE / "final_shuffled_transactions_dataset_bio.csv"
OUTDIR = BASE / "ml_models" / "rubert_tiny_ner_finapp"


def main() -> None:
    df = pd.read_csv(DATASET, encoding="utf-8-sig")

    # tokens/ner_tags are stored in CSV as Python-like list strings.
    df["tokens"] = df["tokens"].apply(ast.literal_eval)
    df["ner_tags"] = df["ner_tags"].apply(ast.literal_eval)

    bad = df[df.apply(lambda row: len(row["tokens"]) != len(row["ner_tags"]), axis=1)]
    if len(bad) > 0:
        raise ValueError(f"Found rows with tokens/ner_tags length mismatch: {len(bad)}")

    artifacts = fine_tune_rubert_tiny_ner(df[["tokens", "ner_tags"]], str(OUTDIR))
    print("Saved:", artifacts.model_dir)
    print("Labels:", artifacts.label2id)


if __name__ == "__main__":
    main()
