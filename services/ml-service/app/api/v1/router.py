from fastapi import APIRouter

from app.api.v1.endpoints import categorize, enrich, ner, voice

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(voice.router)
api_router.include_router(ner.router)
api_router.include_router(categorize.router)
api_router.include_router(enrich.router)

