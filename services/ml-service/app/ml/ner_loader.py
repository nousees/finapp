from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass
class NERModel:
    version: str
    real: bool = False
    pipeline: Any | None = None

    def extract_entities(self, text: str) -> dict[str, str]:
        if not self.real or self.pipeline is None:
            return {}

        try:
            entities = self.pipeline(text)
        except Exception:
            return {}
        grouped: dict[str, list[str]] = {}
        for entity in entities:
            label = str(entity.get("entity_group") or entity.get("entity") or "")
            label = label.replace("B-", "").replace("I-", "")
            word = str(entity.get("word") or "").replace("##", "").strip()
            if not label or label == "O" or not word:
                continue
            grouped.setdefault(label, []).append(word)

        return {
            "amount": " ".join(grouped.get("AMOUNT", [])).strip(),
            "currency": " ".join(grouped.get("CURRENCY", [])).strip(),
            "merchant": " ".join(grouped.get("MERCHANT", [])).strip(),
        }


def load_ner_model(enable_real_models: bool, model_path: str) -> NERModel:
    if enable_real_models:
        path = Path(model_path)
        try:
            from transformers import pipeline

            if path.exists():
                ner_pipeline = pipeline(
                    "token-classification",
                    model=str(path),
                    tokenizer=str(path),
                    aggregation_strategy="simple",
                )
                return NERModel(version="rubert-tiny-ner-v1", real=True, pipeline=ner_pipeline)
        except Exception:
            pass

    return NERModel(version="rubert-tiny-ner-v1" if enable_real_models else "heuristic-ner-v1", real=False)

