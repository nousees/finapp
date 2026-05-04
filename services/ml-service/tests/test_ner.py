from datetime import date, timedelta

from fastapi.testclient import TestClient

from app.main import create_app


def test_ner_extracts_financial_entities() -> None:
    with TestClient(create_app()) as client:
        response = client.post(
            "/api/v1/ner/extract",
            json={"text": "потратил 450 рублей на продукты в пятерочке вчера"},
        )

    payload = response.json()
    assert response.status_code == 200
    assert payload["amount"] == 450
    assert payload["currency"] == "RUB"
    assert payload["merchant"] == "Пятерочка"
    assert payload["date"] == (date.today() - timedelta(days=1)).isoformat()
    assert payload["operation_type"] == "expense"
    assert payload["confidence"] >= 0.75


def test_ner_marks_unknown_operation_with_lower_confidence() -> None:
    with TestClient(create_app()) as client:
        response = client.post("/api/v1/ner/extract", json={"text": "450 рублей пятерочка"})

    payload = response.json()
    assert response.status_code == 200
    assert payload["amount"] == 450
    assert payload["operation_type"] == "unknown"
    assert payload["confidence"] < 0.9

