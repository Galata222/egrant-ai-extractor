from app.gate import Candidate, merge_candidate
from app.ocr_extract import Draft, LineCandidate
from app.pipeline import merge_drafts


def test_disagreement_nulls_the_field():
    merged = merge_candidate(Candidate("00151653", 0.98), Candidate("00318574", 0.9), 0.8)
    assert merged.value is None
    assert merged.confidence == 0


def test_ocr_stands_when_donut_is_empty():
    merged = merge_candidate(Candidate("00151653", 0.98), Candidate(None, 0), 0.8)
    assert merged.value == "00151653"


def test_donut_fills_only_an_empty_field():
    merged = merge_candidate(Candidate(None, 0), Candidate("SK1020215534", 0.85), 0.8)
    assert merged.value == "SK1020215534"


def test_low_confidence_donut_does_not_erase_ocr():
    merged = merge_candidate(Candidate("2026-0142", 0.93), Candidate("9999-0001", 0.4), 0.8)
    assert merged.value == "2026-0142"


def test_line_items_keep_ocr_rows_when_present():
    ocr = Draft(
        fields={},
        lines=[LineCandidate(Candidate("Tlač", 0.9), Candidate("10.00", 0.92))],
    )
    donut = Draft(
        fields={},
        lines=[LineCandidate(Candidate("Iné", 0.85), Candidate("1.00", 0.85))],
    )
    merged = merge_drafts(ocr, donut, 0.8)
    assert merged.lines[0].description.value == "Tlač"
