from __future__ import annotations

import re
import unicodedata


def normalize_text(value: str) -> str:
    value = unicodedata.normalize("NFKC", value)
    value = value.replace("ё", "е").replace("Ё", "Е")
    return re.sub(r"\s+", " ", value).strip()


def contains_any(text: str, keywords: list[str]) -> bool:
    lowered = normalize_text(text).lower()
    return any(keyword in lowered for keyword in keywords)


def title_ru(value: str | None) -> str | None:
    if not value:
        return value
    known = {
        "пятерочка": "Пятерочка",
        "пятёрочка": "Пятерочка",
        "пятерочке": "Пятерочка",
        "пятёрочке": "Пятерочка",
        "магнит": "Магнит",
        "netflix": "Netflix",
        "spotify": "Spotify",
    }
    lowered = normalize_text(value).lower()
    return known.get(lowered, value[:1].upper() + value[1:])
