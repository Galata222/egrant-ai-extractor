import io
import re
from datetime import date, datetime
from decimal import Decimal, InvalidOperation

import openpyxl
from PIL import Image, ImageDraw, ImageFont

from app.gate import accept, empty
from app.ingest import IngestError
from app.ocr_extract import Draft, LineCandidate
from app.validators import fold, parse_date, parse_money

_FONT_CANDIDATES = (
    r"C:\Windows\Fonts\arial.ttf",
    r"C:\Windows\Fonts\segoeui.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
)


def is_xlsx(data: bytes, filename: str) -> bool:
    return filename.lower().endswith(".xlsx") and data.startswith(b"PK")


def extract_xlsx(data: bytes) -> tuple[Draft, Image.Image]:
    try:
        workbook = openpyxl.load_workbook(io.BytesIO(data), data_only=True, read_only=True)
    except Exception as exc:
        raise IngestError("unreadable_file") from exc
    try:
        sheet = workbook.active
        if sheet is None:
            raise IngestError("unreadable_file")
        grid = [list(row) for row in sheet.iter_rows(values_only=True)]
    finally:
        workbook.close()
    if not grid:
        raise IngestError("empty_file")
    columns = _columns(grid[0])
    if "amount" not in columns or not ({"number", "supplier", "subject"} & set(columns)):
        raise IngestError("unreadable_file")
    records = [_record(row, columns) for row in grid[1:]]
    records = [record for record in records if record is not None]
    if not records:
        raise IngestError("empty_file")
    return _draft(records), _preview(records)


def _columns(header: tuple | list) -> dict[str, int]:
    found: dict[str, int] = {}
    for index, cell in enumerate(header):
        key = _column_key(cell)
        if key and key not in found:
            found[key] = index
    return found


def _column_key(cell: object) -> str | None:
    if cell is None:
        return None
    folded = re.sub(r"\s+", " ", fold(str(cell)).replace("\n", " ")).strip()
    if "predmet" in folded:
        return "subject"
    if folded == "dodavatel":
        return "supplier"
    if folded == "suma":
        return "amount"
    if "zo dna" in folded:
        return "issued"
    if "cislo kontraktu" in folded:
        return "contract_no"
    if "typ kontraktu" in folded:
        return "contract_type"
    if folded == "dna":
        return "paid"
    if "druh" in folded:
        return "kind"
    if "cislo" in folded and "kontrakt" not in folded:
        return "number"
    if folded in {"faktura", "fa"}:
        return "invoice"
    if folded == "objednavka":
        return "order"
    if folded == "plnenie":
        return "proof"
    return None


def _record(row: tuple | list, columns: dict[str, int]) -> dict | None:
    def cell(key: str) -> object:
        index = columns.get(key)
        if index is None or index >= len(row):
            return None
        return row[index]

    amount = _amount(cell("amount"))
    if amount is None and _blank(cell("number")) and _blank(cell("supplier")) and _blank(cell("subject")):
        return None
    issued = _issued(cell("issued"))
    description = _description(cell("number"), _format(issued) if issued else None, cell("supplier"), cell("subject")) or "doklad"
    return {
        "description": description,
        "amount": amount,
        "issued": issued,
        "invoice": _text(cell("invoice")),
        "order": _text(cell("order")),
        "proof": _text(cell("proof")),
    }


def _text(value: object) -> str | None:
    if value is None:
        return None
    text = re.sub(r"\s+", " ", str(value)).strip()
    if not text or text.lower() == "none":
        return None
    return text


def _blank(value: object) -> bool:
    return value is None or not str(value).strip()


def _description(number: object, issued: object, supplier: object, subject: object) -> str | None:
    parts: list[str] = []
    for value in (number, issued, supplier, subject):
        if value is None:
            continue
        text = re.sub(r"\s+", " ", str(value)).strip()
        if text and text.lower() != "none":
            parts.append(text)
    if not parts:
        return None
    text = " — ".join(parts)
    if len(text) > 180:
        return text[:177] + "..."
    return text


def _amount(value: object) -> str | None:
    if isinstance(value, bool) or value is None:
        return None
    if isinstance(value, (int, float, Decimal)):
        try:
            quantized = Decimal(str(value)).quantize(Decimal("0.01"))
        except InvalidOperation:
            return None
        return f"{quantized:.2f}"
    return parse_money(str(value))


def _issued(value: object) -> date | None:
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    parsed = parse_date(None if value is None else str(value))
    if not parsed:
        return None
    day, month, year = (int(part) for part in parsed.split("."))
    return date(year, month, day)


def _draft(records: list[dict]) -> Draft:
    dates = [record["issued"] for record in records if record["issued"] is not None]
    total = sum((Decimal(record["amount"]) for record in records if record["amount"] is not None), Decimal("0.00"))
    period = None
    if dates:
        start, end = min(dates), max(dates)
        period = f"{_format(start)} – {_format(end)}"
    lines = [
        LineCandidate(
            accept(record["description"], 1),
            accept(record["amount"], 1),
            accept(record.get("invoice"), 1) if record.get("invoice") else empty(),
            accept(_file_id(record.get("invoice")), 1) if _file_id(record.get("invoice")) else empty(),
            accept(record.get("order"), 1) if record.get("order") else empty(),
            accept(record.get("proof"), 1) if record.get("proof") else empty(),
        )
        for record in records
        if record["description"] and record["amount"]
    ]
    return Draft(
        kind="settlement",
        fields={
            "settlement_count": accept(str(len(lines)), 1),
            "settlement_period": accept(period, 1),
            "settlement_total": accept(f"{total.quantize(Decimal('0.01')):.2f}", 1),
        },
        lines=lines,
    )


def _format(value: date) -> str:
    return f"{value.day:02d}.{value.month:02d}.{value.year:04d}"


def _file_id(path: object) -> str | None:
    if not path:
        return None
    match = re.search(r"/file/(\d+)", str(path))
    return match.group(1) if match else None


def _preview(records: list[dict]) -> Image.Image:
    font = _font(18)
    small = _font(15)
    image = Image.new("RGB", (1200, 1600), "white")
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 0, 1200, 72), fill=(15, 81, 50))
    draw.text((32, 22), "Vyúčtovanie", font=font, fill="white")
    total = sum((Decimal(record["amount"]) for record in records if record["amount"]), Decimal("0.00"))
    draw.text((32, 92), f"{len(records)} dokladov    {total.quantize(Decimal('0.01')):.2f}", font=font, fill=(15, 81, 50))
    y = 150
    for record in records[:22]:
        label = record["description"] or ""
        amount = record["amount"] or ""
        draw.text((32, y), label[:78], font=small, fill=(30, 30, 30))
        draw.text((980, y), amount, font=small, fill=(30, 30, 30))
        y += 32
    if len(records) > 22:
        draw.text((32, y + 8), f"… a ďalších {len(records) - 22} dokladov", font=small, fill=(80, 80, 80))
    return image


def _font(size: int) -> ImageFont.ImageFont:
    for path in _FONT_CANDIDATES:
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()
