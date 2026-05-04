from pathlib import Path

from fastapi import UploadFile

from app.core.errors import AudioTooLargeError, UnsupportedAudioFormatError


SUPPORTED_AUDIO_EXTENSIONS = {"wav", "mp3", "m4a", "ogg"}


def validate_audio_file(file: UploadFile, size_bytes: int, max_size_mb: int, max_size_bytes: int) -> None:
    extension = Path(file.filename or "").suffix.lower().lstrip(".")
    if extension not in SUPPORTED_AUDIO_EXTENSIONS:
        raise UnsupportedAudioFormatError(extension or "unknown")
    if size_bytes > max_size_bytes:
        raise AudioTooLargeError(max_size_mb)

