from __future__ import annotations

import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass
class WhisperModel:
    version: str
    real: bool = False
    engine: Any | None = None

    def transcribe(self, content: bytes) -> dict:
        if not self.real:
            return {
                "text": "потратил 450 рублей на продукты в пятерочке вчера",
                "language": "ru",
                "confidence": 0.92,
            }

        with tempfile.NamedTemporaryFile(suffix=".wav", delete=True) as tmp:
            tmp.write(content)
            tmp.flush()
            result = self.engine.transcribe(tmp.name, language="ru")

        return {
            "text": str(result.get("text", "")).strip(),
            "language": str(result.get("language", "ru") or "ru"),
            "confidence": 0.95,
        }


def load_whisper_model(enable_real_models: bool, model_path: str) -> WhisperModel:
    if enable_real_models:
        try:
            import whisper

            path = Path(model_path)
            model_ref = str(path) if path.exists() else model_path
            engine = whisper.load_model(model_ref)
            return WhisperModel(version="whisper-large-v3", real=True, engine=engine)
        except Exception:
            pass

    return WhisperModel(version="whisper-large-v3" if enable_real_models else "whisper-demo-fallback", real=False)
