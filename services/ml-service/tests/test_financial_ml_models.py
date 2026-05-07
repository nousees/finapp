from datetime import datetime, timedelta

from ml_models import FinancialMLModels


def test_financial_analysis_includes_goal_notifications_and_recommendations() -> None:
    today = datetime.now()
    transactions = [
        {
            "id": "1",
            "amount": 300,
            "description": "Groceries",
            "merchant": "Perekrestok",
            "date": (today - timedelta(days=60)).isoformat(),
            "category": "groceries",
            "type": "expense",
            "is_subscription": False,
        },
        {
            "id": "2",
            "amount": 330,
            "description": "Groceries",
            "merchant": "Perekrestok",
            "date": (today - timedelta(days=30)).isoformat(),
            "category": "groceries",
            "type": "expense",
            "is_subscription": False,
        },
        {
            "id": "3",
            "amount": 50000,
            "description": "Salary",
            "merchant": "Employer",
            "date": today.isoformat(),
            "category": "income",
            "type": "income",
            "is_subscription": False,
        },
    ]

    goals = [
        {
            "goal_id": "goal-1",
            "name": "Vacation",
            "status": "ACTIVE",
            "priority": 1,
            "target_amount": 100000,
            "current_amount": 20000,
            "deadline": (today + timedelta(days=60)).date().isoformat(),
            "required_monthly_contribution": 40000,
            "monthly_auto_save_equivalent": 5000,
        }
    ]

    model = FinancialMLModels()
    result = model.analyze_financials(transactions, goals=goals)

    assert result["goal_insights"]
    assert result["goal_insights"][0]["goal_id"] == "goal-1"
    assert result["goal_notifications"]
    assert result["goal_recommendations"]
    assert result["risk_score"] > 0
    assert result["risk_level"] in {"low", "medium", "high"}
