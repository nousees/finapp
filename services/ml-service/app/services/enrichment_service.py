from app.ml.postprocess import combine_confidence
from app.schemas.enrich import ConfidenceBreakdown, EnrichedTransaction, EnrichResponse, ModelVersions
from app.services.categorization_service import CategorizationService
from app.services.ner_service import NERService


class EnrichmentService:
    def __init__(self, ner_service: NERService, categorization_service: CategorizationService) -> None:
        self.ner_service = ner_service
        self.categorization_service = categorization_service

    def enrich(self, text: str) -> EnrichResponse:
        ner = self.ner_service.extract(text)
        category = self.categorization_service.categorize_values(
            description=ner.description or ner.raw_text,
            amount=ner.amount,
            merchant=ner.merchant,
            operation_type=ner.operation_type,
        )
        overall = combine_confidence(ner.confidence, category.confidence)
        needs_review = (
            ner.confidence < 0.75
            or category.confidence < 0.8
            or ner.amount is None
            or ner.operation_type == "unknown"
        )

        return EnrichResponse(
            transaction=EnrichedTransaction(
                amount=ner.amount,
                currency=ner.currency,
                merchant=ner.merchant,
                date=ner.date,
                operation_type=ner.operation_type,
                description=ner.raw_text,
                category_code=category.category_code,
                category_name=category.category_name,
            ),
            confidence=ConfidenceBreakdown(ner=ner.confidence, categorization=category.confidence, overall=overall),
            needs_review=needs_review,
            model_versions=ModelVersions(
                ner=self.ner_service.model_version,
                categorization=self.categorization_service.model_version,
            ),
        )
