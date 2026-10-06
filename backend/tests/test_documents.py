import io

import pytest
from PIL import Image

from app.donut_extract import _from_cord
from app.ocr_extract import extract_fields
from app.pipeline import extract_document
from app.mapping.engine import to_response

CONTRACT_SK = [
    "ZMLUVA O DIELO",
    "Číslo zmluvy: ZM-2026-014",
    "Poskytovateľ",
    "Ateliér Sever, s. r. o.",
    "IČO: 00151653",
    "DIČ: SK1020215534",
    "Objednávateľ",
    "Obec Revúca",
    "IČO: 00318574",
    "Dátum uzavretia: 12.03.2026",
    "Dátum účinnosti: 01.04.2026",
    "Predmet zmluvy: Grafický návrh plagátu",
    "Zmluvná cena: 1 481,47 EUR",
]

CONTRACT_EN = [
    "CONTRACT",
    "Contract number: ZM-2026-014",
    "Contractor",
    "North Studio Ltd.",
    "Company ID: 00151653",
    "VAT: SK1020215534",
    "Customer",
    "Revuca Municipality",
    "Date of signature: 12 March 2026",
    "Effective date: 1 April 2026",
    "Subject of the contract: Poster design",
    "Contract price: 1,481.47 EUR",
]

RECEIPT = [
    "BLOČEK",
    "Číslo dokladu: B-2026-9",
    "Dodávateľ",
    "Ateliér Sever, s. r. o.",
    "IČO: 00151653",
    "Dátum vystavenia: 12.03.2026",
    "Položky",
    "Káva 3,50",
    "Spolu: 3,50 EUR",
]


def _tag(response, tag: str):
    for root in response.tree.roots:
        for section in root.sections:
            for item in section.items:
                for field in item.tags:
                    if field.tag == tag:
                        return field
    raise AssertionError(tag)


def test_slovak_contract_maps_to_contract_tags():
    response = to_response(extract_fields(CONTRACT_SK), 0.8, "contract-sk")
    assert response.document_kind == "contract"
    assert _tag(response, "dodavatel.nazov").value == "Ateliér Sever, s. r. o."
    assert _tag(response, "dodavatel.ico").value == "00151653"
    assert _tag(response, "dodavatel.dic").value == "SK1020215534"
    assert _tag(response, "dodavatel.ico").value != "00318574"
    assert _tag(response, "zmluva.cislo").value == "ZM-2026-014"
    assert _tag(response, "zmluva.datum_uzavretia").value == "12.03.2026"
    assert _tag(response, "zmluva.datum_ucinnosti").value == "01.04.2026"
    assert _tag(response, "zmluva.predmet").value == "Grafický návrh plagátu"
    assert _tag(response, "zmluva.cena").value == "1481.47"
    assert _tag(response, "zmluva.datum_ucinnosti").required is False


def test_english_contract_maps_to_the_same_tags():
    response = to_response(extract_fields(CONTRACT_EN), 0.8, "contract-en")
    assert response.document_kind == "contract"
    assert _tag(response, "dodavatel.nazov").value == "North Studio Ltd."
    assert _tag(response, "dodavatel.ico").value == "00151653"
    assert _tag(response, "zmluva.cislo").value == "ZM-2026-014"
    assert _tag(response, "zmluva.datum_uzavretia").value == "12.03.2026"
    assert _tag(response, "zmluva.datum_ucinnosti").value == "01.04.2026"
    assert _tag(response, "zmluva.predmet").value == "Poster design"
    assert _tag(response, "zmluva.cena").value == "1481.47"


def test_receipt_does_not_require_due_date_or_net_total():
    response = to_response(extract_fields(RECEIPT), 0.8, "receipt-1")
    assert response.document_kind == "receipt"
    assert _tag(response, "faktura.cislo").value == "B-2026-9"
    assert _tag(response, "faktura.datum_vystavenia").value == "12.03.2026"
    assert _tag(response, "faktura.suma_s_dph").value == "3.50"
    assert _tag(response, "faktura.datum_splatnosti").value is None
    assert _tag(response, "faktura.datum_splatnosti").required is False
    assert _tag(response, "faktura.suma_bez_dph").required is False
    assert _tag(response, "dodavatel.dic").required is False
    assert response.tree.roots[0].sections[-1].items[0].tags[0].value == "Káva"


def test_weak_total_without_currency_falls_under_the_threshold():
    draft = extract_fields(["FAKTÚRA", "total 10.00"])
    assert draft.fields["total_gross"].value == "10.00"
    assert draft.fields["total_gross"].confidence < 0.8
    response = to_response(draft, 0.8, "weak-total")
    assert _tag(response, "faktura.suma_s_dph").value is None


def test_ico_confidence_is_higher_than_a_bare_total():
    from fixtures.invoice_text import LINES

    draft = extract_fields(LINES)
    assert draft.fields["ico"].confidence > draft.fields["total_gross"].confidence
    assert draft.fields["ico"].confidence >= 0.9


def test_low_ocr_probability_nulls_a_valid_ico():
    lines = ["Dodávateľ", "Ateliér Sever, s. r. o.", "IČO: 00151653"]
    draft = extract_fields(lines, [0.95, 0.95, 0.4])
    assert draft.fields["ico"].value == "00151653"
    assert draft.fields["ico"].confidence < 0.8


def test_donut_token_probability_gates_the_value():
    payload = {
        "store_name": "North Studio Ltd.",
        "store_id": "00151653",
        "total": {"total_price": "3.50"},
    }
    sure = _from_cord(payload, 0.95)
    unsure = _from_cord(payload, 0.4)
    assert sure.kind == "receipt"
    assert sure.fields["ico"].confidence >= 0.8
    assert unsure.fields["ico"].confidence < 0.8


def _png() -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", (32, 32), "white").save(buffer, format="PNG")
    return buffer.getvalue()


def test_photo_without_a_reader_reports_ocr_unavailable(monkeypatch):
    monkeypatch.setattr("app.pipeline.donut_enabled", lambda: False)

    def fail(_image):
        raise RuntimeError("ocr_unavailable")

    monkeypatch.setattr("app.ocr_extract.recognize_image", fail)
    with pytest.raises(RuntimeError, match="ocr_unavailable"):
        extract_document(_png(), "photo.png")


def test_photo_uses_donut_when_the_text_reader_is_missing(monkeypatch):
    from app.gate import Candidate
    from app.ocr_extract import Draft

    monkeypatch.setattr("app.pipeline.donut_enabled", lambda: True)

    def fail(_image):
        raise RuntimeError("ocr_unavailable")

    def fake_donut(_image, budget=None):
        return Draft(
            kind="receipt",
            fields={"supplier_name": Candidate("North Studio Ltd.", 0.9)},
        )

    monkeypatch.setattr("app.ocr_extract.recognize_image", fail)
    monkeypatch.setattr("app.pipeline.extract_donut", fake_donut)
    response = extract_document(_png(), "photo.png")
    assert response.document_kind == "receipt"
    assert _tag(response, "dodavatel.nazov").value == "North Studio Ltd."


STATEMENT_SK = [
    "VÝPIS Z ÚČTU",
    "Dátum zaúčtovania: 12.03.2026",
    "Protistrana: Ateliér Sever, s. r. o.",
    "Suma: 1 481,47 EUR",
]

STATEMENT_EN = [
    "BANK STATEMENT",
    "Booking date: 12 March 2026",
    "Counterparty: North Studio Ltd.",
    "Amount: 1,481.47 EUR",
]


def test_slovak_statement_maps_booking_date_counterparty_and_amount():
    response = to_response(extract_fields(STATEMENT_SK), 0.8, "statement-sk")
    assert response.document_kind == "statement"
    assert _tag(response, "vypis.datum").value == "12.03.2026"
    assert _tag(response, "vypis.protistrana").value == "Ateliér Sever, s. r. o."
    assert _tag(response, "vypis.suma").value == "1481.47"


def test_english_statement_maps_the_same_tags():
    response = to_response(extract_fields(STATEMENT_EN), 0.8, "statement-en")
    assert response.document_kind == "statement"
    assert _tag(response, "vypis.datum").value == "12.03.2026"
    assert _tag(response, "vypis.protistrana").value == "North Studio Ltd."
    assert _tag(response, "vypis.suma").value == "1481.47"


def test_statement_without_a_counterparty_stays_null():
    draft = extract_fields(["VÝPIS Z ÚČTU", "Dátum zaúčtovania: 12.03.2026", "Suma: 10,00 EUR"])
    assert draft.kind == "statement"
    assert draft.fields["booking_date"].value == "12.03.2026"
    assert draft.fields["counterparty"].value is None
    assert draft.fields["statement_amount"].value == "10.00"
    response = to_response(draft, 0.8, "statement-gap")
    assert _tag(response, "vypis.protistrana").value is None
    assert "vypis.protistrana" in response.needs_review


def test_plain_ocr_fills_a_gap_and_keeps_the_text_layer(monkeypatch):
    from fixtures.build_sample import build

    pdf_path, _png_path = build()
    monkeypatch.setenv("EGRANT_OCR_URL", "http://ocr.example/text")
    monkeypatch.setattr(
        "app.pipeline.egrant_ocr_text",
        lambda _data, _filename: "\n".join(
            [
                "FAKTÚRA",
                "Dodávateľ",
                "Iný názov, s. r. o.",
                "IČO: 00318574",
                "DIČ: SK1020215534",
            ]
        ),
    )
    response = extract_document(pdf_path.read_bytes(), pdf_path.name)
    assert _tag(response, "dodavatel.nazov").value == "Ateliér Sever, s. r. o."
    assert _tag(response, "dodavatel.ico").value == "00151653"
    assert _tag(response, "dodavatel.dic").value == "SK1020215534"


def test_empty_ocr_response_keeps_the_text_layer(monkeypatch):
    from fixtures.build_sample import build

    pdf_path, _png_path = build()
    monkeypatch.setenv("EGRANT_OCR_URL", "http://ocr.example/text")
    monkeypatch.setattr("app.pipeline.egrant_ocr_text", lambda _data, _filename: " ")
    response = extract_document(pdf_path.read_bytes(), pdf_path.name)
    assert _tag(response, "dodavatel.ico").value == "00151653"
    assert _tag(response, "dodavatel.dic").value is None
