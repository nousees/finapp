from __future__ import annotations

from app.core.config import Settings
from app.ml.category_loader import CategoryModel, load_category_model
from app.schemas.categorize import CategorizeRequest, CategorizeResponse
from app.schemas.common import CategoryAlternative, OperationType
from app.utils.text import normalize_text


CATEGORY_RULES = [
    ("groceries", "Продукты", 0.94, ["пятерочка", "пятёрочка", "магнит", "продукты", "супермаркет"]),
    ("transport", "Транспорт", 0.91, ["такси", "метро", "автобус"]),
    ("subscriptions", "Подписки", 0.9, ["netflix", "spotify", "подписка"]),
    ("health", "Здоровье", 0.89, ["аптека", "лекарства"]),
    ("restaurants", "Кафе и рестораны", 0.88, ["кафе", "ресторан", "кофе"]),
    ("salary", "Зарплата", 0.93, ["зарплата", "аванс"]),
]


class CategorizationService:
    def __init__(self, settings: Settings) -> None:
        self.model: CategoryModel = load_category_model(settings.enable_real_models, settings.category_model_path)

    @property
    def model_version(self) -> str:
        return self.model.version

    def categorize(self, request: CategorizeRequest) -> CategorizeResponse:
        real_prediction = self._predict_with_real_model(request)
        if real_prediction is not None:
            return real_prediction

        text = normalize_text(" ".join(filter(None, [request.description, request.merchant or ""]))).lower()
        for code, name, confidence, keywords in CATEGORY_RULES:
            if any(keyword in text for keyword in keywords):
                return CategorizeResponse(
                    category_code=code,
                    category_name=name,
                    confidence=confidence,
                    model_version=self.model_version,
                    alternatives=self._alternatives(exclude=code),
                )
        return CategorizeResponse(
            category_code="other",
            category_name="Другое",
            confidence=0.55,
            model_version=self.model_version,
            alternatives=self._alternatives(exclude="other"),
        )

    def _predict_with_real_model(self, request: CategorizeRequest) -> CategorizeResponse | None:
        prediction = self.model.predict({
            "amount": request.amount or 0,
            "description": request.description,
            "merchant": request.merchant or "",
            "date": None,
            "type": request.operation_type.value,
        })
        if not prediction or not prediction.get("category") or float(prediction.get("confidence", 0) or 0) <= 0:
            return None

        category_name = str(prediction["category"])
        category_code = self._category_code(category_name)
        probabilities = prediction.get("probabilities") or {}
        alternatives = [
            CategoryAlternative(
                category_code=self._category_code(str(name)),
                category_name=str(name),
                confidence=float(confidence),
            )
            for name, confidence in sorted(probabilities.items(), key=lambda item: float(item[1]), reverse=True)
            if str(name) != category_name
        ][:2]
        return CategorizeResponse(
            category_code=category_code,
            category_name=category_name,
            confidence=float(prediction["confidence"]),
            model_version=self.model_version,
            alternatives=alternatives or self._alternatives(exclude=category_code),
        )

    def _category_code(self, category_name: str) -> str:
        normalized = normalize_text(category_name).lower()
        mapping = {
            "продукты": "groceries",
            "питание": "groceries",
            "транспорт": "transport",
            "подписки": "subscriptions",
            "здоровье": "health",
            "кафе и рестораны": "restaurants",
            "зарплата": "salary",
            "доход": "salary",
            "прочее": "other",
            "другое": "other",
        }
        return mapping.get(normalized, normalized.replace(" ", "_") or "other")

    def categorize_values(
        self,
        description: str,
        amount: float | None,
        merchant: str | None,
        operation_type: OperationType,
    ) -> CategorizeResponse:
        return self.categorize(
            CategorizeRequest(
                description=description,
                amount=amount,
                merchant=merchant,
                operation_type=operation_type,
            )
        )

    def _alternatives(self, exclude: str) -> list[CategoryAlternative]:
        candidates = [
            CategoryAlternative(category_code="household", category_name="Дом", confidence=0.12),
            CategoryAlternative(category_code="restaurants", category_name="Кафе и рестораны", confidence=0.1),
            CategoryAlternative(category_code="transport", category_name="Транспорт", confidence=0.08),
        ]
        return [candidate for candidate in candidates if candidate.category_code != exclude][:2]
