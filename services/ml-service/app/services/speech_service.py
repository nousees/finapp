from fastapi import UploadFile

from app.core.config import Settings
from app.core.errors import ModelUnavailableError
from app.ml.whisper_loader import WhisperModel, load_whisper_model
from app.schemas.voice import VoiceTranscriptionResponse
from app.utils.audio import validate_audio_file


class SpeechService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.model: WhisperModel = load_whisper_model(settings.enable_real_models, settings.whisper_model_path)

    async def transcribe(self, file: UploadFile) -> VoiceTranscriptionResponse:
        content = await file.read()
        validate_audio_file(
            file=file,
            size_bytes=len(content),
            max_size_mb=self.settings.max_audio_size_mb,
            max_size_bytes=self.settings.max_audio_size_bytes,
        )
        if not self.settings.enable_real_models and not self.settings.test_mode:
            raise ModelUnavailableError("Whisper")
        result = self.model.transcribe(content)
        return VoiceTranscriptionResponse(**result)
