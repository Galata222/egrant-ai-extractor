import json
from pathlib import Path

import pytest

from app.egrant_ocr import text_from_body
from app.gate import Candidate
from app.mapping.engine import to_response
from app.mapping.form_export import find_field, parse_mapping, read_form
from app.ocr_extract import Draft, extract_fields
from app.pipeline import fill_gaps
from fixtures.invoice_text import LINES

# The final report form copied from the hackathon instance with "Kopírovať celý formulár".
FINAL_REPORT = json.loads(
    (Path(__file__).resolve().parent.parent / "fixtures" / "final-report-form.json").read_text(encoding="utf-8")
)
DOCUMENTS = "finansprava.zoznamuctovnychdokladov"


def test_form_export_collects_tags_and_marks_table_columns():
    fields = read_form(
        {
            "type": "root",
            "children": [
                {
                    "type": "SECTION",
                    "name": "Žiadateľ",
                    "tag": "ziadatel_sekcia",
                    "children": [
                        {"type": "SIMPLE_STRING", "name": "IČO", "tag": "ziadatel.ico", "mandatory": True},
                        {
                            "type": "TABLE_LIST",
                            "name": "Položky",
                            "tag": "polozky",
                            "children": [
                                {"type": "TABLE_ITEM_STRING", "name": "Položka", "tag": "polozka"},
                                {"type": "TABLE_ITEM_CURRENCY", "name": "Suma", "tag": "suma"},
                            ],
                        },
                    ],
                }
            ],
        }
    )
    by_tag = {field.tag: field for field in fields}
    assert by_tag["ziadatel.ico"].table_tag is None
    assert by_tag["ziadatel.ico"].mandatory is True
    assert by_tag["ziadatel.ico"].section_name == "Žiadateľ"
    assert by_tag["polozka"].table_tag == "polozky"
    assert by_tag["suma"].table_name == "Položky"


def test_mapping_without_choices_stays_unset():
    assert parse_mapping('{"form": {"type": "root", "children": []}, "fields": {}, "lines": {}}') is None


def test_mapping_rejects_broken_json():
    with pytest.raises(ValueError, match="invalid_mapping"):
        parse_mapping("{")


def test_ocr_body_keeps_only_a_text_string():
    assert text_from_body({"text": " Faktúra "}) == " Faktúra "
    assert text_from_body({"text": "  "}) is None
    assert text_from_body({"value": "Faktúra"}) is None
    assert text_from_body(["Faktúra"]) is None


def test_ocr_upload_posts_the_file_without_forcing_ocr(monkeypatch):
    from app.egrant_ocr import read_text

    captured: dict[str, object] = {}

    class Response:
        def raise_for_status(self) -> None:
            return None

        def json(self) -> dict[str, str]:
            return {"text": "DIČ: SK1020215534\n"}

    def fake_post(url: str, files: dict[str, tuple[str, bytes]], timeout: float) -> Response:
        captured["url"] = url
        captured["files"] = files
        captured["timeout"] = timeout
        return Response()

    monkeypatch.setenv("EGRANT_OCR_URL", "http://127.0.0.1:9010/ocr-upload")
    monkeypatch.setattr("httpx.post", fake_post)
    assert read_text(b"%PDF-1.4", "faktura.pdf") == "DIČ: SK1020215534\n"
    assert captured["url"] == "http://127.0.0.1:9010/ocr-upload"
    assert "force_ocr" not in str(captured["url"])
    assert captured["files"] == {"file": ("faktura.pdf", b"%PDF-1.4")}


def test_text_layer_wins_when_the_ocr_text_disagrees():
    primary = Draft(fields={"ico": Candidate("00151653", 0.97), "dic": Candidate(None, 0)}, kind="invoice")
    secondary = Draft(
        fields={"ico": Candidate("00318574", 0.99), "dic": Candidate("SK1020215534", 0.95)},
        kind="invoice",
    )
    merged = fill_gaps(primary, secondary, 0.8)
    assert merged.fields["ico"].value == "00151653"
    assert merged.fields["dic"].value == "SK1020215534"


def test_empty_secondary_does_not_erase_a_checked_value():
    primary = Draft(fields={"ico": Candidate("00151653", 0.97)}, kind="invoice")
    secondary = Draft(fields={"ico": Candidate(None, 0)}, kind="invoice")
    assert fill_gaps(primary, secondary, 0.8).fields["ico"].value == "00151653"


def test_real_export_reads_fields_inside_a_sub_section():
    fields = read_form(FINAL_REPORT)
    author = find_field(fields, "predkladatel.autor.meno")
    assert author is not None
    assert author.name == "Meno Priezvisko"
    assert find_field(fields, "predkladatel.informacia") is None


def test_real_export_reads_budget_rows_as_table_columns():
    column = find_field(read_form(FINAL_REPORT), "finansprava.prehlad.prehlad.skutocne_cerpanie")
    assert column is not None
    assert column.table_tag == "prehlad"
    assert column.type == "TABLE_ITEM_CURRENCY"


def test_repeated_tag_is_found_only_by_its_path():
    fields = read_form(FINAL_REPORT)
    assert len({field.path for field in fields}) == len(fields)
    assert [field.path for field in fields if field.tag == "suma"] == ["finansprava.suma", f"{DOCUMENTS}.suma"]
    assert find_field(fields, "suma") is None
    assert find_field(fields, f"{DOCUMENTS}.suma").table_tag == "zoznamuctovnychdokladov"
    assert find_field(fields, "cislo_zmluvy").path == "predkladatel.cislo_zmluvy"


def test_invoice_rows_land_in_the_real_document_table():
    mapping = parse_mapping(
        json.dumps(
            {
                "form": FINAL_REPORT,
                "fields": {},
                "lines": {"description": f"{DOCUMENTS}.polozka", "amount": f"{DOCUMENTS}.suma"},
            }
        )
    )
    response = to_response(extract_fields(LINES), 0.8, "doc", mapping)
    section = response.tree.roots[0].sections[-1]
    assert section.id == "zoznamuctovnychdokladov"
    assert section.title == "Zoznam učtovných dokladov"
    first = {tag.tag: tag.value for tag in section.items[0].tags}
    assert first == {f"{DOCUMENTS}.polozka": "Grafický návrh plagátu", f"{DOCUMENTS}.suma": "800.00"}
