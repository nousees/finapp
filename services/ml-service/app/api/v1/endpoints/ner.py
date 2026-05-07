from fastapi import APIRouter, Request

from app.schemas.ner import NERExtractRequest, NERExtractResponse

router = APIRouter(prefix="/ner", tags=["ner"])


@router.post("/extract", response_model=NERExtractResponse)
async def extract_entities(request: Request, payload: NERExtractRequest) -> NERExtractResponse:
    return request.app.state.ner_service.extract(payload.text)

