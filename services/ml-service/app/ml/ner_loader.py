from dataclasses import dataclass


@dataclass
class NERModel:
    version: str
    real: bool = False


def load_ner_model(enable_real_models: bool, model_path: str) -> NERModel:
    return NERModel(version="rubert-tiny-ner-v1" if enable_real_models else "heuristic-ner-v1", real=False)

