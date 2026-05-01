#!/usr/bin/env python3
"""
Скрипт для быстрой настройки ML сервиса FinApp
"""

import os
import sys
import subprocess
import json
from pathlib import Path

def check_dependencies():
    """Проверяет наличие необходимых зависимостей"""
    print("🔍 Проверка зависимостей...")
    
    required_packages = [
        "scikit-learn",
        "pandas", 
        "numpy",
        "joblib",
        "fastapi",
        "uvicorn"
    ]
    
    missing_packages = []
    
    for package in required_packages:
        try:
            __import__(package.replace("-", "_"))
            print(f"✅ {package}")
        except ImportError:
            print(f"❌ {package}")
            missing_packages.append(package)
    
    if missing_packages:
        print(f"\n📦 Установка недостающих пакетов: {missing_packages}")
        subprocess.check_call([sys.executable, "-m", "pip", "install"] + missing_packages)
        print("✅ Все зависимости установлены")
    else:
        print("✅ Все зависимости уже установлены")

def generate_dataset():
    """Генерирует датасет для обучения"""
    print("\n🔄 Генерация датасета...")
    
    try:
        from data_generator import FinancialDataGenerator
        
        generator = FinancialDataGenerator()
        transactions = generator.generate_dataset(num_transactions=15000, months=18)
        generator.save_dataset(transactions, "financial_dataset.json")
        
        # Генерируем обучающие данные
        training_data = generator.generate_training_data(transactions)
        
        with open("training_data.json", 'w', encoding='utf-8') as f:
            json.dump(training_data, f, ensure_ascii=False, indent=2)
        
        print("✅ Датасет успешно сгенерирован")
        return True
        
    except Exception as e:
        print(f"❌ Ошибка генерации датасета: {e}")
        return False

def train_models():
    """Обучает ML модели"""
    print("\n🎯 Обучение ML моделей...")
    
    try:
        from ml_models import FinancialMLModels
        
        # Загрузка датасета
        with open("financial_dataset.json", 'r', encoding='utf-8') as f:
            dataset = json.load(f)
        transactions = dataset['transactions']
        
        # Создание и обучение моделей
        ml_models = FinancialMLModels()
        
        print("📊 Обучение классификатора категорий...")
        category_accuracy = ml_models.train_category_classifier(transactions)
        
        print("🔍 Обучение детектора подписок...")
        subscription_accuracy = ml_models.train_subscription_detector(transactions)
        
        # Сохранение моделей
        ml_models.save_models()
        
        print(f"\n✅ Обучение завершено!")
        print(f"📈 Точность классификатора категорий: {category_accuracy:.3f}")
        print(f"🎯 Точность детектора подписок: {subscription_accuracy:.3f}")
        
        return True
        
    except Exception as e:
        print(f"❌ Ошибка обучения моделей: {e}")
        return False

def test_models():
    """Тестирует обученные модели"""
    print("\n🧪 Тестирование ML моделей...")
    
    try:
        from ml_models import FinancialMLModels
        from datetime import datetime
        
        ml_models = FinancialMLModels()
        ml_models.load_models()
        
        # Тестовые транзакции
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
            },
            {
                "amount": 300.00,
                "description": "Яндекс Go Тариф",
                "merchant": "Яндекс Go",
                "date": datetime.now().isoformat(),
                "is_subscription": False
            },
            {
                "amount": 169.00,
                "description": "Яндекс Музыка",
                "merchant": "Яндекс Музыка",
                "date": datetime.now().isoformat(),
                "is_subscription": True
            }
        ]
        
        print("\n🎯 Результаты тестирования:")
        for i, transaction in enumerate(test_transactions, 1):
            print(f"\n--- Тест {i} ---")
            print(f"💰 Транзакция: {transaction['description']} ({transaction['amount']}₽)")
            
            # Предсказание категории
            category_pred = ml_models.predict_category(transaction)
            print(f"📂 Категория: {category_pred['category']} (уверенность: {category_pred['confidence']})")
            
            # Детекция подписки
            subscription_pred = ml_models.predict_subscription(transaction)
            print(f"🔄 Подписка: {'Да' if subscription_pred['is_subscription'] else 'Нет'} (уверенность: {subscription_pred['confidence']})")
        
        # Тест анализа расходов
        with open("financial_dataset.json", 'r', encoding='utf-8') as f:
            dataset = json.load(f)
        
        insights = ml_models.get_spending_insights(dataset['transactions'][:1000])
        
        print(f"\n📊 Анализ расходов (1000 транзакций):")
        print(f"💰 Всего потрачено: {insights['total_spent']:.2f}₽")
        print(f"💸 Всего доходов: {insights['total_income']:.2f}₽")
        print(f"🔍 Аномалий найдено: {len(insights['anomalies'])}")
        
        return True
        
    except Exception as e:
        print(f"❌ Ошибка тестирования: {e}")
        return False

def start_ml_service():
    """Запускает ML сервис"""
    print("\n🚀 Запуск ML сервиса...")
    
    try:
        import uvicorn
        
        print("🌐 ML сервис запускается на http://localhost:8000")
        print("📖 Документация API: http://localhost:8000/docs")
        print("🔍 Статус моделей: http://localhost:8000/api/v1/ml/status")
        
        uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
        
    except Exception as e:
        print(f"❌ Ошибка запуска сервиса: {e}")

def main():
    """Основная функция"""
    print("🤖 FinApp ML Service Setup")
    print("=" * 50)
    
    # Шаг 1: Проверка зависимостей
    if not check_dependencies():
        print("❌ Не удалось установить зависимости")
        return
    
    # Шаг 2: Генерация датасета
    if not generate_dataset():
        print("❌ Не удалось сгенерировать датасет")
        return
    
    # Шаг 3: Обучение моделей
    if not train_models():
        print("❌ Не удалось обучить модели")
        return
    
    # Шаг 4: Тестирование моделей
    if not test_models():
        print("❌ Не удалось протестировать модели")
        return
    
    # Шаг 5: Запуск сервиса
    print("\n✅ Настройка завершена успешно!")
    print("🚀 Запуск ML сервиса...")
    
    start_ml_service()

if __name__ == "__main__":
    main()
