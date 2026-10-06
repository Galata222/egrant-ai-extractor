import json
from functools import lru_cache
from pathlib import Path

from app.gate import Candidate, apply_threshold, empty
from app.mapping.form_export import FormField, Mapping
from app.ocr_extract import Draft
from app.schemas import ExtractionResponse, Item, Root, Section, TagValue, Tree

_DICTIONARY = Path(__file__).with_name("tags.json")


@lru_cache(maxsize=1)
def load_dictionary() -> dict:
    return json.loads(_DICTIONARY.read_text(encoding="utf-8"))


def to_response(
    draft: Draft,
    threshold: float,
    document_id: str,
    mapping: Mapping | None = None,
) -> ExtractionResponse:
    if mapping is not None and (mapping.fields or mapping.lines):
        mapped = _from_mapping(draft, threshold, document_id, mapping)
        if mapped is not None:
            return mapped
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
        line_items.append(
            Item(
                id=f"polozka-{index}",
                tags=_line_tags(description, amount, line, threshold),
            )
        )

    sections.append(
        Section(
            id=line_spec["section_id"],
            title=line_spec["section_title"],
            items=line_items,
            role="lines",
        )
    )

    tree = Tree(roots=[Root(id=dictionary["root_id"], sections=sections)])
    return ExtractionResponse(
        document_id=document_id,
        needs_review=needs_review,
        document_kind=draft.kind if draft.kind in profiles else "invoice",
        tree=tree,
    )


def _from_mapping(
    draft: Draft,
    threshold: float,
    document_id: str,
    mapping: Mapping,
) -> ExtractionResponse | None:
    by_tag = {item.tag: item for item in mapping.catalog}
    section_order: list[str] = []
    buckets: dict[str, list[tuple[str, str, FormField | None]]] = {}
    titles: dict[str, str] = {}
    for key, tag in mapping.fields.items():
        meta = by_tag.get(tag)
        if meta is not None and meta.table_tag:
            continue
        section_id = meta.section_tag if meta is not None else "formular"
        if section_id not in buckets:
            buckets[section_id] = []
            section_order.append(section_id)
            titles[section_id] = meta.section_name if meta is not None else "Formulár"
        buckets[section_id].append((key, tag, meta))

    needs_review: list[str] = []
    sections: list[Section] = []
    for section_id in section_order:
        tags: list[TagValue] = []
        for key, tag_name, meta in buckets[section_id]:
            tag = _tag(
                {
                    "tag": tag_name,
                    "label": meta.name if meta is not None else tag_name,
                    "required": meta.mandatory if meta is not None else False,
                },
                draft.fields.get(key, empty()),
                threshold,
            )
            tags.append(tag)
            if tag.needs_review:
                needs_review.append(tag.tag)
        if tags:
            sections.append(
                Section(
                    id=section_id,
                    title=titles[section_id],
                    items=[Item(id=section_id, tags=tags)],
                )
            )

    description_tag = mapping.lines.get("description")
    amount_tag = mapping.lines.get("amount")
    if description_tag and amount_tag:
        desc_meta = by_tag.get(description_tag)
        amount_meta = by_tag.get(amount_tag)
        if desc_meta is not None and desc_meta.table_tag:
            section_id = desc_meta.table_tag
            title = desc_meta.table_name or "Položky"
        else:
            section_id = "polozky"
            title = "Položky"
        line_items: list[Item] = []
        for index, line in enumerate(draft.lines, start=1):
            description = _tag(
                {
                    "tag": description_tag,
                    "label": desc_meta.name if desc_meta is not None else description_tag,
                    "required": False,
                },
                line.description,
                threshold,
            )
            amount = _tag(
                {
                    "tag": amount_tag,
                    "label": amount_meta.name if amount_meta is not None else amount_tag,
                    "required": False,
                },
                line.amount,
                threshold,
            )
            if description.value is None and amount.value is None:
                continue
            if description.needs_review:
                needs_review.append(f"{section_id}.{index}.{description.tag}")
            if amount.needs_review:
                needs_review.append(f"{section_id}.{index}.{amount.tag}")
            line_items.append(
                Item(
                    id=f"polozka-{index}",
                    tags=_line_tags(
                        description,
                        amount,
                        line,
                        threshold,
                        mapping.lines.get("invoice_file") or "doklad.faktura",
                        mapping.lines.get("file_id") or "doklad.subor_id",
                    ),
                )
            )
        sections.append(Section(id=section_id, title=title, items=line_items, role="lines"))

    if not sections:
        return None
    profiles = load_dictionary()["profiles"]
    return ExtractionResponse(
        document_id=document_id,
        needs_review=needs_review,
        document_kind=draft.kind if draft.kind in profiles else "invoice",
        tree=Tree(roots=[Root(id="formular", sections=sections)]),
    )


def _line_tags(
    description: TagValue,
    amount: TagValue,
    line,
    threshold: float,
    file_tag: str = "doklad.faktura",
    file_id_tag: str = "doklad.subor_id",
) -> list[TagValue]:
    tags = [description, amount]
    if line.invoice_file.value:
        tags.append(
            _tag(
                {"tag": file_tag, "label": "Faktúra", "required": False},
                line.invoice_file,
                threshold,
            )
        )
    if line.file_id.value:
        tags.append(
            _tag(
                {"tag": file_id_tag, "label": "ID súboru", "required": False},
                line.file_id,
                threshold,
            )
        )
    return tags


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
