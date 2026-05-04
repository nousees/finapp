from fastapi.testclient import TestClient

from app.main import create_app


def test_enrich_pipeline_returns_normalized_transaction() -> None:
    with TestClient(create_app()) as client:
        response = client.post(
            "/api/v1/enrich",
            json={"text": "потратил 450 рублей на продукты в пятерочке вчера"},
        )

    payload = response.json()
    assert response.status_code == 200
    assert payload["transaction"]["amount"] == 450
    assert payload["transaction"]["category_code"] == "groceries"
    assert payload["confidence"]["ner"] >= 0.75
    assert payload["confidence"]["categorization"] >= 0.8
    assert payload["needs_review"] is False
    assert payload["model_versions"]["ner"] == "rubert-tiny-ner-v1"


def test_enrich_sets_needs_review_for_weak_input() -> None:
    with TestClient(create_app()) as client:
        response = client.post("/api/v1/enrich", json={"text": "что-то непонятное"})

    payload = response.json()
    assert response.status_code == 200
    assert payload["needs_review"] is True

