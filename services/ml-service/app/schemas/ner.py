from __future__ import annotations

from datetime import date as dt_date
from typing import Optional

from pydantic import BaseModel, Field

from app.schemas.common import OperationType


class NERExtractRequest(BaseModel):
    text: str = Field(min_length=1, max_length=2000)


class NERExtractResponse(BaseModel):
    amount: Optional[float] = None
    currency: str = "RUB"
    merchant: Optional[str] = None
    date: Optional[dt_date] = None
    operation_type: OperationType = OperationType.unknown
    description: Optional[str] = None
    raw_text: str
    confidence: float = Field(ge=0, le=1)
