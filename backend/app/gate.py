from dataclasses import dataclass
from decimal import Decimal

from app.validators import parse_dic, parse_ico, parse_invoice_number, parse_money


@dataclass
class Candidate:
    value: str | None
    confidence: float


def empty() -> Candidate:
    return Candidate(None, 0.0)


def accept(value: str | None, confidence: float) -> Candidate:
    if value is None or confidence <= 0:
        return empty()
    return Candidate(value, confidence)


def merge_candidate(ocr: Candidate, donut: Candidate | None, threshold: float) -> Candidate:
    other = donut or empty()
    ocr_ok = ocr.value is not None and ocr.confidence >= threshold
    donut_ok = other.value is not None and other.confidence >= threshold
    if ocr_ok and donut_ok and _same(ocr.value, other.value) is False:
        return empty()
    if ocr_ok and donut_ok:
        return Candidate(ocr.value, max(ocr.confidence, other.confidence))
    if ocr_ok:
        return Candidate(ocr.value, ocr.confidence)
    if donut_ok:
        return Candidate(other.value, other.confidence)
    return empty()


def enforce_vat(net: Candidate, gross: Candidate) -> tuple[Candidate, Candidate]:
    if net.value is None or gross.value is None:
        return net, gross
    if Decimal(gross.value) < Decimal(net.value):
        return empty(), empty()
    return net, gross


def reconcile_net(net: Candidate, gross: Candidate, tax: str | None) -> Candidate:
    """Drop a net total that cannot sit beside the printed VAT and gross total.

    The replacement is not calculated. A misread base stays empty.
    """
    if tax is None or net.value is None or gross.value is None:
        return net
    gap = abs(Decimal(net.value) + Decimal(tax) - Decimal(gross.value))
    if gap > Decimal("0.01"):
        return empty()
    return net


def apply_threshold(candidate: Candidate, threshold: float) -> Candidate:
    if candidate.value is None or candidate.confidence < threshold:
        return empty()
    return candidate


def _same(left: str | None, right: str | None) -> bool:
    if left is None or right is None:
        return False
    return _canonical(left) == _canonical(right)


def _canonical(value: str) -> str:
    if parse_ico(value):
        return parse_ico(value) or value
    if parse_dic(value):
        return parse_dic(value) or value
    if parse_money(value):
        return parse_money(value) or value
    if parse_invoice_number(value):
        return (parse_invoice_number(value) or value).upper()
    return " ".join(value.split()).casefold()
