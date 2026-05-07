from pydantic import BaseModel, Field


class VoiceTranscriptionResponse(BaseModel):
    text: str
    language: str = "ru"
    confidence: float = Field(ge=0, le=1)

