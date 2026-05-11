from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass
class CategoryModel:
    version: str
    real: bool = False
    engine: Any | None = None

    def predict(self, transaction: dict[str, Any]) -> dict[str, Any] | None:
        if not self.real or self.engine is None:
            return None
        try:
            return self.engine.predict_category(transaction)
        except Exception:
            return None


def load_category_model(enable_real_models: bool, model_path: str) -> CategoryModel:
    if enable_real_models:
        path = Path(model_path)
        try:
            from ml_models import FinancialMLModels

            if path.exists():
                engine = FinancialMLModels()
                engine.load_models(str(path))
                if engine.category_classifier is not None:
                    return CategoryModel(version="catboost-cnn-ensemble-v1", real=True, engine=engine)
        except Exception:
            # The API must stay available even when optional ML artifacts or
            # dependencies are absent in a local/student environment.
            pass

    return CategoryModel(
        version="catboost-cnn-ensemble-v1" if enable_real_models else "catboost-cnn-ensemble-v1",
        real=False,
    )

