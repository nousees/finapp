from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any


class CatBoostCategoryEngine:
    def __init__(self, model_file: Path) -> None:
        from catboost import CatBoostClassifier

        self.model = CatBoostClassifier()
        self.model.load_model(str(model_file))
        self.categories = [str(category) for category in self.model.classes_]

    def predict_category(self, transaction: dict[str, Any]) -> dict[str, Any]:
        import pandas as pd

        row = pd.DataFrame([{
            "amount": float(transaction.get("amount", 0) or 0),
            "description": str(transaction.get("description", "") or "").lower(),
            "merchant": str(transaction.get("merchant", "") or "").lower(),
        }])

        raw_prediction = self.model.predict(row)
        prediction = str(raw_prediction[0][0] if getattr(raw_prediction, "ndim", 1) > 1 else raw_prediction[0])
        probabilities = self.model.predict_proba(row)[0]
        confidence = float(max(probabilities)) if len(probabilities) else 0.0

        return {
            "category": prediction,
            "confidence": round(confidence, 3),
            "probabilities": {
                category: round(float(probability), 3)
                for category, probability in zip(self.categories, probabilities)
            },
        }


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
        catboost_model = path / "catboost_finapp.cbm"
        if catboost_model.exists():
            try:
                engine = CatBoostCategoryEngine(catboost_model)
                return CategoryModel(version="catboost-finapp-v2", real=True, engine=engine)
            except Exception:
                # Fall back to the legacy model/rules if CatBoost is not
                # installed or the artifact is incompatible with this runtime.
                pass

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

