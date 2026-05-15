from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app


def test_voice_transcribe_demo_fallback_when_explicitly_enabled() -> None:
    settings = Settings(ENABLE_REAL_MODELS=False, ALLOW_DEMO_TRANSCRIPTION=True)
    with TestClient(create_app(settings)) as client:
        response = client.post(
            "/api/v1/voice/transcribe",
            files={"file": ("sample.wav", b"fake-audio", "audio/wav")},
        )

    payload = response.json()
    assert response.status_code == 200
    assert payload["language"] == "ru"
    assert payload["text"]
    assert payload["confidence"] == 0.92


def test_voice_requires_real_whisper_without_demo_mode() -> None:
    settings = Settings(ENABLE_REAL_MODELS=False, ALLOW_DEMO_TRANSCRIPTION=False)
    with TestClient(create_app(settings)) as client:
        response = client.post(
            "/api/v1/voice/transcribe",
            files={"file": ("sample.wav", b"fake-audio", "audio/wav")},
        )

    assert response.status_code == 503
    assert response.json()["error"]["code"] == "model_unavailable"


def test_voice_rejects_unsupported_format() -> None:
    with TestClient(create_app()) as client:
        response = client.post(
            "/api/v1/voice/transcribe",
            files={"file": ("sample.txt", b"not-audio", "text/plain")},
        )

    assert response.status_code == 415
    assert response.json()["error"]["code"] == "unsupported_audio_format"

