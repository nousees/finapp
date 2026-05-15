from __future__ import annotations

import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any


DEMO_TRANSCRIPTION_TEXT = "потратил 450 рублей на продукты в пятерочке вчера"


@dataclass
class WhisperModel:
    version: str
    real: bool = False
    engine: Any | None = None
    load_error: str | None = None

    def transcribe(self, content: bytes, suffix: str = ".wav") -> dict:
        if not self.real:
            raise RuntimeError(self.load_error or "Whisper model is not loaded")

        with tempfile.NamedTemporaryFile(suffix=suffix, delete=True) as tmp:
            tmp.write(content)
            tmp.flush()
            result = self.engine.transcribe(tmp.name, language="ru")

        return {
            "text": str(result.get("text", "")).strip(),
            "language": str(result.get("language", "ru") or "ru"),
            "confidence": 0.95,
        }


def load_whisper_model(
    enable_real_models: bool,
    model_path: str,
    model_name: str = "large-v3",
    download_root: str | None = None,
) -> WhisperModel:
    if enable_real_models:
        try:
            import whisper

            path = Path(model_path)
            model_ref = resolve_model_reference(path, model_name)
            engine = whisper.load_model(model_ref, download_root=download_root)
            return WhisperModel(version="whisper-large-v3", real=True, engine=engine)
        except Exception as exc:
            return WhisperModel(version="whisper-large-v3", real=False, load_error=str(exc))

    return WhisperModel(version="whisper-disabled", real=False, load_error="ENABLE_REAL_MODELS=false")


def demo_transcription() -> dict:
    return {
        "text": DEMO_TRANSCRIPTION_TEXT,
        "language": "ru",
        "confidence": 0.92,
    }


def resolve_model_reference(path: Path, model_name: str) -> str:
    if path.is_file():
        return str(path)
    if path.is_dir():
        checkpoint = next(path.glob("*.pt"), None)
        if checkpoint is None:
            raise FileNotFoundError(f"No OpenAI Whisper .pt checkpoint found in {path}")
        return str(checkpoint)
    return model_name
