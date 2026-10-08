"""Measure the extractor against documents whose correct values are known.

Run from the backend folder:

    python -m scorecard.run

Each JSON file in scorecard/cases describes one document and the values a
person would read from it. A value that is not printed on the document is
written as null, so an invented value is counted as wrong.
"""

import argparse
import json
import sys
from dataclasses import dataclass, field
from pathlib import Path

from app.mapping.engine import to_response
from app.ocr_extract import extract_fields
from app.pipeline import confidence_threshold, extract_document
from app.schemas import ExtractionResponse

BACKEND = Path(__file__).resolve().parent.parent
CASES = Path(__file__).with_name("cases")

CORRECT = "correct"
MISSED = "missed"
WRONG = "wrong"
BLANK = "blank"


@dataclass
class Row:
    name: str
    expected: str | None
    actual: str | None
    verdict: str


@dataclass
class CaseResult:
    name: str
    rows: list[Row] = field(default_factory=list)
    error: str | None = None

    def count(self, verdict: str) -> int:
        return sum(1 for row in self.rows if row.verdict == verdict)


def judge(expected: str | None, actual: str | None) -> str:
    if actual is None:
        return BLANK if expected is None else MISSED
    if expected is not None and _same(expected, actual):
        return CORRECT
    return WRONG


def score(case: dict, response: ExtractionResponse) -> list[Row]:
    fields, items = _read(response)
    rows = [
        Row(tag, expected, fields.get(tag), judge(expected, fields.get(tag)))
        for tag, expected in case.get("expected", {}).items()
    ]
    if "items" in case:
        rows.extend(_score_items([tuple(item) for item in case["items"]], items))
    return rows


def run_case(case: dict, threshold: float) -> CaseResult:
    name = str(case.get("name") or "case")
    try:
        if "file" in case:
            path = BACKEND / case["file"]
            response = extract_document(path.read_bytes(), path.name)
        else:
            response = to_response(extract_fields(case["lines"]), threshold, name)
    except Exception as exc:
        return CaseResult(name=name, error=str(exc) or type(exc).__name__)
    return CaseResult(name=name, rows=score(case, response))


def load_cases(folder: Path = CASES) -> list[dict]:
    return [json.loads(path.read_text(encoding="utf-8")) for path in sorted(folder.glob("*.json"))]


def report(results: list[CaseResult]) -> str:
    lines: list[str] = []
    for result in results:
        if result.error:
            lines.append(f"{result.name}: not read ({result.error})")
            continue
        lines.append(
            f"{result.name}: {result.count(CORRECT)} correct, "
            f"{result.count(MISSED)} left blank, {result.count(WRONG)} wrong"
        )
        for row in result.rows:
            if row.verdict == WRONG:
                lines.append(f"    WRONG  {row.name}: read {row.actual!r}, document says {row.expected!r}")
            elif row.verdict == MISSED:
                lines.append(f"    blank  {row.name}: document says {row.expected!r}")
    rows = [row for result in results for row in result.rows]
    correct = sum(1 for row in rows if row.verdict == CORRECT)
    missed = sum(1 for row in rows if row.verdict == MISSED)
    wrong = sum(1 for row in rows if row.verdict == WRONG)
    blank = sum(1 for row in rows if row.verdict == BLANK)
    printed = sum(1 for row in rows if row.expected is not None)
    absent = sum(1 for row in rows if row.expected is None)
    lines.append("")
    lines.append(f"Documents read: {sum(1 for result in results if not result.error)} of {len(results)}")
    lines.append(f"Values printed on the documents: {printed}")
    lines.append(f"  filled correctly:  {correct}{_share(correct, printed)}")
    lines.append(f"  left for a person: {missed}{_share(missed, printed)}")
    lines.append(f"Values not on the documents: {absent}, kept empty: {blank}")
    lines.append(f"Wrong values shown to the person: {wrong}")
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Score the extractor against known documents.")
    parser.add_argument("--cases", type=Path, default=CASES, help="folder with case JSON files")
    parser.add_argument("--fail-on-wrong", action="store_true", help="exit with 1 when any value is wrong")
    args = parser.parse_args(argv)
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    threshold = confidence_threshold()
    results = [run_case(case, threshold) for case in load_cases(args.cases)]
    print(report(results))
    wrong = sum(result.count(WRONG) for result in results)
    return 1 if args.fail_on_wrong and wrong else 0


def _read(response: ExtractionResponse) -> tuple[dict[str, str | None], list[tuple[str | None, str | None]]]:
    fields: dict[str, str | None] = {}
    items: list[tuple[str | None, str | None]] = []
    for root in response.tree.roots:
        for section in root.sections:
            for item in section.items:
                if section.role == "lines":
                    values = [tag.value for tag in item.tags[:2]] + [None, None]
                    items.append((values[0], values[1]))
                    continue
                for tag in item.tags:
                    fields[tag.tag] = tag.value
    return fields, items


def _score_items(
    expected: list[tuple[str, str]],
    actual: list[tuple[str | None, str | None]],
) -> list[Row]:
    rows: list[Row] = []
    unmatched = list(actual)
    for description, amount in expected:
        wanted = f"{description} | {amount}"
        found = next(
            (
                item
                for item in unmatched
                if item[0] is not None and item[1] is not None and _same(item[0], description) and item[1] == amount
            ),
            None,
        )
        if found is None:
            rows.append(Row("položka", wanted, None, MISSED))
            continue
        unmatched.remove(found)
        rows.append(Row("položka", wanted, wanted, CORRECT))
    for description, amount in unmatched:
        rows.append(Row("položka", None, f"{description} | {amount}", WRONG))
    return rows


def _same(left: str, right: str) -> bool:
    return " ".join(left.split()).casefold() == " ".join(right.split()).casefold()


def _share(part: int, whole: int) -> str:
    return f" ({part / whole:.0%})" if whole else ""


if __name__ == "__main__":
    raise SystemExit(main())
