from __future__ import annotations

from datetime import date as dt_date
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.common import OperationType


class EnrichRequest(BaseModel):
    text: str = Field(min_length=1, max_length=2000)
    user_id: Optional[UUID] = None


class EnrichedTransaction(BaseModel):
    amount: Optional[float]
    currency: str
    merchant: Optional[str]
    date: Optional[dt_date]
    operation_type: OperationType
    description: str
    category_code: str
    category_name: str


class ConfidenceBreakdown(BaseModel):
    ner: float = Field(ge=0, le=1)
    categorization: float = Field(ge=0, le=1)
    overall: float = Field(ge=0, le=1)


class ModelVersions(BaseModel):
    ner: str
    categorization: str


class EnrichResponse(BaseModel):
    transaction: EnrichedTransaction
    confidence: ConfidenceBreakdown
    needs_review: bool
    model_versions: ModelVersions
