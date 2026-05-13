from pathlib import Path

from fastapi import UploadFile

from app.core.errors import AudioTooLargeError, UnsupportedAudioFormatError


SUPPORTED_AUDIO_EXTENSIONS = {"wav", "mp3", "m4a", "ogg"}
SUPPORTED_AUDIO_TYPES = {
    "audio/wav",
    "audio/x-wav",
    "audio/mpeg",
    "audio/mp3",
    "audio/mp4",
    "audio/m4a",
    "audio/aac",
    "audio/ogg",
    "audio/webm",
}


def validate_audio_file(file: UploadFile, size_bytes: int, max_size_mb: int, max_size_bytes: int) -> None:
    extension = Path(file.filename or "").suffix.lower().lstrip(".")
    content_type = (file.content_type or "").split(";")[0].lower()
    if extension not in SUPPORTED_AUDIO_EXTENSIONS and content_type not in SUPPORTED_AUDIO_TYPES:
        raise UnsupportedAudioFormatError(extension or content_type or "unknown")
    if size_bytes > max_size_bytes:
        raise AudioTooLargeError(max_size_mb)

