from fastapi.testclient import TestClient

from app.main import create_app
from app.ml.category_loader import load_category_model


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


def test_real_category_model_prefers_catboost_artifact() -> None:
    model = load_category_model(True, "ml_models")
    assert model.real is True
    assert model.version == "catboost-finapp-v2"

    prediction = model.predict({
        "description": "Пятерочка продукты молоко хлеб",
        "amount": 450,
        "merchant": "Пятерочка",
    })

    assert prediction
    assert prediction["category"] == "groceries"
    assert prediction["confidence"] > 0.5

