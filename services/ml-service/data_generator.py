#!/usr/bin/env python3
"""
Генератор синтетических финансовых данных для ML модели
"""

import json
import random
import uuid
from datetime import datetime, timedelta
from typing import List, Dict
import pandas as pd

class FinancialDataGenerator:
    def __init__(self):
        # Категории расходов
        self.categories = {
            "еда": ["Магнит", "Пятерочка", "Лента", "Ашан", "Перекресток", "Супермаркет", "Продукты"],
            "транспорт": ["Яндекс Go", "Gett", "Такси", "Метро", "Автобус", "Троллейбус", "Бензин", "Газ"],
            "развлечения": ["Кино", "Театр", "Концерт", "Ресторан", "Кафе", "Бар", "Клуб"],
            "подписки": ["Netflix", "Spotify", "YouTube Premium", "Яндекс Музыка", "VK Музыка", "Apple Music"],
            "коммунальные": ["ЖКХ", "Электричество", "Вода", "Газ", "Интернет", "Телефония"],
            "одежда": ["H&M", "Zara", "Uniqlo", "Магазин одежды", "Обувь", "Аксессуары"],
            "здоровье": ["Аптека", "Больница", "Врач", "Анализ", "Лекарства", "Стоматология"],
            "образование": ["Курсы", "Книги", "Онлайн обучение", "Школа", "Университет"],
            "прочее": ["Подарок", "Налоги", "Штрафы", "Кредит", "Ипотека", "Страховка"]
        }
        
        # Типичные суммы для категорий
        self.category_amounts = {
            "еда": (100, 5000),
            "транспорт": (50, 2000),
            "развлечения": (200, 10000),
            "подписки": (199, 999),
            "коммунальные": (1000, 15000),
            "одежда": (500, 20000),
            "здоровье": (100, 8000),
            "образование": (500, 15000),
            "прочее": (100, 50000)
        }
        
        # Подписочные сервисы
        self.subscriptions = {
            "Netflix": {"amount": 799, "frequency": "monthly"},
            "Spotify": {"amount": 199, "frequency": "monthly"},
            "YouTube Premium": {"amount": 259, "frequency": "monthly"},
            "Яндекс Музыка": {"amount": 169, "frequency": "monthly"},
            "VK Музыка": {"amount": 149, "frequency": "monthly"},
            "Apple Music": {"amount": 299, "frequency": "monthly"},
            "Интернет": {"amount": 500, "frequency": "monthly"},
            "Мобильная связь": {"amount": 300, "frequency": "monthly"}
        }

    def generate_transaction(self, date: datetime, is_subscription: bool = False) -> Dict:
        """Генерирует одну транзакцию"""
        category = random.choice(list(self.categories.keys()))
        merchants = self.categories[category]
        merchant = random.choice(merchants)
        
        # Определяем сумму
        if is_subscription and category == "подписки":
            subscription_info = random.choice(list(self.subscriptions.items()))
            merchant, sub_info = subscription_info
            amount = sub_info["amount"]
        else:
            min_amount, max_amount = self.category_amounts[category]
            amount = random.uniform(min_amount, max_amount)
        
        # Генерируем описание
        descriptions = [
            f"{merchant} Касса {random.randint(1, 20)}",
            f"Оплата {merchant.lower()}",
            f"{merchant} Терминнал",
            f"Перевод {merchant}",
            f"Покупка {merchant.lower()}",
            f"Списание {merchant.lower()}",
            f"{merchant} Онлайн",
            f"Транзакция {merchant}"
        ]
        description = random.choice(descriptions)
        
        # Определяем тип (в основном расходы)
        transaction_type = "expense" if random.random() > 0.1 else "income"
        if transaction_type == "income":
            amount = amount * 0.7  # Доходы обычно меньше расходов
            category = "зарплата" if random.random() > 0.5 else "подарок"
            merchants = ["Работа", "Компания", "Организация", "Фирма"]
            merchant = random.choice(merchants)
        
        transaction = {
            "id": str(uuid.uuid4()),
            "amount": round(amount, 2),
            "description": description,
            "category": category,
            "date": date.isoformat(),
            "type": transaction_type,
            "merchant": merchant,
            "is_subscription": is_subscription,
            "confidence": round(random.uniform(0.7, 0.99), 2)
        }
        
        return transaction

    def generate_dataset(self, num_transactions: int = 10000, months: int = 12) -> List[Dict]:
        """Генерирует полный датасет"""
        transactions = []
        end_date = datetime.now()
        start_date = end_date - timedelta(days=30 * months)
        
        # Генерируем транзакции по дням
        current_date = start_date
        while current_date <= end_date:
            # Количество транзакций в день (2-8)
            daily_transactions = random.randint(2, 8)
            
            for _ in range(daily_transactions):
                # 10% chance для подписки
                is_subscription = random.random() < 0.1
                
                # Добавляем случайное время в течение дня
                transaction_time = current_date.replace(
                    hour=random.randint(8, 22),
                    minute=random.randint(0, 59),
                    second=random.randint(0, 59)
                )
                
                transaction = self.generate_transaction(transaction_time, is_subscription)
                transactions.append(transaction)
            
            current_date += timedelta(days=1)
        
        # Добавляем регулярные подписки
        for subscription_name, sub_info in self.subscriptions.items():
            subscription_date = start_date
            while subscription_date <= end_date:
                if subscription_date.day == 1:  # Подписки в начале месяца
                    transaction = {
                        "id": str(uuid.uuid4()),
                        "amount": sub_info["amount"],
                        "description": f"Подписка {subscription_name}",
                        "category": "подписки",
                        "date": subscription_date.isoformat(),
                        "type": "expense",
                        "merchant": subscription_name,
                        "is_subscription": True,
                        "confidence": 0.99
                    }
                    transactions.append(transaction)
                
                subscription_date += timedelta(days=30)
        
        # Перемешиваем и ограничиваем количество
        random.shuffle(transactions)
        return transactions[:num_transactions]

    def save_dataset(self, transactions: List[Dict], filename: str = "financial_data.json"):
        """Сохраняет датасет в файл"""
        dataset = {
            "metadata": {
                "total_transactions": len(transactions),
                "categories": list(self.categories.keys()),
                "date_range": {
                    "start": min(t["date"] for t in transactions),
                    "end": max(t["date"] for t in transactions)
                }
            },
            "transactions": transactions
        }
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(dataset, f, ensure_ascii=False, indent=2)
        
        print(f"✅ Датасет сохранен в {filename}")
        print(f"📊 Всего транзакций: {len(transactions)}")
        
        # Вывод статистику
        df = pd.DataFrame(transactions)
        print(f"\n📈 Статистика по категориям:")
        print(df['category'].value_counts())
        
        print(f"\n💰 Средние суммы по категориям:")
        print(df.groupby('category')['amount'].mean().round(2))

    def generate_training_data(self, transactions: List[Dict]) -> Dict:
        """Генерирует данные для обучения ML моделей"""
        df = pd.DataFrame(transactions)
        
        # Для классификации категорий
        classification_data = []
        for _, transaction in df.iterrows():
            features = {
                "amount": transaction["amount"],
                "description_length": len(transaction["description"]),
                "has_numbers": any(c.isdigit() for c in transaction["description"]),
                "merchant_length": len(transaction["merchant"]),
                "day_of_week": datetime.fromisoformat(transaction["date"]).weekday(),
                "hour": datetime.fromisoformat(transaction["date"]).hour,
                "is_subscription": transaction["is_subscription"]
            }
            classification_data.append({
                "features": features,
                "target": transaction["category"]
            })
        
        # Для детекции подписок
        subscription_data = []
        for _, transaction in df.iterrows():
            features = {
                "amount": transaction["amount"],
                "description": transaction["description"],
                "merchant": transaction["merchant"],
                "day_of_month": datetime.fromisoformat(transaction["date"]).day,
                "is_regular_amount": self._is_regular_amount(transaction["amount"])
            }
            subscription_data.append({
                "features": features,
                "target": 1 if transaction["is_subscription"] else 0
            })
        
        return {
            "classification": classification_data,
            "subscription_detection": subscription_data
        }
    
    def _is_regular_amount(self, amount: float) -> bool:
        """Проверяет, является ли сумма типичной для подписки"""
        subscription_amounts = [149, 169, 199, 259, 299, 500, 799, 999]
        return any(abs(amount - sub_amount) < 10 for sub_amount in subscription_amounts)

if __name__ == "__main__":
    generator = FinancialDataGenerator()
    
    # Генерируем датасет
    print("🔄 Генерация датасета...")
    transactions = generator.generate_dataset(num_transactions=50000, months=24)
    
    # Сохраняем датасет
    generator.save_dataset(transactions, "financial_dataset.json")
    
    # Генерируем обучающие данные
    print("\n🎯 Генерация обучающих данных...")
    training_data = generator.generate_training_data(transactions)
    
    with open("training_data.json", 'w', encoding='utf-8') as f:
        json.dump(training_data, f, ensure_ascii=False, indent=2)
    
    print("✅ Обучающие данные сохранены в training_data.json")
    print(f"📊 Данных для классификации: {len(training_data['classification'])}")
    print(f"🔍 Данных для детекции подписок: {len(training_data['subscription_detection'])}")
