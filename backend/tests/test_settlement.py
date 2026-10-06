import io

import openpyxl

from app.mapping.engine import to_response
from app.pipeline import extract_document
from app.xlsx_extract import extract_xlsx


def _workbook(rows: list[list]) -> bytes:
    book = openpyxl.Workbook()
    sheet = book.active
    sheet.append(
        [
            "Účt. doklad\nČíslo",
            "Účt. doklad\nDruh",
            "Účt. doklad\nZo Dňa",
            "Typ kontraktu",
            "Číslo kontraktu",
            "Predmet dodávky",
            "Dodávateľ",
            "Spôsob úhrady: prevodom",
            "Dňa",
            "Suma",
            "Objednávka",
            "Faktúra",
        ]
    )
    for row in rows:
        sheet.append(row)
    buffer = io.BytesIO()
    book.save(buffer)
    return buffer.getvalue()


def _tag(response, tag: str):
    for root in response.tree.roots:
        for section in root.sections:
            for item in section.items:
                for field in item.tags:
                    if field.tag == tag:
                        return field
    raise AssertionError(tag)


def test_settlement_keeps_each_stated_row_and_the_sum():
    data = _workbook(
        [
            ["2025006", "faktúra", "2025-02-24", "objednávka", "11022025/02", "zimné fotenie", "Ing. Michal Reiberger", "3/2025-4", "2025-03-06", 700, "/file/2457462.pdf/order", "/file/2457463.pdf/invoice"],
            ["20250002", "faktúra", "2025-03-12", "objednávka", "10012025/03", "zima v Nízkych Tatrách", "NEW MEDIA ART, s.r.o.", "3/2025-11", "2025-03-21", 2100],
            ["P 70022", "účtenka", "12.7.2025", "pokladničný blok", "P 70022", None, None, None, None, -246],
        ]
    )
    draft, _image = extract_xlsx(data)
    response = to_response(draft, 0.8, "sheet-1")
    assert response.document_kind == "settlement"
    assert _tag(response, "vyuctovanie.pocet").value == "3"
    assert _tag(response, "vyuctovanie.obdobie").value == "24.02.2025 – 12.07.2025"
    assert _tag(response, "vyuctovanie.suma").value == "2554.00"
    items = response.tree.roots[0].sections[-1].items
    assert items[0].tags[0].value == "2025006 — 24.02.2025 — Ing. Michal Reiberger — zimné fotenie"
    assert items[0].tags[1].value == "700.00"
    assert items[0].tags[2].tag == "doklad.faktura"
    assert items[0].tags[2].value == "/file/2457463.pdf/invoice"
    assert items[0].tags[3].tag == "doklad.subor_id"
    assert items[0].tags[3].value == "2457463"
    assert len(items[1].tags) == 2
    assert items[2].tags[1].value == "-246.00"
    assert "dodavatel.ico" not in {field.tag for section in response.tree.roots[0].sections for item in section.items for field in item.tags}


def test_extract_document_accepts_the_workbook():
    data = _workbook(
        [["1", "faktúra", "2025-01-02", "zmluva", "2025-01-01", "tlač", "Grafon, s.r.o.", "", "2025-01-05", 10]]
    )
    response = extract_document(data, "vyuctovanie.xlsx")
    assert response.document_kind == "settlement"
    assert response.page_preview.startswith("data:image/png;base64,")
    assert _tag(response, "vyuctovanie.suma").value == "10.00"
