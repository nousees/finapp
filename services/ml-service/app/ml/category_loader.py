from dataclasses import dataclass


@dataclass
class CategoryModel:
    version: str
    real: bool = False


def load_category_model(enable_real_models: bool, model_path: str) -> CategoryModel:
    return CategoryModel(
        version="catboost-cnn-ensemble-v1" if enable_real_models else "catboost-cnn-ensemble-v1",
        real=False,
    )

