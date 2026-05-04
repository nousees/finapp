from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class OperationType(str, Enum):
    income = "income"
    expense = "expense"
    transfer = "transfer"
    unknown = "unknown"


class CategoryAlternative(BaseModel):
    category_code: str
    category_name: str
    confidence: float = Field(ge=0, le=1)


class ErrorResponse(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "error": {
                "code": "validation_error",
                "message": "Request validation failed.",
                "request_id": "2f3c3f45-9e0d-45e1-a6d3-2e5664bd9123",
            }
        }
    })

    error: dict
