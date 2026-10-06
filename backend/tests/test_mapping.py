from app.gate import Candidate
from app.mapping.engine import to_response
from app.ocr_extract import Draft, LineCandidate, extract_fields
from fixtures.invoice_text import LINES


def _tag(response, tag: str):
    for root in response.tree.roots:
        for section in root.sections:
            for item in section.items:
                for field in item.tags:
                    if field.tag == tag:
                        return field
    raise AssertionError(tag)


def test_sample_lines_map_to_egrant_tags():
    response = to_response(extract_fields(LINES), 0.8, "doc-1")
    assert response.tree.roots[0].id == "vyuctovanie"
    assert _tag(response, "dodavatel.nazov").value == "Ateliér Sever, s. r. o."
    assert _tag(response, "dodavatel.ico").value == "00151653"
    assert _tag(response, "dodavatel.dic").value is None
    assert "dodavatel.dic" in response.needs_review
    assert _tag(response, "faktura.cislo").value == "2026-0142"
    assert _tag(response, "faktura.datum_vystavenia").value == "12.03.2026"
    assert _tag(response, "faktura.datum_splatnosti").value == "26.03.2026"
    assert _tag(response, "faktura.suma_bez_dph").value == "1234.56"
    assert _tag(response, "faktura.suma_s_dph").value == "1481.47"
    items = response.tree.roots[0].sections[-1].items
    assert items[0].tags[0].tag == "TABLE_ITEM_STRING"
    assert items[0].tags[0].value == "Grafický návrh plagátu"
    assert items[0].tags[1].tag == "TABLE_ITEM_CURRENCY"
    assert items[0].tags[1].value == "800.00"
    assert items[1].tags[0].value == "Tlač materiálov"
    assert items[1].tags[1].value == "434.56"


def test_customer_ico_is_not_used_as_supplier():
    response = to_response(extract_fields(LINES), 0.8, "doc-2")
    assert _tag(response, "dodavatel.ico").value != "00318574"


ENGLISH_LINES = [
    "INVOICE",
    "Invoice number: INV-2026-0142",
    "Supplier",
    "North Studio Ltd.",
    "Company ID: 00151653",
    "VAT: SK1020215534",
    "Customer",
    "Revuca Municipality",
    "Company ID: 00318574",
    "Issue date: 12 March 2026",
    "Due date: 26 March 2026",
    "Line items",
    "Poster design 800.00",
    "Print materials 434.56",
    "Subtotal: 1,234.56 EUR",
    "VAT 20%: 246.91 EUR",
    "Total: 1,481.47 EUR",
]


def test_english_invoice_maps_to_the_same_tags():
    response = to_response(extract_fields(ENGLISH_LINES), 0.8, "doc-en")
    assert _tag(response, "dodavatel.nazov").value == "North Studio Ltd."
    assert _tag(response, "dodavatel.ico").value == "00151653"
    assert _tag(response, "dodavatel.dic").value == "SK1020215534"
    assert _tag(response, "faktura.cislo").value == "INV-2026-0142"
    assert _tag(response, "faktura.datum_vystavenia").value == "12.03.2026"
    assert _tag(response, "faktura.datum_splatnosti").value == "26.03.2026"
    assert _tag(response, "faktura.suma_bez_dph").value == "1234.56"
    assert _tag(response, "faktura.suma_s_dph").value == "1481.47"
    items = response.tree.roots[0].sections[-1].items
    assert items[0].tags[0].value == "Poster design"
    assert items[0].tags[1].value == "800.00"
    assert items[1].tags[1].value == "434.56"


def test_manager_mapping_replaces_the_default_tags():
    from app.mapping.form_export import parse_mapping

    mapping = parse_mapping(
        """
        {
          "form": {
            "type": "root",
            "children": [
              {
                "type": "SECTION",
                "name": "Žiadateľ",
                "tag": "ziadatel_sekcia",
                "children": [
                  {"type": "SIMPLE_STRING", "name": "Názov", "tag": "ziadatel.nazov"},
                  {"type": "SIMPLE_STRING", "name": "IČO", "tag": "ziadatel.ico", "mandatory": true}
                ]
              },
              {
                "type": "SECTION",
                "name": "Faktúra",
                "tag": "faktura_sekcia",
                "children": [
                  {
                    "type": "TABLE_LIST",
                    "name": "Položky",
                    "tag": "polozky",
                    "children": [
                      {"type": "TABLE_ITEM_STRING", "name": "Položka", "tag": "polozka"},
                      {"type": "TABLE_ITEM_CURRENCY", "name": "Suma", "tag": "suma"}
                    ]
                  }
                ]
              }
            ]
          },
          "fields": {"supplier_name": "ziadatel.nazov", "ico": "ziadatel.ico"},
          "lines": {"description": "polozka", "amount": "suma"}
        }
        """
    )
    response = to_response(extract_fields(LINES), 0.8, "mapped", mapping)
    assert response.tree.roots[0].id == "formular"
    assert _tag(response, "ziadatel.ico").value == "00151653"
    assert _tag(response, "ziadatel.nazov").value == "Ateliér Sever, s. r. o."
    assert _tag(response, "ziadatel.ico").required is True
    tags = {
        field.tag
        for section in response.tree.roots[0].sections
        for item in section.items
        for field in item.tags
    }
    assert "dodavatel.ico" not in tags
    items = next(section for section in response.tree.roots[0].sections if section.role == "lines").items
    assert items[0].tags[0].tag == "polozka"
    assert items[0].tags[0].value == "Grafický návrh plagátu"
    assert items[0].tags[1].tag == "suma"
    assert items[0].tags[1].value == "800.00"


def test_below_threshold_becomes_null():
    draft = Draft(
        fields={"ico": Candidate("00151653", 0.5)},
        lines=[LineCandidate(Candidate("Papier", 0.2), Candidate("3.00", 0.2))],
    )
    response = to_response(draft, 0.8, "doc-3")
    assert _tag(response, "dodavatel.ico").value is None
    assert _tag(response, "dodavatel.ico").needs_review is True
    assert response.tree.roots[0].sections[-1].items == []
