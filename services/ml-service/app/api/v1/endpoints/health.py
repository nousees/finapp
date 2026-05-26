from typing import Any

from fastapi import APIRouter, Request

router = APIRouter(tags=["health"])


@router.get("/health")
async def health(request: Request) -> dict[str, Any]:
    speech = getattr(request.app.state, "speech_service", None)
    ner = getattr(request.app.state, "ner_service", None)
    categorization = getattr(request.app.state, "categorization_service", None)
    settings = request.app.state.settings
    whisper = getattr(speech, "model", None)
    whisper_real = bool(getattr(whisper, "real", False))
    real_models_requested = bool(settings.enable_real_models)
    degraded_reasons: list[str] = []
    if real_models_requested and not whisper_real:
        degraded_reasons.append("Whisper real model is not loaded; voice transcription will return 503 unless demo fallback is enabled.")
    return {
        "status": "degraded" if degraded_reasons else "ok",
        "service": "ml-service",
        "version": settings.app_version,
        "ready": True,
        "real_models_requested": real_models_requested,
        "degraded_reasons": degraded_reasons,
        "models": {
            "whisper": {
                "version": getattr(whisper, "version", "unknown"),
                "real": whisper_real,
                "load_error": getattr(whisper, "load_error", None),
                "provider": getattr(whisper, "provider", None),
                "model_ref": getattr(whisper, "model_ref", None),
                "allow_demo_transcription": bool(settings.allow_demo_transcription),
            },
            "ner": {
                "version": getattr(getattr(ner, "model", None), "version", "unknown"),
                "real": bool(getattr(getattr(ner, "model", None), "real", False)),
            },
            "categorization": {
                "version": getattr(getattr(categorization, "model", None), "version", "unknown"),
                "real": bool(getattr(getattr(categorization, "model", None), "real", False)),
            },
        },
    }

