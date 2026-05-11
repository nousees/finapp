from fastapi.testclient import TestClient

from app.main import create_app


def test_health() -> None:
    with TestClient(create_app()) as client:
        response = client.get("/health")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["service"] == "ml-service"
    assert payload["version"] == "1.0.0"
    assert payload["models"]["whisper"]["real"] is False
    assert payload["models"]["ner"]["real"] is False
    assert payload["models"]["categorization"]["real"] is False

