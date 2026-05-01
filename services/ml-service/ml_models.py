#!/usr/bin/env python3
"""
ML модели для финансового анализа FinApp
"""

import json
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
from sklearn.preprocessing import StandardScaler
import joblib
import re
from typing import Dict, List, Tuple, Any
from datetime import datetime

class FinancialMLModels:
    def __init__(self):
        self.category_classifier = None
        self.subscription_detector = None
        self.tfidf_vectorizer = None
        self.scaler = None
        self.categories = []
        
    def prepare_features(self, transactions: List[Dict]) -> Tuple[np.ndarray, np.ndarray]:
        """Подготавливает признаки для обучения"""
        features = []
        labels = []
        
        for transaction in transactions:
            # Текстовые признаки
            description = transaction.get('description', '')
            merchant = transaction.get('merchant', '')
            
            # Числовые признаки
            amount = float(transaction.get('amount', 0))
            day_of_week = datetime.fromisoformat(transaction['date']).weekday()
            hour = datetime.fromisoformat(transaction['date']).hour
            day_of_month = datetime.fromisoformat(transaction['date']).day
            
            # Дополнительные признаки
            description_length = len(description)
            merchant_length = len(merchant)
            has_numbers = bool(re.search(r'\d', description))
            is_round_amount = amount % 1 == 0
            is_subscription = transaction.get('is_subscription', False)
            
            feature_vector = [
                amount,
                description_length,
                merchant_length,
                int(has_numbers),
                int(is_round_amount),
                day_of_week,
                hour,
                day_of_month,
                int(is_subscription)
            ]
            
            features.append(feature_vector)
            labels.append(transaction.get('category', 'прочее'))
        
        return np.array(features), np.array(labels)
    
    def train_category_classifier(self, transactions: List[Dict]) -> float:
        """Обучает классификатор категорий"""
        print("🔄 Обучение классификатора категорий...")
        
        # Подготовка данных
        X, y = self.prepare_features(transactions)
        
        # Разделение на train/test
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        
        # Масштабирование признаков
        self.scaler = StandardScaler()
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        # Обучение модели
        self.category_classifier = RandomForestClassifier(
            n_estimators=100,
            random_state=42,
            max_depth=10,
            min_samples_split=5
        )
        
        self.category_classifier.fit(X_train_scaled, y_train)
        
        # Оценка качества
        y_pred = self.category_classifier.predict(X_test_scaled)
        accuracy = accuracy_score(y_test, y_pred)
        
        print(f"✅ Классификатор категорий обучен. Accuracy: {accuracy:.3f}")
        print(f"📊 Категории: {list(self.category_classifier.classes_)}")
        
        self.categories = list(self.category_classifier.classes_)
        
        # Вывод отчета
        print("\n📈 Отчет классификации:")
        print(classification_report(y_test, y_pred))
        
        return accuracy
    
    def train_subscription_detector(self, transactions: List[Dict]) -> float:
        """Обучает детектор подписок"""
        print("🔄 Обучение детектора подписок...")
        
        # Подготовка данных для детекции подписок
        subscription_features = []
        subscription_labels = []
        
        for transaction in transactions:
            amount = float(transaction.get('amount', 0))
            description = transaction.get('description', '')
            merchant = transaction.get('merchant', '')
            day_of_month = datetime.fromisoformat(transaction['date']).day
            
            # Признаки для детекции подписок
            features = [
                amount,
                len(description),
                len(merchant),
                day_of_month,
                self._is_regular_amount(amount),
                self._has_subscription_keywords(description),
                self._is_monthly_pattern(day_of_month)
            ]
            
            subscription_features.append(features)
            subscription_labels.append(1 if transaction.get('is_subscription', False) else 0)
        
        X = np.array(subscription_features)
        y = np.array(subscription_labels)
        
        # Разделение на train/test
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        
        # Обучение модели
        self.subscription_detector = LogisticRegression(
            random_state=42,
            max_iter=1000
        )
        
        self.subscription_detector.fit(X_train, y_train)
        
        # Оценка качества
        y_pred = self.subscription_detector.predict(X_test)
        accuracy = accuracy_score(y_test, y_pred)
        
        print(f"✅ Детектор подписок обучен. Accuracy: {accuracy:.3f}")
        
        # Вывод отчета
        print("\n📈 Отчет детекции подписок:")
        print(classification_report(y_test, y_pred))
        
        return accuracy
    
    def predict_category(self, transaction: Dict) -> Dict[str, Any]:
        """Предсказывает категорию транзакции"""
        if self.category_classifier is None:
            return {"category": "прочее", "confidence": 0.0}
        
        # Подготовка признаков
        description = transaction.get('description', '')
        merchant = transaction.get('merchant', '')
        amount = float(transaction.get('amount', 0))
        
        # Если нет даты, используем текущую
        date_str = transaction.get('date', datetime.now().isoformat())
        date_obj = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
        
        day_of_week = date_obj.weekday()
        hour = date_obj.hour
        day_of_month = date_obj.day
        
        description_length = len(description)
        merchant_length = len(merchant)
        has_numbers = bool(re.search(r'\d', description))
        is_round_amount = amount % 1 == 0
        is_subscription = transaction.get('is_subscription', False)
        
        feature_vector = np.array([[
            amount,
            description_length,
            merchant_length,
            int(has_numbers),
            int(is_round_amount),
            day_of_week,
            hour,
            day_of_month,
            int(is_subscription)
        ]])
        
        # Масштабирование
        if self.scaler:
            feature_vector = self.scaler.transform(feature_vector)
        
        # Предсказание
        prediction = self.category_classifier.predict(feature_vector)[0]
        probabilities = self.category_classifier.predict_proba(feature_vector)[0]
        confidence = max(probabilities)
        
        return {
            "category": prediction,
            "confidence": round(confidence, 3),
            "probabilities": dict(zip(self.categories, probabilities.round(3)))
        }
    
    def predict_subscription(self, transaction: Dict) -> Dict[str, Any]:
        """Предсказывает является ли транзакция подпиской"""
        if self.subscription_detector is None:
            return {"is_subscription": False, "confidence": 0.0}
        
        amount = float(transaction.get('amount', 0))
        description = transaction.get('description', '')
        merchant = transaction.get('merchant', '')
        
        date_str = transaction.get('date', datetime.now().isoformat())
        date_obj = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
        day_of_month = date_obj.day
        
        features = np.array([[
            amount,
            len(description),
            len(merchant),
            day_of_month,
            self._is_regular_amount(amount),
            self._has_subscription_keywords(description),
            self._is_monthly_pattern(day_of_month)
        ]])
        
        # Предсказание
        prediction = self.subscription_detector.predict(features)[0]
        probability = self.subscription_detector.predict_proba(features)[0][1]
        
        return {
            "is_subscription": bool(prediction),
            "confidence": round(probability, 3)
        }
    
    def get_spending_insights(self, transactions: List[Dict]) -> Dict[str, Any]:
        """Генерирует инсайты о тратах"""
        df = pd.DataFrame(transactions)
        
        # Анализ по категориям
        category_stats = df.groupby('category').agg({
            'amount': ['sum', 'mean', 'count']
        }).round(2)
        
        # Поиск аномальных транзакций
        anomalies = self._detect_anomalies(transactions)
        
        # Тренды расходов
        trends = self._analyze_spending_trends(transactions)
        
        return {
            "category_analysis": category_stats.to_dict(),
            "anomalies": anomalies,
            "trends": trends,
            "total_spent": df[df['type'] == 'expense']['amount'].sum(),
            "total_income": df[df['type'] == 'income']['amount'].sum(),
            "transaction_count": len(transactions)
        }
    
    def _is_regular_amount(self, amount: float) -> bool:
        """Проверяет, является ли сумма типичной для подписки"""
        subscription_amounts = [149, 169, 199, 259, 299, 500, 799, 999]
        return any(abs(amount - sub_amount) < 10 for sub_amount in subscription_amounts)
    
    def _has_subscription_keywords(self, description: str) -> bool:
        """Проверяет наличие ключевых слов подписки"""
        keywords = ['подписка', 'абонемент', 'monthly', 'subscription', 'auto']
        return any(keyword.lower() in description.lower() for keyword in keywords)
    
    def _is_monthly_pattern(self, day_of_month: int) -> bool:
        """Проверяет, соответствует ли день месячному паттерну"""
        return day_of_month in [1, 2, 3]  # Подписки обычно в начале месяца
    
    def _detect_anomalies(self, transactions: List[Dict]) -> List[Dict]:
        """Детектирует аномальные транзакции"""
        df = pd.DataFrame(transactions)
        anomalies = []
        
        for category in df['category'].unique():
            category_data = df[df['category'] == category]
            amounts = category_data['amount']
            
            # Используем IQR для детекции аномалий
            Q1 = amounts.quantile(0.25)
            Q3 = amounts.quantile(0.75)
            IQR = Q3 - Q1
            
            lower_bound = Q1 - 1.5 * IQR
            upper_bound = Q3 + 1.5 * IQR
            
            # Находим аномалии
            anomaly_mask = (amounts < lower_bound) | (amounts > upper_bound)
            anomaly_transactions = category_data[anomaly_mask]
            
            for _, transaction in anomaly_transactions.iterrows():
                anomalies.append({
                    "id": transaction["id"],
                    "amount": transaction["amount"],
                    "description": transaction["description"],
                    "category": transaction["category"],
                    "reason": f"Аномальная сумма для категории {category}",
                    "severity": "high" if transaction["amount"] > upper_bound * 2 else "medium"
                })
        
        return anomalies
    
    def _analyze_spending_trends(self, transactions: List[Dict]) -> Dict[str, Any]:
        """Анализирует тренды расходов"""
        df = pd.DataFrame(transactions)
        df['date'] = pd.to_datetime(df['date'])
        df['month'] = df['date'].dt.to_period('M')
        
        # Месячные расходы по категориям
        monthly_spending = df[df['type'] == 'expense'].groupby(['month', 'category'])['amount'].sum().unstack(fill_value=0)
        
        # Тренды (рост/падение)
        if len(monthly_spending) >= 2:
            last_month = monthly_spending.iloc[-1]
            prev_month = monthly_spending.iloc[-2]
            
            trends = {}
            for category in monthly_spending.columns:
                if last_month[category] > 0:
                    change = ((last_month[category] - prev_month[category]) / prev_month[category]) * 100
                    trends[category] = {
                        "change_percent": round(change, 2),
                        "direction": "up" if change > 0 else "down"
                    }
        else:
            trends = {}
        
        return {
            "monthly_spending": monthly_spending.to_dict(),
            "trends": trends
        }
    
    def save_models(self, path: str = "ml_models/"):
        """Сохраняет обученные модели"""
        import os
        os.makedirs(path, exist_ok=True)
        
        if self.category_classifier:
            joblib.dump(self.category_classifier, f"{path}/category_classifier.pkl")
        
        if self.subscription_detector:
            joblib.dump(self.subscription_detector, f"{path}/subscription_detector.pkl")
        
        if self.scaler:
            joblib.dump(self.scaler, f"{path}/scaler.pkl")
        
        # Сохраняем метаданные
        metadata = {
            "categories": self.categories,
            "model_version": "1.0",
            "created_at": datetime.now().isoformat()
        }
        
        with open(f"{path}/metadata.json", 'w', encoding='utf-8') as f:
            json.dump(metadata, f, ensure_ascii=False, indent=2)
        
        print(f"✅ Модели сохранены в {path}")
    
    def load_models(self, path: str = "ml_models/"):
        """Загружает обученные модели"""
        import os
        
        if os.path.exists(f"{path}/category_classifier.pkl"):
            self.category_classifier = joblib.load(f"{path}/category_classifier.pkl")
        
        if os.path.exists(f"{path}/subscription_detector.pkl"):
            self.subscription_detector = joblib.load(f"{path}/subscription_detector.pkl")
        
        if os.path.exists(f"{path}/scaler.pkl"):
            self.scaler = joblib.load(f"{path}/scaler.pkl")
        
        if os.path.exists(f"{path}/metadata.json"):
            with open(f"{path}/metadata.json", 'r', encoding='utf-8') as f:
                metadata = json.load(f)
                self.categories = metadata.get("categories", [])
        
        print(f"✅ Модели загружены из {path}")

if __name__ == "__main__":
    # Демонстрация обучения моделей
    print("🚀 Загрузка датасета...")
    
    try:
        with open("financial_dataset.json", 'r', encoding='utf-8') as f:
            dataset = json.load(f)
        transactions = dataset['transactions']
    except FileNotFoundError:
        print("❌ Датасет не найден. Сначала запустите data_generator.py")
        exit(1)
    
    # Создаем и обучаем модели
    ml_models = FinancialMLModels()
    
    # Обучаем классификатор категорий
    category_accuracy = ml_models.train_category_classifier(transactions)
    
    # Обучаем детектор подписок
    subscription_accuracy = ml_models.train_subscription_detector(transactions)
    
    # Сохраняем модели
    ml_models.save_models()
    
    # Демонстрация предсказаний
    print("\n🎯 Демонстрация предсказаний:")
    
    test_transactions = [
        {
            "amount": 1500.50,
            "description": "Магнит Касса 5",
            "merchant": "Магнит",
            "date": datetime.now().isoformat(),
            "is_subscription": False
        },
        {
            "amount": 799.00,
            "description": "Подписка Netflix",
            "merchant": "Netflix",
            "date": datetime.now().isoformat(),
            "is_subscription": True
        }
    ]
    
    for transaction in test_transactions:
        category_pred = ml_models.predict_category(transaction)
        subscription_pred = ml_models.predict_subscription(transaction)
        
        print(f"\n💰 Транзакция: {transaction['description']} ({transaction['amount']}₽)")
        print(f"📂 Категория: {category_pred['category']} (уверенность: {category_pred['confidence']})")
        print(f"🔄 Подписка: {'Да' if subscription_pred['is_subscription'] else 'Нет'} (уверенность: {subscription_pred['confidence']})")
    
    # Генерируем инсайты
    insights = ml_models.get_spending_insights(transactions)
    print(f"\n📊 Всего потрачено: {insights['total_spent']:.2f}₽")
    print(f"💰 Всего доходов: {insights['total_income']:.2f}₽")
    print(f"🔍 Аномалий найдено: {len(insights['anomalies'])}")
