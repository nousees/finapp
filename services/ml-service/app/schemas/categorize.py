from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field

from app.schemas.common import CategoryAlternative, OperationType


class CategorizeRequest(BaseModel):
    description: str = Field(min_length=1, max_length=1000)
    amount: Optional[float] = None
    merchant: Optional[str] = Field(default=None, max_length=255)
    operation_type: OperationType = OperationType.unknown


class CategorizeResponse(BaseModel):
    category_code: str
    category_name: str
    confidence: float = Field(ge=0, le=1)
    model_version: str
    alternatives: list[CategoryAlternative] = []
