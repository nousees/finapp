from fastapi import APIRouter, Request

from app.schemas.enrich import EnrichRequest, EnrichResponse

router = APIRouter(tags=["enrichment"])


@router.post("/enrich", response_model=EnrichResponse)
async def enrich(request: Request, payload: EnrichRequest) -> EnrichResponse:
    return request.app.state.enrichment_service.enrich(payload.text)

