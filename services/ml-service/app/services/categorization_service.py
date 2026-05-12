from __future__ import annotations

from app.core.config import Settings
from app.ml.category_loader import CategoryModel, load_category_model
from app.schemas.categorize import CategorizeRequest, CategorizeResponse
from app.schemas.common import CategoryAlternative, OperationType
from app.utils.text import normalize_text


CATEGORY_RULES = [
    ("groceries", "Продукты", 0.94, ["пятерочка", "пятёрочка", "магнит", "лента", "вкусвилл", "перекресток", "супермаркет", "продукты"]),
    ("restaurants", "Кафе и рестораны", 0.9, ["кафе", "ресторан", "кофе", "пицца", "бургер", "доставка еды"]),
    ("transport", "Транспорт", 0.91, ["такси", "метро", "автобус", "электричка", "бензин", "азс", "парковка"]),
    ("subscriptions", "Подписки", 0.92, ["netflix", "spotify", "youtube premium", "яндекс плюс", "подписка", "ivi"]),
    ("health", "Здоровье", 0.89, ["аптека", "лекарства", "клиника", "стоматология", "врач", "здоровье"]),
    ("housing", "Жилье", 0.88, ["аренда", "ипотека", "квартира", "жилье"]),
    ("utilities", "Коммунальные услуги", 0.87, ["жкх", "коммунал", "коммунальные", "электричество", "вода", "газ", "интернет"]),
    ("education", "Образование", 0.87, ["курс", "обучение", "учеба", "университет", "школа", "репетитор"]),
    ("shopping", "Покупки", 0.82, ["wildberries", "ozon", "marketplace", "покупка", "товары"]),
    ("clothing", "Одежда и обувь", 0.86, ["одежда", "обувь", "кроссовки", "куртка", "футболка"]),
    ("travel", "Путешествия", 0.88, ["авиабилет", "отель", "бронирование", "поездка", "отпуск", "путешествие"]),
    ("family", "Семья и дети", 0.84, ["садик", "школа", "дети", "ребенок", "игрушки", "подгузники"]),
    ("beauty", "Красота и уход", 0.83, ["салон", "маникюр", "косметика", "барбершоп", "уход"]),
    ("sports", "Спорт", 0.84, ["фитнес", "зал", "спорт", "тренировка", "бассейн"]),
    ("pets", "Питомцы", 0.84, ["зоомагазин", "ветеринар", "корм", "питомец", "кот", "собака"]),
    ("electronics", "Электроника", 0.85, ["смартфон", "ноутбук", "наушники", "техника", "электроника", "dns"]),
    ("gifts", "Подарки", 0.82, ["подарок", "цветы", "букет", "праздник"]),
    ("fees", "Налоги и комиссии", 0.86, ["комиссия", "налог", "штраф", "пошлина", "сбор"]),
    ("salary", "Зарплата", 0.93, ["зарплата", "аванс", "оклад"]),
    ("freelance", "Фриланс", 0.88, ["фриланс", "заказ", "проект", "оплата за проект"]),
    ("bonus", "Бонусы и премии", 0.86, ["премия", "бонус"]),
    ("cashback", "Кэшбэк", 0.9, ["кэшбэк", "cashback"]),
    ("gifts_income", "Подарки и переводы", 0.82, ["перевод от", "подарили", "подарок от"]),
]

NAME_TO_CODE = {
    "продукты": "groceries",
    "питание": "groceries",
    "кафе и рестораны": "restaurants",
    "транспорт": "transport",
    "подписки": "subscriptions",
    "здоровье": "health",
    "жилье": "housing",
    "коммунальные услуги": "utilities",
    "коммунальные": "utilities",
    "образование": "education",
    "покупки": "shopping",
    "одежда и обувь": "clothing",
    "одежда": "clothing",
    "путешествия": "travel",
    "семья и дети": "family",
    "красота и уход": "beauty",
    "спорт": "sports",
    "питомцы": "pets",
    "электроника": "electronics",
    "подарки": "gifts",
    "налоги и комиссии": "fees",
    "зарплата": "salary",
    "доход": "salary",
    "фриланс": "freelance",
    "бонусы и премии": "bonus",
    "кэшбэк": "cashback",
    "подарки и переводы": "gifts_income",
    "накопления": "savings",
    "инвестиции": "investments",
    "прочее": "other",
    "другое": "other",
}

DEFAULT_ALTERNATIVES = [
    CategoryAlternative(category_code="groceries", category_name="Продукты", confidence=0.14),
    CategoryAlternative(category_code="transport", category_name="Транспорт", confidence=0.12),
    CategoryAlternative(category_code="restaurants", category_name="Кафе и рестораны", confidence=0.1),
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
            category_name="Прочее",
            confidence=0.55,
            model_version=self.model_version,
            alternatives=self._alternatives(exclude="other"),
        )

    def _predict_with_real_model(self, request: CategorizeRequest) -> CategorizeResponse | None:
        try:
            prediction = self.model.predict({
                "amount": request.amount or 0,
                "description": request.description,
                "merchant": request.merchant or "",
                "date": None,
                "type": request.operation_type.value,
            })
        except Exception:
            return None

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
        return NAME_TO_CODE.get(normalized, normalized.replace(" ", "_") or "other")

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
        return [candidate for candidate in DEFAULT_ALTERNATIVES if candidate.category_code != exclude][:2]
