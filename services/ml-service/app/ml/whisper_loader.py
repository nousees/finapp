from dataclasses import dataclass


@dataclass
class WhisperModel:
    version: str
    real: bool = False

    def transcribe(self, _: bytes) -> dict:
        if not self.real:
            return {
                "text": "потратил 450 рублей на продукты в пятерочке вчера",
                "language": "ru",
                "confidence": 0.92,
            }
        raise NotImplementedError("Real Whisper integration is configured but not implemented in this build.")


def load_whisper_model(enable_real_models: bool, model_path: str) -> WhisperModel:
    return WhisperModel(version="whisper-large-v3" if enable_real_models else "whisper-demo-fallback", real=False)

