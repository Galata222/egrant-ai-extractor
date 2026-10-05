import re

_CURRENCY = re.compile(r"(?i)(?:eur|usd|gbp|czk)|[€$£]")
_LEGAL_FORM = ("s. r. o", "s.r.o", "a. s.", "a.s.", "ltd", "llc", "gmbh", "spol.")


def blend(anchor: float, recognition: float | None) -> float:
    """Combine a label/validator score with a recognizer probability.

    A missing recognizer score (digital text) keeps the anchor. When a model
    or OCR engine reports a probability, the geometric mean stops a confident
    label from hiding an uncertain read.
    """
    anchor = _clip(anchor)
    if recognition is None:
        return round(anchor, 4)
    recognition = _clip(recognition)
    return round((anchor * recognition) ** 0.5, 4)


def ico_anchor(line: str) -> float:
    folded = line.casefold()
    if "ičo" in folded or re.search(r"\bico\b", _fold_ascii(line)):
        score = 0.97
    elif "company id" in _fold_ascii(line) or "company number" in _fold_ascii(line):
        score = 0.91
    else:
        score = 0.85
    if re.search(r"\d\s+\d", line):
        score -= 0.05
    return score


def dic_anchor(line: str) -> float:
    folded = _fold_ascii(line)
    if "dic" in folded or "dph" in folded:
        return 0.96
    if "vat" in folded or "tax id" in folded:
        return 0.9
    return 0.84


def date_anchor(raw: str) -> float:
    if re.search(r"\d{1,2}\s*\.\s*\d{1,2}\s*\.\s*\d{4}", raw) or re.search(r"\d{4}-\d{2}-\d{2}", raw):
        return 0.96
    if re.search(r"[A-Za-z]", raw):
        return 0.91
    slash = re.search(r"(\d{1,2})/(\d{1,2})/(\d{4})", raw)
    if not slash:
        return 0.8
    first, second = int(slash.group(1)), int(slash.group(2))
    if first > 12:
        return 0.9
    if second > 12:
        return 0.82
    return 0.84


def money_anchor(line: str, specific: bool) -> float:
    has_currency = bool(_CURRENCY.search(line))
    if specific and has_currency:
        return 0.96
    if specific:
        return 0.93
    if has_currency:
        return 0.88
    return 0.76


def number_anchor(value: str) -> float:
    score = 0.93
    if "-" not in value and "/" not in value and not re.search(r"[A-Za-z]", value):
        score -= 0.08
    return score


def name_anchor(name: str) -> float:
    folded = name.casefold()
    if len(name) < 4:
        return 0.74
    if any(token in folded for token in _LEGAL_FORM):
        return 0.93
    return 0.86


def _clip(value: float) -> float:
    if value < 0:
        return 0.0
    if value > 1:
        return 1.0
    return value


def _fold_ascii(text: str) -> str:
    return text.casefold().replace("í", "i").replace("č", "c").replace("ľ", "l")
