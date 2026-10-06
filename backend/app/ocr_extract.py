import re
from dataclasses import dataclass, field

from PIL import Image

from app.confidence import blend, date_anchor, dic_anchor, ico_anchor, money_anchor, name_anchor, number_anchor
from app.gate import Candidate, accept, empty
from app.ingest import IngestedPage
from app.validators import (
    fold,
    parse_date,
    parse_description,
    parse_dic,
    parse_ico,
    parse_invoice_number,
    parse_money,
    parse_supplier_name,
)

_BOOKING = re.compile(
    r"(?i)(?:d[áa]tum\s+(?:za[úu][čc]tovania|oper[áa]cie|transakcie)|"
    r"booking\s+date|transaction\s+date|value\s+date)\s*[:.]?\s*(.+)$"
)
_COUNTERPARTY = re.compile(
    r"(?i)(?:protistrana|pr[ií]jemca|odosielate[ľl]|n[áa]zov\s+protistrany|"
    r"counterparty|beneficiary|payer)\s*[:.]?\s*(.+)$"
)
_STATEMENT_AMOUNT = ("suma", "ciastka", "transaction amount", "amount")
_ISSUE = re.compile(
    r"(?i)(?:d[áa]tum\s+(?:vystavenia|vyhotovenia)|issue\s+date|date\s+of\s+issue|invoice\s+date|date\s+issued)\s*[:.]?\s*(.+)$"
)
_DUE = re.compile(r"(?i)(?:d[áa]tum\s+splatnosti|due\s+date|payment\s+due|date\s+due)\s*[:.]?\s*(.+)$")
_INVOICE = re.compile(
    r"(?i)(?:č[íi]slo\s+fakt[úu]ry|fakt[úu]ra\s*č\.?|variabiln[ýy]\s+symbol|"
    r"č[íi]slo\s+dokladu|č[íi]slo\s+blo[čc]ka|"
    r"invoice\s*(?:number|no\.?|#)|invoice\s*id|receipt\s*(?:number|no\.?))\s*[:.]?\s*"
    r"([A-Za-z0-9][A-Za-z0-9/\-]{1,39})"
)
_CONTRACT_NO = re.compile(
    r"(?i)(?:č[íi]slo\s+zmluvy|zmluva\s*č\.?|contract\s*(?:number|no\.?|#)|"
    r"agreement\s*(?:number|no\.?))\s*[:.]?\s*"
    r"([A-Za-z0-9][A-Za-z0-9/\-]{1,39})"
)
_SIGNED = re.compile(
    r"(?i)(?:d[áa]tum\s+(?:uzavretia|podpisu|podp[íi]sania)|date\s+of\s+signature|signed\s+on|signature\s+date)\s*[:.]?\s*(.+)$"
)
_EFFECTIVE = re.compile(
    r"(?i)(?:d[áa]tum\s+[úu]činnosti|effective\s+date|date\s+of\s+effect)\s*[:.]?\s*(.+)$"
)
_SUBJECT = re.compile(
    r"(?i)(?:predmet(?:\s+zmluvy)?|subject(?:\s+of\s+(?:the\s+)?(?:contract|agreement))?)\s*[:.]?\s*(.+)$"
)
_ICO = re.compile(
    r"(?i)\b(?:I\s*Č\s*O|ICO|company\s+id|company\s+number|registration\s+no\.?|reg\.?\s+no\.?)\b\s*[:.]?\s*(\d[\d\s]{6,16})"
)
_DIC = re.compile(
    r"(?i)\b(?:DIČ|DIC|IČ\s*DPH|IC\s*DPH|VAT(?:\s*(?:ID|NO\.?|NUMBER))?|TAX\s*ID)\b\s*[:.]?\s*"
    r"((?:[A-Za-z]{2})?\s*[0-9A-Za-z][0-9A-Za-z\s]{6,18})"
)
_ITEM_AMOUNT = r"(?:\d{1,3}(?:[ ,]\d{3})*[.,]\d{2}|\d+[.,]\d{2})"
_ITEM = re.compile(
    rf"^(?P<name>.+?)\s+(?P<amount>{_ITEM_AMOUNT})\s*(?:eur|usd|gbp|€|\$|£)?\s*$",
    re.IGNORECASE,
)
_SUPPLIER_SPLIT = re.compile(r"(?i)(?:dod[áa]vate[ľl]|supplier|vendor|seller)\s*:\s*")
_NET_LABELS = (
    "zaklad dane",
    "suma bez dph",
    "celkom bez dph",
    "net amount",
    "amount excl",
    "total excl",
    "subtotal",
    "net total",
)
_GROSS_LABELS = (
    "spolu s dph",
    "celkom s dph",
    "suma s dph",
    "celkova suma",
    "amount incl",
    "total incl",
    "grand total",
    "amount due",
    "total due",
    "balance due",
    "spolu",
    "celkom",
)
_STRONG_GROSS = (
    "spolu s dph",
    "celkom s dph",
    "suma s dph",
    "celkova suma",
    "amount incl",
    "total incl",
    "grand total",
    "amount due",
    "total due",
    "balance due",
)
_CONTRACT_PRICE = (
    "zmluvna cena",
    "cena zmluvy",
    "hodnota zmluvy",
    "contract price",
    "contract value",
    "celkova cena",
)
_PARTY_END = (
    "odberatel",
    "zakaznik",
    "objednavatel",
    "kupujuci",
    "customer",
    "buyer",
    "bill to",
    "billed to",
    "invoice to",
)
_TOTAL_PREFIXES = (
    "zaklad dane",
    "spolu",
    "celkom",
    "suma bez",
    "suma s",
    "dph",
    "bez dph",
    "subtotal",
    "net amount",
    "amount excl",
    "total excl",
    "grand total",
    "amount due",
    "total incl",
    "vat",
    "tax",
    "total",
)

_reader = None


@dataclass
class LineCandidate:
    description: Candidate
    amount: Candidate
    invoice_file: Candidate = field(default_factory=empty)
    file_id: Candidate = field(default_factory=empty)


@dataclass
class Draft:
    fields: dict[str, Candidate] = field(default_factory=dict)
    lines: list[LineCandidate] = field(default_factory=list)
    kind: str = "invoice"


def lines_from_page(page: IngestedPage) -> list[tuple[str, float | None]]:
    if page.embedded_text:
        raw = [line.strip() for line in page.embedded_text.splitlines() if line.strip()]
        return [(normalize_line(line), None) for line in raw if normalize_line(line)]
    try:
        return recognize_image(page.image)
    except RuntimeError:
        return []


def normalize_line(line: str) -> str:
    cleaned = (
        line.replace("\u00ad", "-")
        .replace("\u2010", "-")
        .replace("\u2011", "-")
        .replace("\u2013", "-")
        .replace("\u2014", "-")
        .replace("\u00a0", " ")
        .replace("\u202f", " ")
    )
    return re.sub(r"[ \t]+", " ", cleaned).strip()


def extract_fields(lines: list[str], recognition: list[float | None] | None = None) -> Draft:
    cleaned = [normalize_line(line) for line in lines if normalize_line(line)]
    scores = _align_scores(lines, cleaned, recognition)
    kind = classify_document(cleaned)
    if kind == "contract":
        return _extract_contract(cleaned, scores)
    if kind == "statement":
        return _extract_statement(cleaned, scores)
    return _extract_invoice(cleaned, scores, kind)


def classify_document(lines: list[str]) -> str:
    head = fold(" ".join(lines[:8]))
    if re.search(
        r"(?:vypis z uctu|bankovy vypis|bank statement|account statement|pohyby na ucte)",
        head,
    ):
        return "statement"
    head = fold(" ".join(lines[:6]))
    if re.search(r"\b(?:zmluva|zmluvy|contract|agreement|dohoda)\b", head) and not re.search(
        r"\b(?:faktura|invoice)\b", head
    ):
        return "contract"
    if re.search(r"\b(?:blocek|pokladnicny|paragon|receipt)\b", head) and not re.search(
        r"\b(?:faktura|invoice)\b", head
    ):
        return "receipt"
    return "invoice"


def recognize_image(image: Image.Image) -> list[tuple[str, float]]:
    reader = _get_reader()
    import numpy as np

    results = reader.readtext(np.array(image.convert("RGB")))
    rows: list[tuple[float, float, str, float]] = []
    for box, text, score in results:
        if not text or not str(text).strip():
            continue
        top = min(point[1] for point in box)
        left = min(point[0] for point in box)
        rows.append((top, left, str(text).strip(), float(score)))
    rows.sort(key=lambda item: (round(item[0] / 12), item[1]))
    lines: list[tuple[str, float]] = []
    current_key: int | None = None
    bucket: list[str] = []
    scores: list[float] = []
    for top, _left, text, score in rows:
        key = round(top / 12)
        if current_key is None:
            current_key = key
        if abs(key - current_key) > 1:
            lines.append((" ".join(bucket), sum(scores) / len(scores)))
            bucket = [text]
            scores = [score]
            current_key = key
        else:
            bucket.append(text)
            scores.append(score)
    if bucket:
        lines.append((" ".join(bucket), sum(scores) / len(scores)))
    return [(normalize_line(text), score) for text, score in lines if normalize_line(text)]


def _get_reader():
    global _reader
    if _reader is None:
        try:
            import easyocr
        except ImportError as exc:
            raise RuntimeError("ocr_unavailable") from exc
        _reader = easyocr.Reader(["sk", "en"], gpu=False)
    return _reader


def _supplier_region(lines: list[str], contract: bool = False) -> list[str]:
    start = None
    end = len(lines)
    for index, line in enumerate(lines):
        folded = fold(line)
        if start is None and _is_supplier_header(line, contract):
            start = index
        elif start is not None and any(marker in folded for marker in _PARTY_END):
            end = index
            break
    if start is None:
        return []
    return lines[start:end]


def _extract_invoice(lines: list[str], scores: list[float | None], kind: str) -> Draft:
    supplier = _supplier_region(lines)
    return Draft(
        kind=kind,
        fields={
            "supplier_name": _supplier_name(supplier, scores, lines),
            "ico": _anchored_ico(supplier, scores, lines),
            "dic": _anchored_dic(supplier, scores, lines),
            "invoice_number": _search_number(lines, scores, _INVOICE),
            "issue_date": _search_date(lines, scores, _ISSUE),
            "due_date": _search_date(lines, scores, _DUE),
            "total_net": _search_net(lines, scores),
            "total_gross": _search_gross(lines, scores),
        },
        lines=_line_items(lines, scores),
    )


def _extract_statement(lines: list[str], scores: list[float | None]) -> Draft:
    return Draft(
        kind="statement",
        fields={
            "booking_date": _search_date(lines, scores, _BOOKING),
            "counterparty": _search_party(lines, scores),
            "statement_amount": _search_labeled_money(lines, scores, _STATEMENT_AMOUNT),
        },
    )


def _search_party(lines: list[str], scores: list[float | None]) -> Candidate:
    for line in lines:
        match = _COUNTERPARTY.search(line)
        if not match:
            continue
        value = parse_supplier_name(match.group(1))
        return _scored(value, name_anchor(value or ""), _score_of(line, lines, scores))
    return empty()


def _extract_contract(lines: list[str], scores: list[float | None]) -> Draft:
    supplier = _supplier_region(lines, contract=True)
    return Draft(
        kind="contract",
        fields={
            "supplier_name": _supplier_name(supplier, scores, lines),
            "ico": _anchored_ico(supplier, scores, lines),
            "dic": _anchored_dic(supplier, scores, lines),
            "contract_number": _search_number(lines, scores, _CONTRACT_NO),
            "signed_date": _search_date(lines, scores, _SIGNED),
            "effective_date": _search_date(lines, scores, _EFFECTIVE),
            "subject": _search_subject(lines, scores),
            "contract_value": _search_labeled_money(lines, scores, _CONTRACT_PRICE),
        },
        lines=_line_items(lines, scores),
    )


def _supplier_name(region: list[str], scores: list[float | None], lines: list[str]) -> Candidate:
    if not region:
        return empty()
    inline = _SUPPLIER_SPLIT.split(region[0], maxsplit=1)
    if len(inline) == 2:
        name = parse_supplier_name(inline[1])
        return _scored(name, name_anchor(name or ""), _score_of(region[0], lines, scores))
    for line in region[1:]:
        if _is_id_line(line):
            continue
        name = parse_supplier_name(line)
        return _scored(name, name_anchor(name or ""), _score_of(line, lines, scores))
    return empty()


def _anchored_ico(region: list[str], scores: list[float | None], lines: list[str]) -> Candidate:
    for line in region:
        match = _ICO.search(line)
        if not match:
            continue
        return _scored(parse_ico(match.group(1)), ico_anchor(line), _score_of(line, lines, scores))
    return empty()


def _anchored_dic(region: list[str], scores: list[float | None], lines: list[str]) -> Candidate:
    for line in region:
        match = _DIC.search(line)
        if not match:
            continue
        return _scored(parse_dic(match.group(1)), dic_anchor(line), _score_of(line, lines, scores))
    return empty()


def _search_number(lines: list[str], scores: list[float | None], pattern: re.Pattern[str]) -> Candidate:
    for line in lines:
        match = pattern.search(line)
        if not match:
            continue
        value = parse_invoice_number(match.group(1))
        return _scored(value, number_anchor(value or ""), _score_of(line, lines, scores))
    return empty()


def _search_date(lines: list[str], scores: list[float | None], pattern: re.Pattern[str]) -> Candidate:
    for line in lines:
        match = pattern.search(line)
        if not match:
            continue
        raw = match.group(1)
        return _scored(parse_date(raw), date_anchor(raw), _score_of(line, lines, scores))
    return empty()


def _search_net(lines: list[str], scores: list[float | None]) -> Candidate:
    for line in lines:
        if any(label in fold(line) for label in _NET_LABELS):
            return _scored(parse_money(line), money_anchor(line, specific=True), _score_of(line, lines, scores))
    return empty()


def _search_gross(lines: list[str], scores: list[float | None]) -> Candidate:
    for line in lines:
        folded = fold(line)
        if any(label in folded for label in _NET_LABELS):
            continue
        specific = any(label in folded for label in _STRONG_GROSS)
        weak = any(label in folded for label in _GROSS_LABELS) or (
            folded.startswith("total") and "excl" not in folded and "subtotal" not in folded
        )
        if specific or weak:
            return _scored(parse_money(line), money_anchor(line, specific=specific), _score_of(line, lines, scores))
    return empty()


def _search_subject(lines: list[str], scores: list[float | None]) -> Candidate:
    for line in lines:
        match = _SUBJECT.search(line)
        if not match:
            continue
        value = parse_description(match.group(1))
        return _scored(value, name_anchor(value or ""), _score_of(line, lines, scores))
    return empty()


def _search_labeled_money(lines: list[str], scores: list[float | None], labels: tuple[str, ...]) -> Candidate:
    for line in lines:
        if any(label in fold(line) for label in labels):
            return _scored(parse_money(line), money_anchor(line, specific=True), _score_of(line, lines, scores))
    return empty()


def _line_items(lines: list[str], scores: list[float | None]) -> list[LineCandidate]:
    start = None
    for index, line in enumerate(lines):
        if _is_items_header(line):
            start = index + 1
            break
    if start is None:
        return []
    items: list[LineCandidate] = []
    for line in lines[start:]:
        folded = fold(line).strip()
        if any(folded.startswith(prefix) for prefix in _TOTAL_PREFIXES):
            break
        match = _ITEM.match(line.strip())
        if not match:
            continue
        description = parse_description(match.group("name"))
        amount = parse_money(match.group("amount"))
        if description is None or amount is None:
            continue
        recognition = _score_of(line, lines, scores)
        items.append(
            LineCandidate(
                _scored(description, name_anchor(description), recognition),
                _scored(amount, money_anchor(line, specific=True), recognition),
            )
        )
    return items


def _is_supplier_header(line: str, contract: bool = False) -> bool:
    folded = fold(line)
    if "dodavatel" in folded or "poskytovatel" in folded:
        return True
    if contract and ("zmluvna strana" in folded or re.search(r"\b(?:contractor|party)\b", folded)):
        return True
    return bool(re.search(r"\b(?:supplier|vendor|seller)\b", folded))


def _align_scores(
    original: list[str],
    cleaned: list[str],
    recognition: list[float | None] | None,
) -> list[float | None]:
    if recognition is None:
        return [None] * len(cleaned)
    paired = list(zip(original, recognition, strict=False))
    scores: list[float | None] = []
    cursor = 0
    for line in cleaned:
        found: float | None = None
        while cursor < len(paired):
            raw, score = paired[cursor]
            cursor += 1
            if normalize_line(raw) == line:
                found = score
                break
        scores.append(found)
    return scores


def _score_of(line: str, lines: list[str], scores: list[float | None]) -> float | None:
    try:
        return scores[lines.index(line)]
    except (ValueError, IndexError):
        return None


def _scored(value: str | None, anchor: float, recognition: float | None) -> Candidate:
    return accept(value, blend(anchor, recognition))


def _is_items_header(line: str) -> bool:
    folded = fold(line).strip(" :.")
    return folded in {"polozky", "items", "line items"} or folded.startswith("polozk")


def _is_id_line(line: str) -> bool:
    return bool(_ICO.search(line) or _DIC.search(line))
