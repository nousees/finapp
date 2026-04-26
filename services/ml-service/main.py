from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
from typing import List, Optional
import logging

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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

# Тестовая категоризация (заглушка)
@app.post("/api/v1/ml/categorize", response_model=CategorizationResponse)
async def categorize_transaction(request: CategorizationRequest):
    """Автоматическая категоризация транзакции (заглушка для теста)"""
    logger.info(f"Categorization request: {request.description}")
    
    # Простая эвристика для заглушки
    description_lower = request.description.lower()
    
    if "кофе" in description_lower or "старбакс" in description_lower:
        category_id = "11111111-1111-1111-1111-111111111111"
        category_name = "Продукты"
        confidence = 0.92
    elif "зарплата" in description_lower:
        category_id = "22222222-2222-2222-2222-222222222222"
        category_name = "Зарплата"
        confidence = 0.98
    else:
        category_id = "11111111-1111-1111-1111-111111111111"
        category_name = "Продукты"
        confidence = 0.75
    
    return CategorizationResponse(
        category_id=category_id,
        category_name=category_name,
        confidence=confidence
    )

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
