from app.mapping.engine import to_response
from app.ocr_extract import extract_fields
from fixtures.invoice_text import LINES
from scorecard.run import BLANK, CORRECT, MISSED, WRONG, judge, load_cases, report, run_case, score


def _verdicts(case: dict) -> dict[str, str]:
    response = to_response(extract_fields(case["lines"]), 0.8, "case")
    return {f"{row.name}:{row.expected or row.actual}": row.verdict for row in score(case, response)}


def test_judge_separates_a_blank_from_a_wrong_value():
    assert judge("00151653", "00151653") == CORRECT
    assert judge("00151653", None) == MISSED
    assert judge("00151653", "00318574") == WRONG
    assert judge(None, None) == BLANK


def test_value_that_is_not_on_the_document_counts_as_wrong():
    assert judge(None, "SK1020215534") == WRONG


def test_names_are_compared_without_case_or_extra_spaces():
    assert judge("Ateliér Sever, s. r. o.", "ATELIÉR  SEVER, s. r. o.") == CORRECT


def test_fields_are_scored_against_the_expected_tags():
    verdicts = _verdicts(
        {
            "lines": LINES,
            "expected": {"dodavatel.ico": "00151653", "dodavatel.dic": None, "faktura.cislo": "2026-9999"},
        }
    )
    assert verdicts["dodavatel.ico:00151653"] == CORRECT
    assert verdicts["dodavatel.dic:None"] == BLANK
    assert verdicts["faktura.cislo:2026-9999"] == WRONG


def test_half_read_line_is_not_counted_as_a_wrong_item():
    response = to_response(extract_fields(LINES), 0.8, "case")
    # Drop the description the way a low-confidence read does, and keep the amount.
    item = response.tree.roots[0].sections[-1].items[0]
    item.tags[0].value = None
    verdicts = {
        f"{row.name}:{row.expected or row.actual}": row.verdict
        for row in score(
            {
                "items": [
                    ["Grafický návrh plagátu", "800.00"],
                    ["Tlač materiálov", "434.56"],
                ]
            },
            response,
        )
    }
    assert verdicts["položka:Grafický návrh plagátu | 800.00"] == MISSED
    assert verdicts["položka:Tlač materiálov | 434.56"] == CORRECT
    assert all(verdict != WRONG for verdict in verdicts.values())


def test_line_items_are_matched_by_text_and_amount():
    verdicts = _verdicts(
        {
            "lines": LINES,
            "items": [["Grafický návrh plagátu", "800.00"], ["Doprava", "20.00"]],
        }
    )
    assert verdicts["položka:Grafický návrh plagátu | 800.00"] == CORRECT
    assert verdicts["položka:Doprava | 20.00"] == MISSED
    assert verdicts["položka:Tlač materiálov | 434.56"] == WRONG


def test_unreadable_case_is_reported_and_not_scored():
    result = run_case({"name": "missing", "file": "fixtures/does-not-exist.pdf"}, 0.8)
    assert result.error
    assert "not read" in report([result])


def test_shipped_cases_show_no_wrong_value():
    results = [run_case(case, 0.8) for case in load_cases()]
    assert results
    assert all(result.error is None for result in results)
    assert sum(result.count(WRONG) for result in results) == 0
