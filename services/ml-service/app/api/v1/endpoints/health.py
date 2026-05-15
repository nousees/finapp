from typing import Any

from fastapi import APIRouter, Request

router = APIRouter(tags=["health"])


@router.get("/health")
async def health(request: Request) -> dict[str, Any]:
    speech = getattr(request.app.state, "speech_service", None)
    ner = getattr(request.app.state, "ner_service", None)
    categorization = getattr(request.app.state, "categorization_service", None)
    return {
        "status": "ok",
        "service": "ml-service",
        "version": request.app.state.settings.app_version,
        "models": {
            "whisper": {
                "version": getattr(getattr(speech, "model", None), "version", "unknown"),
                "real": bool(getattr(getattr(speech, "model", None), "real", False)),
                "load_error": getattr(getattr(speech, "model", None), "load_error", None),
                "allow_demo_transcription": bool(request.app.state.settings.allow_demo_transcription),
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

