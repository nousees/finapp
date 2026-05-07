from fastapi import APIRouter, File, Request, UploadFile

from app.schemas.voice import VoiceTranscriptionResponse

router = APIRouter(prefix="/voice", tags=["voice"])


@router.post("/transcribe", response_model=VoiceTranscriptionResponse)
async def transcribe_voice(request: Request, file: UploadFile = File(...)) -> VoiceTranscriptionResponse:
    return await request.app.state.speech_service.transcribe(file)

