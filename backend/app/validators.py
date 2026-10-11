import re
import unicodedata
from datetime import date
from decimal import Decimal, InvalidOperation

ICO_WEIGHTS = (8, 7, 6, 5, 4, 3, 2)

_REJECTED_NAMES = {
    "dodavatel",
    "odberatel",
    "faktura",
    "ico",
    "dic",
    "polozky",
    "ic dph",
    "supplier",
    "vendor",
    "seller",
    "customer",
    "buyer",
    "invoice",
    "items",
    "line items",
    "subtotal",
    "total",
}

_MONTHS = {
    "january": 1,
    "jan": 1,
    "february": 2,
    "feb": 2,
    "march": 3,
    "mar": 3,
    "april": 4,
    "apr": 4,
    "may": 5,
    "june": 6,
    "jun": 6,
    "july": 7,
    "jul": 7,
    "august": 8,
    "aug": 8,
    "september": 9,
    "sep": 9,
    "sept": 9,
    "october": 10,
    "oct": 10,
    "november": 11,
    "nov": 11,
    "december": 12,
    "dec": 12,
}


_WHOLE_AMOUNT = re.compile(r"(?i)(?<![\d.,])(\d{1,3}(?: \d{3})+|\d+)(?:,-)?\s*(?:€|eur\b)")


def fold(text: str) -> str:
    decomposed = unicodedata.normalize("NFD", text)
    stripped = "".join(ch for ch in decomposed if unicodedata.category(ch) != "Mn")
    return stripped.lower()


def parse_ico(raw: str | None) -> str | None:
    if not raw:
        return None
    digits = re.sub(r"\D", "", raw)
    if len(digits) != 8:
        return None
    total = sum(int(digit) * weight for digit, weight in zip(digits[:7], ICO_WEIGHTS, strict=True))
    remainder = total % 11
    if remainder == 0:
        check = 1
    elif remainder == 1:
        check = 0
    else:
        check = 11 - remainder
    if check != int(digits[7]):
        return None
    return digits


def parse_dic(raw: str | None) -> str | None:
    if not raw:
        return None
    compact = re.sub(r"[\s.\-]", "", raw).upper()
    if compact.startswith("SK"):
        return compact if re.fullmatch(r"SK\d{10}", compact) else None
    if re.fullmatch(r"[A-Z]{2}[A-Z0-9]{8,12}", compact):
        return compact
    return None


def parse_date(raw: str | None) -> str | None:
    if not raw:
        return None
    dotted = re.search(r"(\d{1,2})\s*\.\s*(\d{1,2})\s*\.\s*(\d{4})", raw)
    if dotted:
        return _format_date(int(dotted.group(3)), int(dotted.group(2)), int(dotted.group(1)))
    iso = re.search(r"(\d{4})-(\d{2})-(\d{2})", raw)
    if iso:
        return _format_date(int(iso.group(1)), int(iso.group(2)), int(iso.group(3)))
    day_month = re.search(r"(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\s+(\d{4})", raw)
    if day_month and day_month.group(2).lower() in _MONTHS:
        return _format_date(int(day_month.group(3)), _MONTHS[day_month.group(2).lower()], int(day_month.group(1)))
    month_day = re.search(r"([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})", raw)
    if month_day and month_day.group(1).lower() in _MONTHS:
        return _format_date(int(month_day.group(3)), _MONTHS[month_day.group(1).lower()], int(month_day.group(2)))
    slash = re.search(r"(\d{1,2})/(\d{1,2})/(\d{4})", raw)
    if slash:
        first, second, year = int(slash.group(1)), int(slash.group(2)), int(slash.group(3))
        european = _format_date(year, second, first)
        if european:
            return european
        return _format_date(year, first, second)
    return None


def parse_money(raw: str | None) -> str | None:
    if not raw:
        return None
    spaced = raw.replace("\u00a0", " ").replace("\u202f", " ")
    text = re.sub(r"(?i)\b(?:eur|usd|gbp|czk)\b|[€$£]", " ", spaced)
    match = re.search(
        r"(\d{1,3}(?:[ .]\d{3})+(?:[.,]\d{2})|\d{1,3}(?:,\d{3})+(?:\.\d{2})|\d+[.,]\d{2})",
        text,
    )
    if not match:
        # "350 €" and "350,- €": a whole amount counts only next to its currency.
        match = _WHOLE_AMOUNT.search(spaced)
    if not match:
        return None
    token = match.group(1).replace(" ", "")
    if "," in token and "." in token:
        if token.rfind(",") > token.rfind("."):
            token = token.replace(".", "").replace(",", ".")
        else:
            token = token.replace(",", "")
    elif "," in token:
        if re.fullmatch(r"\d{1,3}(?:,\d{3})+", token):
            token = token.replace(",", "")
        else:
            token = token.replace(",", ".")
    try:
        value = Decimal(token)
    except InvalidOperation:
        return None
    if value < 0 or value > Decimal("100000000"):
        return None
    return f"{value:.2f}"


def _format_date(year: int, month: int, day: int) -> str | None:
    try:
        date(year, month, day)
    except ValueError:
        return None
    return f"{day:02d}.{month:02d}.{year:04d}"


def parse_invoice_number(raw: str | None) -> str | None:
    if not raw:
        return None
    text = re.sub(r"\s+", "", raw).strip()
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9/\-]{1,39}", text):
        return None
    if not re.search(r"\d", text):
        return None
    if parse_date(text):
        return None
    if re.fullmatch(r"\d+,\d{2}", text) or re.fullmatch(r"\d+\.\d{2}", text):
        return None
    return text


def parse_supplier_name(raw: str | None) -> str | None:
    if not raw:
        return None
    text = re.sub(r"\s+", " ", raw).strip(" \t:-")
    if len(text) < 2 or len(text) > 160:
        return None
    if not re.search(r"[A-Za-zÀ-ž]", text):
        return None
    if fold(text) in _REJECTED_NAMES:
        return None
    if parse_ico(text):
        return None
    return text


def parse_description(raw: str | None) -> str | None:
    return parse_supplier_name(raw)
