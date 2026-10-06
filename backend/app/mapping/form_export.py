import json
from dataclasses import dataclass, field


_CONTAINERS = {
    "SECTION",
    "SUBSECTION",
    "REPEATABLE_SUBSECTION",
    "POPUP_SECTION",
    "WIZARD",
    "WIZARD_STEP",
}


@dataclass
class FormField:
    tag: str
    name: str
    type: str
    section_tag: str
    section_name: str
    table_tag: str | None = None
    table_name: str | None = None
    mandatory: bool = False


@dataclass
class Mapping:
    fields: dict[str, str] = field(default_factory=dict)
    lines: dict[str, str] = field(default_factory=dict)
    catalog: list[FormField] = field(default_factory=list)


def read_form(node: object) -> list[FormField]:
    found: list[FormField] = []
    _walk(node, None, None, found)
    return found


def parse_mapping(raw: str | None) -> Mapping | None:
    if raw is None or not str(raw).strip():
        return None
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ValueError("invalid_mapping") from exc
    if not isinstance(payload, dict):
        raise ValueError("invalid_mapping")
    field_map = payload.get("fields") or {}
    line_map = payload.get("lines") or {}
    if not isinstance(field_map, dict) or not isinstance(line_map, dict):
        raise ValueError("invalid_mapping")
    fields = {str(key): str(value) for key, value in field_map.items() if value}
    lines = {
        str(key): str(value)
        for key, value in line_map.items()
        if key in {"description", "amount", "invoice_file", "file_id"} and value
    }
    catalog = read_form(payload.get("form")) if payload.get("form") is not None else []
    if not fields and not lines:
        return None
    return Mapping(fields=fields, lines=lines, catalog=catalog)


def _walk(
    node: object,
    section: tuple[str, str] | None,
    table: tuple[str, str] | None,
    found: list[FormField],
) -> None:
    if isinstance(node, list):
        for child in node:
            _walk(child, section, table, found)
        return
    if not isinstance(node, dict):
        return
    kind = str(node.get("type") or "ROOT").strip().upper()
    tag = str(node.get("tag") or "").strip()
    name = str(node.get("name") or tag).strip()
    children = node.get("children") if isinstance(node.get("children"), list) else []
    if kind == "ROOT":
        for child in children:
            _walk(child, section, table, found)
        return
    if kind in _CONTAINERS:
        next_section = (tag or (section[0] if section else "formular"), name or (section[1] if section else "Formulár"))
        for child in children:
            _walk(child, next_section, table, found)
        return
    if kind == "TABLE_LIST":
        next_table = (tag or "tabulka", name or tag or "Tabuľka")
        parent = section or ("formular", "Formulár")
        for child in children:
            _walk(child, parent, next_table, found)
        return
    if not tag:
        for child in children:
            _walk(child, section, table, found)
        return
    section_tag, section_name = section or ("formular", "Formulár")
    found.append(
        FormField(
            tag=tag,
            name=name or tag,
            type=kind,
            section_tag=section_tag,
            section_name=section_name,
            table_tag=table[0] if table else None,
            table_name=table[1] if table else None,
            mandatory=bool(node.get("mandatory") or node.get("required")),
        )
    )
