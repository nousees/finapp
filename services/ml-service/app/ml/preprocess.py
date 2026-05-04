from app.utils.text import normalize_text


def preprocess_text(text: str) -> str:
    return normalize_text(text)

