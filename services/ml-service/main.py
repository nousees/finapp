from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
from typing import List, Optional, Dict, Any
import logging
import json
from datetime import datetime
from ml_models import FinancialMLModels

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Инициализация ML моделей
ml_models = FinancialMLModels()

# Попытка загрузить предобученные модели
try:
    ml_models.load_models()
    logger.info("✅ ML модели загружены")
except:
    logger.warning("⚠️ ML модели не найдены, нужно обучить сначала")

app = FastAPI(
    title="FinApp ML Service",
    description="ML сервис для обработки транзакций и голосового ввода",
    version="1.0.0"
)

# CORS для разработки
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Модели данных
class TranscriptionRequest(BaseModel):
    audio_url: str
    
class TranscriptionResponse(BaseModel):
    text: str
    confidence: float
    entities: dict

class CategorizationRequest(BaseModel):
    description: str
    amount: float
    type: str
    
class CategorizationResponse(BaseModel):
    category_id: str
    category_name: str
    confidence: float

# Health check
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "ml-service"}

# Тестовая транскрипция (заглушка)
@app.post("/api/v1/ml/transcribe", response_model=TranscriptionResponse)
async def transcribe_audio(request: TranscriptionRequest):
    """Транскрибация аудио в текст (заглушка для теста)"""
    logger.info(f"Transcription request for: {request.audio_url}")
    
    # Заглушка - в реальности здесь будет Whisper
    return TranscriptionResponse(
        text="Купил кофе в старбакс за 350 рублей",
        confidence=0.95,
        entities={
            "amount": 350,
            "currency": "RUB",
            "merchant": "старбакс",
            "category": "Продукты"
        }
    )

# Реальная категоризация транзакций
@app.post("/api/v1/ml/categorize")
async def categorize_transaction(request: Dict[str, Any]):
    """Автоматическая категоризация транзакции с помощью ML"""
    logger.info(f"Categorization request: {request}")
    
    try:
        # Используем ML модель для предсказания
        prediction = ml_models.predict_category(request)
        
        return {
            "category": prediction["category"],
            "confidence": prediction["confidence"],
            "probabilities": prediction.get("probabilities", {}),
            "success": True
        }
    except Exception as e:
        logger.error(f"Categorization error: {e}")
        # Fallback на простую эвристику
        description_lower = request.get("description", "").lower()
        
        if "кофе" in description_lower or "старбакс" in description_lower:
            category = "еда"
            confidence = 0.8
        elif "зарплата" in description_lower:
            category = "зарплата"
            confidence = 0.9
        else:
            category = "прочее"
            confidence = 0.5
        
        return {
            "category": category,
            "confidence": confidence,
            "success": True,
            "fallback": True
        }

# Детекция подписок
@app.post("/api/v1/ml/detect-subscription")
async def detect_subscription(request: Dict[str, Any]):
    """Детекция подписок с помощью ML"""
    logger.info(f"Subscription detection request: {request}")
    
    try:
        prediction = ml_models.predict_subscription(request)
        
        return {
            "is_subscription": prediction["is_subscription"],
            "confidence": prediction["confidence"],
            "success": True
        }
    except Exception as e:
        logger.error(f"Subscription detection error: {e}")
        return {
            "is_subscription": False,
            "confidence": 0.0,
            "success": False,
            "error": str(e)
        }

# Анализ расходов и генерация инсайтов
@app.post("/api/v1/ml/analyze-spending")
async def analyze_spending(request: Dict[str, Any]):
    """Анализ расходов и генерация финансовых инсайтов"""
    logger.info(f"Spending analysis request with {len(request.get('transactions', []))} transactions")
    
    try:
        transactions = request.get("transactions", [])
        insights = ml_models.get_spending_insights(transactions)
        
        return {
            "insights": insights,
            "success": True
        }
    except Exception as e:
        logger.error(f"Spending analysis error: {e}")
        return {
            "insights": {},
            "success": False,
            "error": str(e)
        }

# Обучение моделей
@app.post("/api/v1/ml/train")
async def train_models(request: Dict[str, Any]):
    """Обучение ML моделей на новых данных"""
    logger.info("Training models request")
    
    try:
        transactions = request.get("transactions", [])
        
        if len(transactions) < 100:
            return {
                "success": False,
                "error": "Недостаточно данных для обучения (минимум 100 транзакций)"
            }
        
        # Обучаем модели
        category_accuracy = ml_models.train_category_classifier(transactions)
        subscription_accuracy = ml_models.train_subscription_detector(transactions)
        
        # Сохраняем модели
        ml_models.save_models()
        
        return {
            "success": True,
            "category_accuracy": category_accuracy,
            "subscription_accuracy": subscription_accuracy,
            "training_data_size": len(transactions)
        }
    except Exception as e:
        logger.error(f"Training error: {e}")
        return {
            "success": False,
            "error": str(e)
        }

# Статус ML моделей
@app.get("/api/v1/ml/status")
async def ml_status():
    """Проверка статуса ML моделей"""
    return {
        "models_loaded": ml_models.category_classifier is not None,
        "categories": ml_models.categories,
        "subscription_detector_loaded": ml_models.subscription_detector is not None,
        "service": "ml-service",
        "version": "1.0.0"
    }

# Извлечение сущностей
@app.post("/api/v1/ml/extract")
async def extract_entities(request: CategorizationRequest):
    """Извлечение финансовых сущностей из текста"""
    logger.info(f"Entity extraction request: {request.description}")
    
    # Заглушка для извлечения сущностей
    return {
        "amount": request.amount,
        "currency": "RUB",
        "merchant": "неизвестно",
        "category": "общее",
        "confidence": 0.7
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
