"""Review agent.

The model may only choose the next tool. Field values enter the tree from the
extraction pipeline or from the person. A tool call that carries a value is
rejected and the tree is left unchanged.
"""

from __future__ import annotations

import json
import os
import threading
import uuid
from collections.abc import Callable
from typing import Any, Literal

import httpx
from pydantic import BaseModel, Field

from app.schemas import Tree
from app.validators import parse_date, parse_dic, parse_ico, parse_money

MAX_STEPS = 4
MISSING_LIMIT = 20
TOOL_NAMES = ("list_missing", "ask_reviewer", "ready_to_confirm")

Decide = Callable[["Session"], dict[str, Any]]


class AgentField(BaseModel):
    section_id: str
    item_id: str
    tag: str
    label: str


class AgentTurn(BaseModel):
    session_id: str
    status: Literal["waiting", "ready", "failed"]
    decider: Literal["model", "rules"]
    code: Literal["ask_reviewer", "ready_to_confirm", "agent_failed"]
    focus: AgentField | None = None
    missing_count: int = 0
    missing: list[AgentField] = Field(default_factory=list)


class AgentStart(BaseModel):
    document_id: str
    tree: Tree


class AgentAnswer(BaseModel):
    session_id: str
    section_id: str
    item_id: str
    tag: str
    value: str


class Session:
    def __init__(self, document_id: str, tree: Tree) -> None:
        self.id = str(uuid.uuid4())
        self.document_id = document_id
        self.tree = tree
        self.status: Literal["waiting", "ready", "failed"] = "waiting"
        self.code: Literal["ask_reviewer", "ready_to_confirm", "agent_failed"] = "ask_reviewer"
        self.focus: AgentField | None = None
        self.trace: list[dict[str, Any]] = []
        self.messages: list[dict[str, Any]] = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": "A document was extracted. Choose the next tool. Do not invent a field value.",
            },
        ]


SYSTEM_PROMPT = (
    "You are the review agent for one eGrant document. "
    "Choose exactly one tool. You never invent, guess, or write a field value. "
    "Call list_missing before you ask or finish. "
    "If a required field is empty, call ask_reviewer for one of those fields and do not include a value. "
    "If list_missing is empty, call ready_to_confirm. The person still presses confirm."
)

TOOL_SPEC: list[dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "list_missing",
            "description": "List required fields that are still empty. Values are not included.",
            "parameters": {"type": "object", "properties": {}, "additionalProperties": False},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "ask_reviewer",
            "description": "Ask the person to type one empty field. Do not supply the value.",
            "parameters": {
                "type": "object",
                "properties": {
                    "section_id": {"type": "string"},
                    "item_id": {"type": "string"},
                    "tag": {"type": "string"},
                },
                "required": ["section_id", "item_id", "tag"],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "ready_to_confirm",
            "description": "Use only when list_missing is empty. This does not confirm the document.",
            "parameters": {"type": "object", "properties": {}, "additionalProperties": False},
        },
    },
]

_sessions: dict[str, Session] = {}
_lock = threading.Lock()


def reset_sessions() -> None:
    with _lock:
        _sessions.clear()


def start_session(document_id: str, tree: Tree, decide: Decide | None = None) -> AgentTurn:
    session = Session(document_id, tree.model_copy(deep=True))
    with _lock:
        if len(_sessions) > 100:
            _sessions.pop(next(iter(_sessions)))
        _sessions[session.id] = session
    return _run(session, decide or default_decide)


def answer_session(
    session_id: str,
    section_id: str,
    item_id: str,
    tag: str,
    value: str,
    decide: Decide | None = None,
) -> AgentTurn:
    with _lock:
        session = _sessions.get(session_id)
    if session is None:
        raise KeyError(session_id)
    if session.focus is None or session.status != "waiting":
        raise ValueError("wrong_field")
    if (
        session.focus.section_id != section_id
        or session.focus.item_id != item_id
        or session.focus.tag != tag
    ):
        raise ValueError("wrong_field")
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("empty_value")
    checked = check_human_value(_field_key(session.tree, section_id, item_id, tag), cleaned)
    if checked is None:
        raise ValueError("invalid_value")
    _apply_human_value(session.tree, section_id, item_id, tag, checked)
    session.messages.append(
        {
            "role": "user",
            "content": "The reviewer filled the field you asked for. Choose the next tool. Do not invent a value.",
        }
    )
    return _run(session, decide or default_decide)


def default_decide(session: Session) -> dict[str, Any]:
    if os.getenv("AGENT_API_KEY"):
        return model_decide(session)
    return rules_decide(session)


def rules_decide(session: Session) -> dict[str, Any]:
    names = [step.get("name") for step in session.trace]
    if "list_missing" not in names:
        return {"name": "list_missing", "arguments": {}}
    missing = missing_fields(session.tree)
    if missing:
        field = missing[0]
        return {
            "name": "ask_reviewer",
            "arguments": {
                "section_id": field.section_id,
                "item_id": field.item_id,
                "tag": field.tag,
            },
        }
    return {"name": "ready_to_confirm", "arguments": {}}


def model_decide(session: Session) -> dict[str, Any]:
    key = os.environ["AGENT_API_KEY"]
    base = os.getenv("AGENT_BASE_URL", "https://api.openai.com/v1").rstrip("/")
    model = os.getenv("AGENT_MODEL", "gpt-4o-mini")
    response = httpx.post(
        f"{base}/chat/completions",
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        json={
            "model": model,
            "messages": session.messages,
            "tools": TOOL_SPEC,
            "tool_choice": "required",
        },
        timeout=30,
    )
    response.raise_for_status()
    message = response.json()["choices"][0]["message"]
    calls = message.get("tool_calls") or []
    if not calls:
        raise RuntimeError("agent_failed")
    call = calls[0]
    raw = call["function"].get("arguments") or "{}"
    arguments = json.loads(raw) if isinstance(raw, str) else raw
    if not isinstance(arguments, dict):
        arguments = {}
    decision = {
        "name": call["function"]["name"],
        "arguments": arguments,
        "id": call.get("id") or f"call-{len(session.messages)}",
    }
    session.messages.append(
        {
            "role": "assistant",
            "content": None,
            "tool_calls": [
                {
                    "id": decision["id"],
                    "type": "function",
                    "function": {
                        "name": decision["name"],
                        "arguments": json.dumps(arguments),
                    },
                }
            ],
        }
    )
    return decision


def missing_fields(tree: Tree) -> list[AgentField]:
    found: list[AgentField] = []
    for root in tree.roots:
        for section in root.sections:
            if section.id == "polozky":
                for item in section.items:
                    description = _tag(item.tags, "TABLE_ITEM_STRING")
                    amount = _tag(item.tags, "TABLE_ITEM_CURRENCY")
                    has_description = bool(description and description.value and description.value.strip())
                    has_amount = bool(amount and amount.value and amount.value.strip())
                    if has_description == has_amount:
                        continue
                    target = amount if has_description else description
                    if target is None:
                        continue
                    found.append(
                        AgentField(
                            section_id=section.id,
                            item_id=item.id,
                            tag=target.tag,
                            label=target.label,
                        )
                    )
                continue
            for item in section.items:
                for tag in item.tags:
                    if tag.required and not (tag.value and tag.value.strip()):
                        found.append(
                            AgentField(
                                section_id=section.id,
                                item_id=item.id,
                                tag=tag.tag,
                                label=tag.label,
                            )
                        )
    return found


def _run(session: Session, decide: Decide) -> AgentTurn:
    session.trace = []
    session.focus = None
    for _ in range(MAX_STEPS):
        try:
            decision = decide(session)
        except Exception:
            session.status = "failed"
            session.code = "agent_failed"
            session.focus = None
            return _turn(session, decide)
        name = str(decision.get("name") or "")
        raw_args = decision.get("arguments")
        arguments = raw_args if isinstance(raw_args, dict) else {}
        if name not in TOOL_NAMES or "value" in arguments:
            _record_tool(session, decision, {"error": "rejected"})
            session.trace.append({"name": name, "error": "rejected"})
            continue
        outcome = _perform(session, name, arguments)
        _record_tool(session, decision, outcome["result"])
        session.trace.append({"name": name})
        if outcome["pause"]:
            return _turn(session, decide)
    session.status = "failed"
    session.code = "agent_failed"
    session.focus = None
    return _turn(session, decide)


def _perform(session: Session, name: str, arguments: dict[str, Any]) -> dict[str, Any]:
    missing = missing_fields(session.tree)
    if name == "list_missing":
        shown = [_public_field(field) for field in missing[:MISSING_LIMIT]]
        return {"pause": False, "result": {"count": len(missing), "fields": shown}}
    if name == "ask_reviewer":
        field = _match(missing, arguments)
        if field is None:
            return {"pause": False, "result": {"error": "That field is not an empty required field."}}
        session.status = "waiting"
        session.code = "ask_reviewer"
        session.focus = field
        return {"pause": True, "result": {"waiting_for": field.tag}}
    if missing:
        return {"pause": False, "result": {"error": "Required fields are still empty."}}
    session.status = "ready"
    session.code = "ready_to_confirm"
    session.focus = None
    return {"pause": True, "result": {"ok": True}}


def _record_tool(session: Session, decision: dict[str, Any], result: dict[str, Any]) -> None:
    call_id = str(decision.get("id") or f"call-{len(session.messages)}")
    if not any(message.get("role") == "assistant" and _call_id(message) == call_id for message in session.messages):
        session.messages.append(
            {
                "role": "assistant",
                "content": None,
                "tool_calls": [
                    {
                        "id": call_id,
                        "type": "function",
                        "function": {
                            "name": str(decision.get("name") or ""),
                            "arguments": json.dumps(decision.get("arguments") or {}),
                        },
                    }
                ],
            }
        )
    session.messages.append(
        {"role": "tool", "tool_call_id": call_id, "content": json.dumps(result)}
    )


def _call_id(message: dict[str, Any]) -> str:
    calls = message.get("tool_calls") or []
    if not calls:
        return ""
    return str(calls[0].get("id") or "")


def _decider_name(decide: Decide) -> Literal["model", "rules"]:
    if decide is model_decide:
        return "model"
    if decide is default_decide and os.getenv("AGENT_API_KEY"):
        return "model"
    return "rules"


def _turn(session: Session, decide: Decide) -> AgentTurn:
    missing = missing_fields(session.tree)
    return AgentTurn(
        session_id=session.id,
        status=session.status,
        decider=_decider_name(decide),
        code=session.code,
        focus=session.focus,
        missing_count=len(missing),
        missing=missing[:MISSING_LIMIT],
    )


_DATE_KEYS = {"issue_date", "due_date", "booking_date", "effective_date", "signed_date"}
_MONEY_KEYS = {
    "total_net",
    "total_gross",
    "contract_value",
    "settlement_total",
    "statement_amount",
    "amount",
}


def check_human_value(key: str | None, value: str) -> str | None:
    """Check a typed value like an extracted one. Returns the value to store, or None.

    A person can mistype as easily as OCR can misread, so the same validators apply.
    Fields without a format (names, document numbers) are kept as typed.
    """
    if key == "ico":
        return parse_ico(value)
    if key == "dic":
        compact = value.replace(" ", "")
        # A person types the tax number as printed: ten digits, with or without "SK".
        if compact.isdigit() and len(compact) == 10:
            return compact
        return parse_dic(value)
    if key in _DATE_KEYS:
        return parse_date(value)
    if key in _MONEY_KEYS:
        # The extractor wants a currency next to a whole amount; a person typing
        # into an amount field has already said it is money.
        return parse_money(value) or parse_money(f"{value} EUR")
    return value


def _field_key(tree: Tree, section_id: str, item_id: str, tag_name: str) -> str | None:
    for root in tree.roots:
        for section in root.sections:
            if section.id != section_id:
                continue
            for item in section.items:
                if item.id != item_id:
                    continue
                for tag in item.tags:
                    if tag.tag == tag_name:
                        return tag.key
    return None


def _apply_human_value(tree: Tree, section_id: str, item_id: str, tag_name: str, value: str) -> None:
    for root in tree.roots:
        for section in root.sections:
            if section.id != section_id:
                continue
            for item in section.items:
                if item.id != item_id:
                    continue
                for tag in item.tags:
                    if tag.tag != tag_name:
                        continue
                    tag.value = value
                    tag.confidence = 1
                    tag.needs_review = False
                    return
    raise ValueError("unknown_field")


def _match(missing: list[AgentField], arguments: dict[str, Any]) -> AgentField | None:
    for field in missing:
        if (
            field.section_id == arguments.get("section_id")
            and field.item_id == arguments.get("item_id")
            and field.tag == arguments.get("tag")
        ):
            return field
    return None


def _public_field(field: AgentField) -> dict[str, str]:
    return {
        "section_id": field.section_id,
        "item_id": field.item_id,
        "tag": field.tag,
        "label": field.label,
    }


def _tag(tags: list[Any], name: str) -> Any | None:
    for tag in tags:
        if tag.tag == name:
            return tag
    return None
