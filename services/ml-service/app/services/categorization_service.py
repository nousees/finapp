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
