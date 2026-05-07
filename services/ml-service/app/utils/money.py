from __future__ import annotations

import re


AMOUNT_RE = re.compile(r"(?<!\d)(\d{1,9}(?:[ .,]\d{3})*(?:[,.]\d{1,2})?|\d{1,9})(?!\d)")


def extract_amount(text: str) -> float | None:
    match = AMOUNT_RE.search(text)
    if not match:
        return None
    raw = match.group(1).replace(" ", "")
    if "," in raw and "." in raw:
        raw = raw.replace(".", "").replace(",", ".")
    else:
        raw = raw.replace(",", ".")
    try:
        return float(raw)
    except ValueError:
        return None


def extract_currency(text: str) -> str:
    lowered = text.lower()
    if any(token in lowered for token in ["доллар", "usd", "$"]):
        return "USD"
    if any(token in lowered for token in ["евро", "eur", "€"]):
        return "EUR"
    return "RUB"
