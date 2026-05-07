from __future__ import annotations

import re

from app.core.config import Settings
from app.ml.ner_loader import NERModel, load_ner_model
from app.ml.preprocess import preprocess_text
from app.schemas.common import OperationType
from app.schemas.ner import NERExtractResponse
from app.utils.dates import extract_date
from app.utils.money import extract_amount, extract_currency
from app.utils.text import title_ru


MERCHANT_PATTERNS = [
    "пятерочка",
    "пятёрочка",
    "пятерочке",
    "пятёрочке",
    "магнит",
    "netflix",
    "spotify",
    "аптека",
    "яндекс такси",
    "метро",
]


class NERService:
    def __init__(self, settings: Settings) -> None:
        self.model: NERModel = load_ner_model(settings.enable_real_models, settings.ner_model_path)

    @property
    def model_version(self) -> str:
        return self.model.version if self.model.real else "rubert-tiny-ner-v1"

    def extract(self, text: str) -> NERExtractResponse:
        normalized = preprocess_text(text)
        amount = extract_amount(normalized)
        operation_type = self._extract_operation_type(normalized)
        merchant = self._extract_merchant(normalized)
        currency = extract_currency(normalized)
        transaction_date = extract_date(normalized)

        confidence = 0.9
        if amount is None:
            confidence -= 0.25
        if operation_type == OperationType.unknown:
            confidence -= 0.15
        if merchant is None:
            confidence -= 0.05

        return NERExtractResponse(
            amount=amount,
            currency=currency,
            merchant=merchant,
            date=transaction_date,
            operation_type=operation_type,
            description=normalized,
            raw_text=text,
            confidence=max(round(confidence, 2), 0.3),
        )

    def _extract_operation_type(self, text: str) -> OperationType:
        lowered = text.lower()
        if any(word in lowered for word in ["получил", "получила", "зачислили", "зарплата", "аванс", "доход"]):
            return OperationType.income
        if any(word in lowered for word in ["перевел", "перевела", "перевод", "отправил", "отправила"]):
            return OperationType.transfer
        if any(word in lowered for word in ["потратил", "потратила", "купил", "купила", "оплатил", "оплатила", "списали"]):
            return OperationType.expense
        return OperationType.unknown

    def _extract_merchant(self, text: str) -> str | None:
        lowered = text.lower()
        for merchant in MERCHANT_PATTERNS:
            if merchant in lowered:
                return title_ru(merchant)
        match = re.search(r"\b(?:в|на|через)\s+([а-яa-z0-9 -]{3,40})(?:\s+(?:вчера|сегодня|за|на|и|$))", lowered)
        if match:
            candidate = match.group(1).strip()
            candidate = re.sub(r"\s+\d.*$", "", candidate).strip()
            if candidate and candidate not in {"продукты", "такси", "кафе"}:
                return title_ru(candidate)
        return None
