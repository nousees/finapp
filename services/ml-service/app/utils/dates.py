from __future__ import annotations

from datetime import date, timedelta
import re


def extract_date(text: str, today: date | None = None) -> date:
    today = today or date.today()
    lowered = text.lower()
    if "позавчера" in lowered:
        return today - timedelta(days=2)
    if "вчера" in lowered:
        return today - timedelta(days=1)
    if "завтра" in lowered:
        return today + timedelta(days=1)
    match = re.search(r"\b(\d{1,2})[./-](\d{1,2})(?:[./-](\d{2,4}))?\b", lowered)
    if match:
        day = int(match.group(1))
        month = int(match.group(2))
        year = int(match.group(3) or today.year)
        if year < 100:
            year += 2000
        try:
            return date(year, month, day)
        except ValueError:
            return today
    return today
