from fastapi import APIRouter, Request

from app.schemas.categorize import CategorizeRequest, CategorizeResponse

router = APIRouter(tags=["categorization"])


@router.post("/categorize", response_model=CategorizeResponse)
async def categorize(request: Request, payload: CategorizeRequest) -> CategorizeResponse:
    return request.app.state.categorization_service.categorize(payload)

