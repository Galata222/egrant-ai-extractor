import json
from functools import lru_cache
from pathlib import Path

from app.gate import Candidate, apply_threshold, empty
from app.ocr_extract import Draft
from app.schemas import ExtractionResponse, Item, Root, Section, TagValue, Tree

_DICTIONARY = Path(__file__).with_name("tags.json")


@lru_cache(maxsize=1)
def load_dictionary() -> dict:
    return json.loads(_DICTIONARY.read_text(encoding="utf-8"))


def to_response(draft: Draft, threshold: float, document_id: str) -> ExtractionResponse:
    dictionary = load_dictionary()
    profiles = dictionary["profiles"]
    profile = profiles.get(draft.kind, profiles["invoice"])
    needs_review: list[str] = []
    sections: list[Section] = []

    for spec in profile["sections"]:
        tags: list[TagValue] = []
        for field in spec["fields"]:
            candidate = draft.fields.get(field["key"], empty())
            tag = _tag(field, candidate, threshold)
            tags.append(tag)
            if tag.needs_review:
                needs_review.append(tag.tag)
        sections.append(
            Section(
                id=spec["id"],
                title=spec["title"],
                items=[Item(id=spec["item_id"], tags=tags)],
            )
        )

    line_spec = profile["line_items"]
    line_items: list[Item] = []
    for index, line in enumerate(draft.lines, start=1):
        description = _tag(
            {
                "tag": line_spec["string_tag"],
                "label": line_spec["string_label"],
                "required": False,
            },
            line.description,
            threshold,
        )
        amount = _tag(
            {
                "tag": line_spec["currency_tag"],
                "label": line_spec["currency_label"],
                "required": False,
            },
            line.amount,
            threshold,
        )
        if description.value is None and amount.value is None:
            continue
        if description.needs_review:
            needs_review.append(f"polozky.{index}.TABLE_ITEM_STRING")
        if amount.needs_review:
            needs_review.append(f"polozky.{index}.TABLE_ITEM_CURRENCY")
        line_items.append(Item(id=f"polozka-{index}", tags=[description, amount]))

    sections.append(
        Section(
            id=line_spec["section_id"],
            title=line_spec["section_title"],
            items=line_items,
        )
    )

    tree = Tree(roots=[Root(id=dictionary["root_id"], sections=sections)])
    return ExtractionResponse(
        document_id=document_id,
        needs_review=needs_review,
        document_kind=draft.kind if draft.kind in profiles else "invoice",
        tree=tree,
    )


def _tag(field: dict, candidate: Candidate, threshold: float) -> TagValue:
    gated = apply_threshold(candidate, threshold)
    return TagValue(
        tag=field["tag"],
        label=field["label"],
        value=gated.value,
        confidence=gated.confidence,
        needs_review=gated.value is None or gated.confidence < threshold,
        required=bool(field["required"]),
    )
