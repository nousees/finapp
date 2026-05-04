from fastapi.testclient import TestClient

from app.main import create_app


def test_categorize_groceries() -> None:
    with TestClient(create_app()) as client:
        response = client.post(
            "/api/v1/categorize",
            json={
                "description": "пятерочка продукты",
                "amount": 450,
                "merchant": "Пятерочка",
                "operation_type": "expense",
            },
        )

    payload = response.json()
    assert response.status_code == 200
    assert payload["category_code"] == "groceries"
    assert payload["category_name"] == "Продукты"
    assert payload["confidence"] == 0.94
    assert payload["model_version"] == "catboost-cnn-ensemble-v1"
    assert payload["alternatives"]


def test_categorize_other_fallback() -> None:
    with TestClient(create_app()) as client:
        response = client.post(
            "/api/v1/categorize",
            json={"description": "неизвестная операция", "amount": 100, "operation_type": "expense"},
        )

    payload = response.json()
    assert response.status_code == 200
    assert payload["category_code"] == "other"
    assert payload["confidence"] < 0.8

