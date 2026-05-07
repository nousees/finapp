from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.endpoints.health import router as health_router
from app.api.v1.router import api_router
from app.core.config import Settings, get_settings
from app.core.errors import register_exception_handlers
from app.core.logging import configure_logging, request_context_middleware
from app.services.categorization_service import CategorizationService
from app.services.enrichment_service import EnrichmentService
from app.services.ner_service import NERService
from app.services.speech_service import SpeechService


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    logger = configure_logging(settings.log_level_name)

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        app.state.settings = settings
        app.state.logger = logger
        app.state.speech_service = SpeechService(settings)
        app.state.ner_service = NERService(settings)
        app.state.categorization_service = CategorizationService(settings)
        app.state.enrichment_service = EnrichmentService(app.state.ner_service, app.state.categorization_service)
        logger.info(
            "ml_service_started",
            extra={
                "app_env": settings.app_env,
                "enable_real_models": settings.enable_real_models,
                "version": settings.app_version,
            },
        )
        yield
        logger.info("ml_service_stopped")

    app = FastAPI(
        title="FinApp ML Service",
        description="ML service for voice transcription, NER, and transaction categorization.",
        version=settings.app_version,
        lifespan=lifespan,
    )
    app.middleware("http")(request_context_middleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    register_exception_handlers(app)
    app.include_router(health_router)
    app.include_router(api_router)
    return app


app = create_app()
