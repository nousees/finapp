from fastapi.testclient import TestClient

from app.main import create_app


def test_voice_transcribe_demo_fallback() -> None:
    with TestClient(create_app()) as client:
        response = client.post(
            "/api/v1/voice/transcribe",
            files={"file": ("sample.wav", b"fake-audio", "audio/wav")},
        )

    payload = response.json()
    assert response.status_code == 200
    assert payload["language"] == "ru"
    assert payload["text"]
    assert payload["confidence"] == 0.92


def test_voice_rejects_unsupported_format() -> None:
    with TestClient(create_app()) as client:
        response = client.post(
            "/api/v1/voice/transcribe",
            files={"file": ("sample.txt", b"not-audio", "text/plain")},
        )

    assert response.status_code == 415
    assert response.json()["error"]["code"] == "unsupported_audio_format"

