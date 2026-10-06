import pytest

from app.egrant_ocr import text_from_body
from app.gate import Candidate
from app.mapping.form_export import parse_mapping, read_form
from app.ocr_extract import Draft
from app.pipeline import fill_gaps


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
