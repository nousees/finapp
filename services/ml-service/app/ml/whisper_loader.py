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
    model_ref: str | None = None
    provider: str = "transformers"

    def transcribe(self, content: bytes, suffix: str = ".wav") -> dict:
        if not self.real or self.engine is None:
            raise RuntimeError(self.load_error or "Whisper model is not loaded")

        with tempfile.NamedTemporaryFile(suffix=suffix, delete=True) as tmp:
            tmp.write(content)
            tmp.flush()
            result = self.engine(
                tmp.name,
                generate_kwargs={
                    "language": "russian",
                    "task": "transcribe",
                },
            )

        return {
            "text": str(result.get("text", "")).strip(),
            "language": "ru",
            "confidence": 0.95,
        }


def load_whisper_model(
    enable_real_models: bool,
    model_id: str = "openai/whisper-large-v3",
    model_path: str = "",
    download_root: str | None = None,
) -> WhisperModel:
    if not enable_real_models:
        return WhisperModel(version="whisper-disabled", real=False, load_error="ENABLE_REAL_MODELS=false")

    try:
        import torch
        from transformers import AutoModelForSpeechSeq2Seq, AutoProcessor, pipeline

        model_ref = resolve_model_reference(Path(model_path), model_id)
        device = "cuda:0" if torch.cuda.is_available() else "cpu"
        device_index = 0 if torch.cuda.is_available() else -1
        torch_dtype = torch.float16 if torch.cuda.is_available() else torch.float32

        processor = AutoProcessor.from_pretrained(model_ref, cache_dir=download_root)
        model = AutoModelForSpeechSeq2Seq.from_pretrained(
            model_ref,
            torch_dtype=torch_dtype,
            low_cpu_mem_usage=True,
            use_safetensors=True,
            cache_dir=download_root,
        )
        model.to(device)

        whisper_pipe = pipeline(
            "automatic-speech-recognition",
            model=model,
            tokenizer=processor.tokenizer,
            feature_extractor=processor.feature_extractor,
            torch_dtype=torch_dtype,
            device=device_index,
        )

        return WhisperModel(
            version=f"transformers:{model_ref}",
            real=True,
            engine=whisper_pipe,
            model_ref=model_ref,
        )
    except Exception as exc:
        return WhisperModel(
            version=f"transformers:{model_id}",
            real=False,
            load_error=str(exc),
            model_ref=model_id,
        )


def demo_transcription() -> dict:
    return {
        "text": DEMO_TRANSCRIPTION_TEXT,
        "language": "ru",
        "confidence": 0.92,
    }


def resolve_model_reference(path: Path, model_id: str) -> str:
    if path.is_dir() and (path / "config.json").exists():
        return str(path)
    if path.is_dir() and any(path.glob("snapshots/*/config.json")):
        return str(next(path.glob("snapshots/*")))
    return model_id
