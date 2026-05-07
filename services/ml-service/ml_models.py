#!/usr/bin/env python3
"""Financial ML models for FinApp."""

from __future__ import annotations

import json
import re
from datetime import datetime
from typing import Any, Dict, List, Tuple

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler


class FinancialMLModels:
    def __init__(self) -> None:
        self.category_classifier: RandomForestClassifier | None = None
        self.subscription_detector: Pipeline | None = None
        self.categories: list[str] = []

    def _parse_date(self, date_value: Any) -> datetime:
        if not date_value:
            return datetime.now()
        try:
            return datetime.fromisoformat(str(date_value).replace("Z", "+00:00"))
        except ValueError:
            return datetime.now()

    def _safe_dataframe(self, transactions: List[Dict]) -> pd.DataFrame:
        df = pd.DataFrame(transactions)
        if df.empty:
            return df
        for column in ["id", "amount", "description", "category", "date", "type", "merchant", "is_subscription"]:
            if column not in df.columns:
                df[column] = pd.NA
        df["amount"] = pd.to_numeric(df["amount"], errors="coerce")
        return df

    def prepare_features(self, transactions: List[Dict]) -> Tuple[np.ndarray, np.ndarray]:
        features: list[list[float]] = []
        labels: list[str] = []

        for transaction in transactions:
            description = str(transaction.get("description", ""))
            merchant = str(transaction.get("merchant", ""))
            amount = float(transaction.get("amount", 0) or 0)
            date_obj = self._parse_date(transaction.get("date"))

            feature_vector = [
                amount,
                len(description),
                len(merchant),
                int(bool(re.search(r"\d", description))),
                int(amount % 1 == 0),
                date_obj.weekday(),
                date_obj.hour,
                date_obj.day,
            ]
            features.append(feature_vector)
            labels.append(str(transaction.get("category", "прочее")))

        return np.array(features), np.array(labels)

    def train_category_classifier(self, transactions: List[Dict]) -> float:
        print("Training category classifier...")
        X, y = self.prepare_features(transactions)
        class_counts = np.unique(y, return_counts=True)[1]
        if len(X) < 5 or len(set(y)) < 2 or class_counts.min() < 2:
            print("Not enough data to train category classifier.")
            return 0.0

        stratify = y if class_counts.min() >= 2 else None

        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=stratify
        )

        self.category_classifier = RandomForestClassifier(
            n_estimators=300,
            random_state=42,
            max_depth=10,
            min_samples_split=5,
            min_samples_leaf=2,
            class_weight="balanced_subsample",
        )
        self.category_classifier.fit(X_train, y_train)

        y_pred = self.category_classifier.predict(X_test)
        accuracy = accuracy_score(y_test, y_pred)
        self.categories = list(self.category_classifier.classes_)

        print(f"Category classifier trained. Accuracy: {accuracy:.3f}")
        print(classification_report(y_test, y_pred, zero_division=0))
        return accuracy

    def train_subscription_detector(self, transactions: List[Dict]) -> float:
        print("Training subscription detector...")

        feature_rows: list[list[float]] = []
        labels: list[int] = []

        for transaction in transactions:
            amount = float(transaction.get("amount", 0) or 0)
            description = str(transaction.get("description", ""))
            merchant = str(transaction.get("merchant", ""))
            day_of_month = self._parse_date(transaction.get("date")).day

            feature_rows.append([
                amount,
                len(description),
                len(merchant),
                day_of_month,
                int(self._is_regular_amount(amount)),
                int(self._has_subscription_keywords(description)),
                int(self._is_monthly_pattern(day_of_month)),
            ])
            labels.append(1 if transaction.get("is_subscription", False) else 0)

        X = np.array(feature_rows)
        y = np.array(labels)
        class_counts = np.unique(y, return_counts=True)[1]
        if len(X) < 5 or len(set(y)) < 2 or class_counts.min() < 2:
            print("Not enough data to train subscription detector.")
            return 0.0

        stratify = y if class_counts.min() >= 2 else None

        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=stratify
        )

        self.subscription_detector = Pipeline([
            ("scaler", StandardScaler()),
            ("classifier", LogisticRegression(random_state=42, max_iter=1000, class_weight="balanced")),
        ])
        self.subscription_detector.fit(X_train, y_train)

        y_pred = self.subscription_detector.predict(X_test)
        accuracy = accuracy_score(y_test, y_pred)

        print(f"Subscription detector trained. Accuracy: {accuracy:.3f}")
        print(classification_report(y_test, y_pred, zero_division=0))
        return accuracy

    def predict_category(self, transaction: Dict) -> Dict[str, Any]:
        if self.category_classifier is None:
            return {"category": "прочее", "confidence": 0.0}

        amount = float(transaction.get("amount", 0) or 0)
        description = str(transaction.get("description", ""))
        merchant = str(transaction.get("merchant", ""))
        date_obj = self._parse_date(transaction.get("date"))

        feature_vector = np.array([[
            amount,
            len(description),
            len(merchant),
            int(bool(re.search(r"\d", description))),
            int(amount % 1 == 0),
            date_obj.weekday(),
            date_obj.hour,
            date_obj.day,
        ]])

        prediction = self.category_classifier.predict(feature_vector)[0]
        probabilities = self.category_classifier.predict_proba(feature_vector)[0]
        return {
            "category": prediction,
            "confidence": round(float(max(probabilities)), 3),
            "probabilities": dict(zip(self.categories, probabilities.round(3))),
        }

    def predict_subscription(self, transaction: Dict) -> Dict[str, Any]:
        if self.subscription_detector is None:
            return {"is_subscription": False, "confidence": 0.0}

        amount = float(transaction.get("amount", 0) or 0)
        description = str(transaction.get("description", ""))
        merchant = str(transaction.get("merchant", ""))
        day_of_month = self._parse_date(transaction.get("date")).day

        features = np.array([[
            amount,
            len(description),
            len(merchant),
            day_of_month,
            int(self._is_regular_amount(amount)),
            int(self._has_subscription_keywords(description)),
            int(self._is_monthly_pattern(day_of_month)),
        ]])

        prediction = self.subscription_detector.predict(features)[0]
        probability = self.subscription_detector.predict_proba(features)[0][1]
        return {"is_subscription": bool(prediction), "confidence": round(float(probability), 3)}

    def get_spending_insights(self, transactions: List[Dict]) -> Dict[str, Any]:
        return self.analyze_financials(transactions, goals=None)

    def analyze_financials(self, transactions: List[Dict], goals: List[Dict] | None = None) -> Dict[str, Any]:
        df = self._safe_dataframe(transactions)
        if df.empty:
            return {
                "category_analysis": {},
                "anomalies": [],
                "trends": {"monthly_spending": {}, "trends": {}},
                "subscriptions": [],
                "goal_insights": [],
                "goal_notifications": [],
                "goal_recommendations": [],
                "notifications": [],
                "recommendations": [],
                "risk_level": "low",
                "risk_score": 0,
                "total_spent": 0.0,
                "total_income": 0.0,
                "transaction_count": 0,
            }

        df = df.dropna(subset=["amount", "category"]).copy()
        if df.empty:
            return {
                "category_analysis": {},
                "anomalies": [],
                "trends": {"monthly_spending": {}, "trends": {}},
                "subscriptions": [],
                "goal_insights": [],
                "goal_notifications": [],
                "goal_recommendations": [],
                "notifications": [],
                "recommendations": [],
                "risk_level": "low",
                "risk_score": 0,
                "total_spent": 0.0,
                "total_income": 0.0,
                "transaction_count": len(transactions),
            }

        df["date"] = pd.to_datetime(df["date"], errors="coerce")
        df = df.dropna(subset=["date"]).copy()
        if df.empty:
            return {
                "category_analysis": {},
                "anomalies": [],
                "trends": {"monthly_spending": {}, "trends": {}},
                "subscriptions": [],
                "goal_insights": [],
                "goal_notifications": [],
                "goal_recommendations": [],
                "notifications": [],
                "recommendations": [],
                "risk_level": "low",
                "risk_score": 0,
                "total_spent": 0.0,
                "total_income": 0.0,
                "transaction_count": len(transactions),
            }

        category_stats = df.groupby("category").agg({"amount": ["sum", "mean", "count"]}).round(2)
        anomalies = self._detect_anomalies(df.to_dict("records"))
        trends = self._analyze_spending_trends(df.to_dict("records"))
        subscriptions = self._detect_recurring_payments(df)
        goal_insights = self._analyze_goals(df, goals or [])
        goal_notifications = self._build_goal_notifications(goal_insights)
        goal_recommendations = self._build_goal_recommendations(goal_insights)
        notifications = self._build_notifications(df, anomalies, trends, subscriptions, goal_notifications)
        recommendations = self._build_recommendations(df, anomalies, trends, subscriptions, goal_recommendations)
        risk_score = self._calculate_risk_score(anomalies, trends, notifications, goal_insights)
        savings_rate = self._calculate_savings_rate(df)

        return {
            "category_analysis": self._serialize_category_analysis(category_stats),
            "anomalies": anomalies,
            "trends": trends,
            "subscriptions": subscriptions,
            "goal_insights": goal_insights,
            "goal_notifications": goal_notifications,
            "goal_recommendations": goal_recommendations,
            "notifications": notifications,
            "recommendations": recommendations,
            "risk_level": self._risk_level(risk_score),
            "risk_score": risk_score,
            "total_spent": float(df.loc[df["type"] == "expense", "amount"].sum()) if "type" in df.columns else 0.0,
            "total_income": float(df.loc[df["type"] == "income", "amount"].sum()) if "type" in df.columns else 0.0,
            "savings_rate": savings_rate,
            "transaction_count": len(transactions),
        }

    def _is_regular_amount(self, amount: float) -> bool:
        subscription_amounts = [149, 169, 199, 259, 299, 500, 799, 999]
        return any(abs(amount - sub_amount) < 10 for sub_amount in subscription_amounts)

    def _has_subscription_keywords(self, description: str) -> bool:
        keywords = ["подписка", "абонемент", "monthly", "subscription", "auto"]
        lowered = description.lower()
        return any(keyword in lowered for keyword in keywords)

    def _is_monthly_pattern(self, day_of_month: int) -> bool:
        return day_of_month in [1, 2, 3]

    def _detect_anomalies(self, transactions: List[Dict]) -> List[Dict]:
        df = self._safe_dataframe(transactions)
        if df.empty or "category" not in df.columns or "amount" not in df.columns:
            return []

        anomalies: list[Dict[str, Any]] = []
        for category in df["category"].dropna().unique():
            category_data = df[df["category"] == category].dropna(subset=["amount"])
            if len(category_data) < 4:
                continue

            amounts = category_data["amount"]
            median = float(amounts.median())
            mad = float(np.median(np.abs(amounts - median)))
            q1 = float(amounts.quantile(0.25))
            q3 = float(amounts.quantile(0.75))
            iqr = q3 - q1
            lower_bound = q1 - 1.5 * iqr
            upper_bound = q3 + 1.5 * iqr

            anomaly_mask = (amounts < lower_bound) | (amounts > upper_bound)
            for _, transaction in category_data[anomaly_mask].iterrows():
                amount = float(transaction.get("amount", 0) or 0)
                robust_z = 0.0 if mad == 0 else abs(0.6745 * (amount - median) / mad)
                anomalies.append({
                    "id": transaction.get("id"),
                    "amount": transaction.get("amount"),
                    "description": transaction.get("description"),
                    "category": transaction.get("category"),
                    "merchant": transaction.get("merchant"),
                    "reason": f"Amount is atypical for category '{category}'",
                    "deviation_score": round(float(robust_z), 2),
                    "severity": "high" if amount > upper_bound * 2 or robust_z >= 5 else "medium",
                })

        return anomalies

    def _analyze_spending_trends(self, transactions: List[Dict]) -> Dict[str, Any]:
        df = self._safe_dataframe(transactions)
        if df.empty or "date" not in df.columns or "type" not in df.columns:
            return {"monthly_spending": {}, "trends": {}}

        df = df.dropna(subset=["date", "category", "amount", "type"]).copy()
        if df.empty:
            return {"monthly_spending": {}, "trends": {}}

        df["date"] = pd.to_datetime(df["date"], errors="coerce")
        df = df.dropna(subset=["date"])
        if df.empty:
            return {"monthly_spending": {}, "trends": {}}

        df["month"] = df["date"].dt.to_period("M")
        monthly_spending = (
            df[df["type"] == "expense"]
            .groupby(["month", "category"])["amount"]
            .sum()
            .unstack(fill_value=0)
        )
        if monthly_spending.empty or len(monthly_spending) < 2:
            return {
                "monthly_spending": self._serialize_monthly_spending(monthly_spending),
                "trends": {},
            }

        last_month = monthly_spending.iloc[-1]
        prev_month = monthly_spending.iloc[-2]
        trends: Dict[str, Dict[str, Any]] = {}
        for category in monthly_spending.columns:
            prev_value = float(prev_month[category])
            last_value = float(last_month[category])
            if prev_value > 0 and last_value > 0:
                change = ((last_value - prev_value) / prev_value) * 100
                trends[category] = {
                    "change_percent": round(change, 2),
                    "direction": "up" if change > 0 else "down",
                }

        return {
            "monthly_spending": self._serialize_monthly_spending(monthly_spending),
            "trends": trends,
        }

    def _serialize_monthly_spending(self, monthly_spending: pd.DataFrame) -> Dict[str, Dict[str, float]]:
        if monthly_spending.empty:
            return {}
        serialized = monthly_spending.copy()
        serialized.index = serialized.index.astype(str)
        return serialized.to_dict(orient="index")

    def _serialize_category_analysis(self, category_stats: pd.DataFrame) -> Dict[str, Dict[str, float]]:
        if category_stats.empty:
            return {}
        serialized: Dict[str, Dict[str, float]] = {}
        for category, row in category_stats.iterrows():
            serialized[str(category)] = {
                "sum": float(row[("amount", "sum")]),
                "mean": float(row[("amount", "mean")]),
                "count": int(row[("amount", "count")]),
            }
        return serialized

    def _detect_recurring_payments(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        if df.empty:
            return []

        expenses = df[df["type"] == "expense"].dropna(subset=["merchant", "amount", "date"]).copy()
        if expenses.empty:
            return []

        subscriptions: list[Dict[str, Any]] = []
        for merchant, merchant_data in expenses.groupby("merchant"):
            merchant_data = merchant_data.sort_values("date")
            if len(merchant_data) < 2:
                continue

            amounts = merchant_data["amount"].astype(float)
            dates = merchant_data["date"]
            day_gaps = dates.diff().dt.days.dropna()
            descriptions = merchant_data["description"].fillna("").astype(str)
            categories = merchant_data["category"].fillna("").astype(str).str.lower()
            mean_amount = float(amounts.mean())
            amount_cv = float(amounts.std(ddof=0) / mean_amount) if mean_amount else 1.0
            regular_gap_ratio = float(day_gaps.between(25, 35).mean()) if not day_gaps.empty else 0.0
            monthly_day_stability = float(merchant_data["date"].dt.day.std(ddof=0) if len(merchant_data) > 1 else 99.0)
            keyword_ratio = float(descriptions.apply(self._has_subscription_keywords).mean())
            explicit_ratio = float(merchant_data["is_subscription"].fillna(False).astype(bool).mean())
            category_ratio = float(categories.isin(["подписки", "subscriptions"]).mean())
            subscription_score = (
                min(len(merchant_data) / 4, 1.0) * 25
                + regular_gap_ratio * 35
                + (1.0 if amount_cv <= 0.15 else max(0.0, 1 - amount_cv)) * 20
                + (1.0 if monthly_day_stability <= 3 else 0.0) * 10
                + keyword_ratio * 5
                + explicit_ratio * 15
                + category_ratio * 10
            )
            strong_signal = (
                keyword_ratio > 0
                or explicit_ratio >= 0.5
                or category_ratio >= 0.5
            )
            recurring_pattern = (
                len(merchant_data) >= 3
                and regular_gap_ratio >= 0.6
                and amount_cv <= 0.2
                and monthly_day_stability <= 4
            )

            if subscription_score >= 60 and (strong_signal or recurring_pattern):
                subscriptions.append({
                    "merchant": merchant,
                    "average_amount": round(mean_amount, 2),
                    "payments_count": int(len(merchant_data)),
                    "last_payment_date": merchant_data["date"].max().date().isoformat(),
                    "regularity_score": round(subscription_score, 1),
                    "predicted_type": "subscription",
                })

        subscriptions.sort(key=lambda item: item["regularity_score"], reverse=True)
        return subscriptions

    def _calculate_savings_rate(self, df: pd.DataFrame) -> float:
        total_income = float(df.loc[df["type"] == "income", "amount"].sum())
        total_spent = float(df.loc[df["type"] == "expense", "amount"].sum())
        if total_income <= 0:
            return 0.0
        return round((total_income - total_spent) / total_income, 3)

    def _build_notifications(
        self,
        df: pd.DataFrame,
        anomalies: List[Dict],
        trends: Dict[str, Any],
        subscriptions: List[Dict[str, Any]],
        goal_notifications: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        notifications: list[Dict[str, Any]] = list(goal_notifications)

        for anomaly in anomalies[:5]:
            notifications.append({
                "type": "anomaly",
                "severity": anomaly["severity"],
                "title": "Нетипичная операция",
                "message": f"{anomaly['category']}: {anomaly['amount']} выглядит нетипично для ваших обычных трат.",
                "related_transaction_id": anomaly.get("id"),
            })

        for category, trend in trends.get("trends", {}).items():
            change = float(trend.get("change_percent", 0))
            if trend.get("direction") == "up" and change >= 20:
                severity = "high" if change >= 50 else "medium"
                notifications.append({
                    "type": "overspending",
                    "severity": severity,
                    "title": "Рост расходов",
                    "message": f"Расходы по категории '{category}' выросли на {change:.1f}% по сравнению с прошлым месяцем.",
                    "related_category": category,
                })

        if subscriptions:
            total_subscription_spend = sum(item["average_amount"] for item in subscriptions)
            total_expense = float(df.loc[df["type"] == "expense", "amount"].sum())
            if total_expense > 0 and total_subscription_spend / total_expense >= 0.2:
                notifications.append({
                    "type": "subscription_load",
                    "severity": "medium",
                    "title": "Высокая доля подписок",
                    "message": "Регулярные списания занимают заметную долю расходов. Стоит проверить, всеми ли подписками вы пользуетесь.",
                    "related_amount": round(total_subscription_spend, 2),
                })

        savings_rate = self._calculate_savings_rate(df)
        if savings_rate < 0:
            notifications.append({
                "type": "cashflow",
                "severity": "high",
                "title": "Расходы превышают доходы",
                "message": "За анализируемый период расходы оказались выше доходов.",
            })
        elif 0 < savings_rate < 0.1:
            notifications.append({
                "type": "cashflow",
                "severity": "medium",
                "title": "Низкий запас по бюджету",
                "message": "После расходов остается меньше 10% дохода. Есть риск перерасхода.",
            })

        return notifications

    def _build_recommendations(
        self,
        df: pd.DataFrame,
        anomalies: List[Dict],
        trends: Dict[str, Any],
        subscriptions: List[Dict[str, Any]],
        goal_recommendations: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        recommendations: list[Dict[str, Any]] = list(goal_recommendations)

        if anomalies:
            top_anomaly = anomalies[0]
            recommendations.append({
                "priority": "high",
                "title": "Проверьте нетипичную трату",
                "action": f"Посмотрите операцию '{top_anomaly.get('description')}' на сумму {top_anomaly.get('amount')}.",
                "reason": "Сумма заметно отклоняется от обычных трат в этой категории.",
            })

        for category, trend in trends.get("trends", {}).items():
            change = float(trend.get("change_percent", 0))
            if trend.get("direction") == "up" and change >= 20:
                recommendations.append({
                    "priority": "medium" if change < 50 else "high",
                    "title": f"Сдержать расходы в категории '{category}'",
                    "action": "Сравните последние траты в этой категории и задайте ориентир на следующий месяц.",
                    "reason": f"Расходы выросли на {change:.1f}% относительно прошлого месяца.",
                })

        if subscriptions:
            top_subscription = subscriptions[0]
            recommendations.append({
                "priority": "medium",
                "title": "Оптимизировать регулярные списания",
                "action": f"Проверьте необходимость платежей у merchant '{top_subscription['merchant']}'.",
                "reason": "Обнаружены регулярные списания с высокой вероятностью подписки.",
            })

        savings_rate = self._calculate_savings_rate(df)
        if savings_rate < 0.2:
            recommendations.append({
                "priority": "medium" if savings_rate >= 0 else "high",
                "title": "Увеличить свободный остаток",
                "action": "Снизьте переменные траты или задайте лимиты на категории с максимальным ростом.",
                "reason": "Текущий запас после расходов слишком низкий.",
            })

        if not recommendations:
            recommendations.append({
                "priority": "low",
                "title": "Финансовое поведение стабильное",
                "action": "Сохраняйте текущий режим и продолжайте отслеживать динамику расходов.",
                "reason": "Сильных отклонений и рисков не обнаружено.",
            })

        return recommendations[:5]

    def _analyze_goals(self, df: pd.DataFrame, goals: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        if not goals:
            return []

        total_income = float(df.loc[df["type"] == "income", "amount"].sum()) if "type" in df.columns else 0.0
        total_expense = float(df.loc[df["type"] == "expense", "amount"].sum()) if "type" in df.columns else 0.0
        savings_rate = self._calculate_savings_rate(df)
        monthly_surplus = max(total_income - total_expense, 0.0)

        goal_insights: list[Dict[str, Any]] = []
        for goal in goals:
            normalized = self._normalize_goal(goal)
            target_amount = normalized["target_amount"]
            current_amount = normalized["current_amount"]
            remaining_amount = max(target_amount - current_amount, 0.0)
            progress_percent = 100.0 if target_amount <= 0 else min(current_amount / target_amount * 100, 100.0)
            days_remaining = normalized["days_remaining"]
            required_monthly = normalized["required_monthly_contribution"]
            monthly_auto_save = normalized["monthly_auto_save_equivalent"]

            if remaining_amount <= 0:
                risk_level = "LOW"
            elif days_remaining <= 0:
                risk_level = "HIGH"
            elif monthly_auto_save >= required_monthly and savings_rate >= 0.1:
                risk_level = "LOW"
            elif monthly_auto_save >= required_monthly * 0.75 or monthly_surplus >= required_monthly:
                risk_level = "MEDIUM"
            else:
                risk_level = "HIGH"

            goal_insights.append({
                "goal_id": normalized["goal_id"],
                "name": normalized["name"],
                "status": normalized["status"],
                "priority": normalized["priority"],
                "deadline": normalized["deadline"],
                "target_amount": round(target_amount, 2),
                "current_amount": round(current_amount, 2),
                "remaining_amount": round(remaining_amount, 2),
                "progress_percent": round(progress_percent, 2),
                "risk_level": risk_level,
                "days_remaining": days_remaining,
                "required_monthly_contribution": round(required_monthly, 2),
                "monthly_auto_save_equivalent": round(monthly_auto_save, 2),
                "monthly_surplus": round(monthly_surplus, 2),
                "savings_rate": round(savings_rate * 100, 2),
                "message": self._build_goal_message(risk_level, normalized["name"], required_monthly, monthly_auto_save, days_remaining),
            })

        goal_insights.sort(key=lambda item: (0 if item["risk_level"] == "HIGH" else 1 if item["risk_level"] == "MEDIUM" else 2, item["priority"] or 999))
        return goal_insights

    def _normalize_goal(self, goal: Dict[str, Any]) -> Dict[str, Any]:
        deadline_value = goal.get("deadline")
        deadline = None
        if deadline_value:
            try:
                deadline = pd.to_datetime(deadline_value).date()
            except Exception:
                deadline = None

        current_amount = float(goal.get("current_amount", 0) or 0)
        target_amount = float(goal.get("target_amount", 0) or 0)
        remaining_amount = float(goal.get("remaining_amount", max(target_amount - current_amount, 0)) or 0)
        progress_percent = float(goal.get("progress_percent", 0) or 0)
        if progress_percent <= 0 and target_amount > 0:
            progress_percent = min(current_amount / target_amount * 100, 100.0)

        days_remaining = goal.get("days_remaining")
        if days_remaining is None and deadline is not None:
            days_remaining = max((deadline - datetime.now().date()).days, 0)
        days_remaining = int(days_remaining or 0)

        required_monthly = goal.get("required_monthly_contribution")
        if required_monthly is None:
            months_remaining = max(days_remaining / 30.0, 1.0)
            required_monthly = remaining_amount / months_remaining if months_remaining > 0 else remaining_amount

        monthly_auto_save = goal.get("monthly_auto_save_equivalent")
        if monthly_auto_save is None:
            monthly_auto_save = float(goal.get("auto_save_amount", 0) or 0)

        return {
            "goal_id": goal.get("goal_id") or goal.get("id"),
            "name": goal.get("name") or "Цель",
            "status": goal.get("status") or "ACTIVE",
            "priority": int(goal.get("priority") or 1),
            "deadline": deadline.isoformat() if deadline else goal.get("deadline"),
            "target_amount": target_amount,
            "current_amount": current_amount,
            "remaining_amount": remaining_amount,
            "progress_percent": progress_percent,
            "days_remaining": days_remaining,
            "required_monthly_contribution": float(required_monthly),
            "monthly_auto_save_equivalent": float(monthly_auto_save),
        }

    def _build_goal_message(
        self,
        risk_level: str,
        goal_name: str,
        required_monthly: float,
        monthly_auto_save: float,
        days_remaining: int,
    ) -> str:
        if risk_level == "HIGH":
            return f"Цель «{goal_name}» под риском: нужно вносить около {required_monthly:.2f} в месяц, осталось {days_remaining} дн."
        if risk_level == "MEDIUM":
            delta = max(required_monthly - monthly_auto_save, 0.0)
            return f"Для цели «{goal_name}» стоит увеличить накопления примерно на {delta:.2f} в месяц."
        return f"Цель «{goal_name}» движется в хорошем темпе."

    def _build_goal_notifications(self, goal_insights: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        notifications: list[Dict[str, Any]] = []
        for goal in goal_insights:
            if goal["risk_level"] == "HIGH":
                notifications.append({
                    "type": "goal_risk",
                    "severity": "high",
                    "title": f"Цель «{goal['name']}» под риском",
                    "message": goal["message"],
                    "related_goal_id": goal["goal_id"],
                })
            elif goal["risk_level"] == "MEDIUM":
                notifications.append({
                    "type": "goal_attention",
                    "severity": "medium",
                    "title": f"Цель «{goal['name']}» требует внимания",
                    "message": goal["message"],
                    "related_goal_id": goal["goal_id"],
                })
        return notifications

    def _build_goal_recommendations(self, goal_insights: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        recommendations: list[Dict[str, Any]] = []
        for goal in goal_insights:
            if goal["risk_level"] == "HIGH":
                recommendations.append({
                    "priority": "high",
                    "title": f"Ускорить цель «{goal['name']}»",
                    "action": "Увеличьте ежемесячный автосберегаемый взнос или сократите необязательные траты.",
                    "reason": goal["message"],
                    "related_goal_id": goal["goal_id"],
                })
            elif goal["risk_level"] == "MEDIUM":
                recommendations.append({
                    "priority": "medium",
                    "title": f"Поддержать цель «{goal['name']}»",
                    "action": "Перенесите часть свободного cashflow в эту цель в ближайшие недели.",
                    "reason": goal["message"],
                    "related_goal_id": goal["goal_id"],
                })
        return recommendations

    def _calculate_risk_score(self, anomalies: List[Dict], trends: Dict[str, Any], notifications: List[Dict[str, Any]], goal_insights: List[Dict[str, Any]]) -> int:
        score = min(len(anomalies) * 15, 60)
        for trend in trends.get("trends", {}).values():
            if trend.get("direction") == "up":
                score += min(max(float(trend.get("change_percent", 0)), 0.0) / 2, 20)
        for notification in notifications:
            if notification.get("severity") == "high":
                score += 12
            elif notification.get("severity") == "medium":
                score += 6
        for goal in goal_insights:
            if goal.get("risk_level") == "HIGH":
                score += 10
            elif goal.get("risk_level") == "MEDIUM":
                score += 4
        return int(min(score, 100))

    def _risk_level(self, score: int) -> str:
        if score >= 70:
            return "high"
        if score >= 35:
            return "medium"
        return "low"

    def save_models(self, path: str = "ml_models/") -> None:
        import os

        os.makedirs(path, exist_ok=True)
        if self.category_classifier:
            joblib.dump(self.category_classifier, f"{path}/category_classifier.pkl")
        if self.subscription_detector:
            joblib.dump(self.subscription_detector, f"{path}/subscription_detector.pkl")

        metadata = {
            "categories": self.categories,
            "model_version": "1.1",
            "created_at": datetime.now().isoformat(),
        }
        with open(f"{path}/metadata.json", "w", encoding="utf-8") as f:
            json.dump(metadata, f, ensure_ascii=False, indent=2)
        print(f"Models saved to {path}")

    def load_models(self, path: str = "ml_models/") -> None:
        import os

        if os.path.exists(f"{path}/category_classifier.pkl"):
            self.category_classifier = joblib.load(f"{path}/category_classifier.pkl")
        if os.path.exists(f"{path}/subscription_detector.pkl"):
            self.subscription_detector = joblib.load(f"{path}/subscription_detector.pkl")
        if os.path.exists(f"{path}/metadata.json"):
            with open(f"{path}/metadata.json", "r", encoding="utf-8") as f:
                metadata = json.load(f)
                self.categories = metadata.get("categories", [])
        print(f"Models loaded from {path}")


if __name__ == "__main__":
    print("Loading dataset...")
    try:
        with open("financial_dataset.json", "r", encoding="utf-8") as f:
            dataset = json.load(f)
        transactions = dataset["transactions"]
    except FileNotFoundError:
        print("Dataset not found. Run data_generator.py first.")
        raise SystemExit(1)

    ml_models = FinancialMLModels()
    ml_models.train_category_classifier(transactions)
    ml_models.train_subscription_detector(transactions)
    ml_models.save_models()

    test_transactions = [
        {
            "amount": 1500.50,
            "description": "Магнит Касса 5",
            "merchant": "Магнит",
            "date": datetime.now().isoformat(),
            "is_subscription": False,
        },
        {
            "amount": 799.00,
            "description": "Подписка Netflix",
            "merchant": "Netflix",
            "date": datetime.now().isoformat(),
            "is_subscription": True,
        },
    ]

    for transaction in test_transactions:
        category_pred = ml_models.predict_category(transaction)
        subscription_pred = ml_models.predict_subscription(transaction)
        print(f"\nTransaction: {transaction['description']} ({transaction['amount']})")
        print(f"Category: {category_pred['category']} ({category_pred['confidence']})")
        print(f"Subscription: {subscription_pred['is_subscription']} ({subscription_pred['confidence']})")

    insights = ml_models.get_spending_insights(transactions)
    print(f"\nTotal spent: {insights['total_spent']:.2f}")
    print(f"Total income: {insights['total_income']:.2f}")
    print(f"Anomalies found: {len(insights['anomalies'])}")
