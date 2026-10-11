import json

import pytest
from fastapi.testclient import TestClient

from app.agent import (
    AgentField,
    _sessions,
    answer_session,
    missing_fields,
    reset_sessions,
    start_session,
)
from app.main import app
from app.schemas import Item, Root, Section, TagValue, Tree


def setup_function():
    reset_sessions()


def _tag(name: str, label: str, value: str | None, required: bool = True) -> TagValue:
    return TagValue(
        tag=name,
        label=label,
        value=value,
        confidence=1 if value else 0,
        needs_review=value is None,
        required=required,
    )


def invoice_tree(dic: str | None) -> Tree:
    return Tree(
        roots=[
            Root(
                id="vyuctovanie",
                sections=[
                    Section(
                        id="dodavatel",
                        title="Dodávateľ",
                        items=[
                            Item(
                                id="dodavatel",
                                tags=[
                                    _tag("dodavatel.nazov", "Názov dodávateľa", "Ateliér Sever, s. r. o."),
                                    _tag("dodavatel.ico", "IČO dodávateľa", "00151653"),
                                    _tag("dodavatel.dic", "DIČ dodávateľa", dic),
                                ],
                            )
                        ],
                    )
                ],
            )
        ]
    )


def _dic(tree: Tree) -> str | None:
    return tree.roots[0].sections[0].items[0].tags[2].value


def test_rules_agent_asks_for_the_empty_required_field(monkeypatch):
    monkeypatch.delenv("AGENT_API_KEY", raising=False)
    turn = start_session("doc-1", invoice_tree(None))
    assert turn.status == "waiting"
    assert turn.decider == "rules"
    assert turn.code == "ask_reviewer"
    assert turn.focus is not None
    assert turn.focus.tag == "dodavatel.dic"
    assert _dic(_sessions[turn.session_id].tree) is None


def test_reviewer_value_then_ready(monkeypatch):
    monkeypatch.delenv("AGENT_API_KEY", raising=False)
    started = start_session("doc-1", invoice_tree(None))
    focus = started.focus
    assert focus is not None
    done = answer_session(started.session_id, focus.section_id, focus.item_id, focus.tag, "SK1020215534")
    assert done.status == "ready"
    assert done.code == "ready_to_confirm"
    assert done.focus is None
    assert _dic(_sessions[done.session_id].tree) == "SK1020215534"
    assert missing_fields(_sessions[done.session_id].tree) == []


def test_model_value_is_rejected_and_not_stored(monkeypatch):
    monkeypatch.setenv("AGENT_API_KEY", "test-key")
    calls = {"n": 0}

    def fake_post(url, headers, json, timeout):  # noqa: A002
        calls["n"] += 1
        assert headers["Authorization"] == "Bearer test-key"
        ask = next(tool for tool in json["tools"] if tool["function"]["name"] == "ask_reviewer")
        assert set(ask["function"]["parameters"]["properties"]) == {"section_id", "item_id", "tag"}
        assert "set_field" not in [tool["function"]["name"] for tool in json["tools"]]
        if calls["n"] == 1:
            return _completion("list_missing", {})
        if calls["n"] == 2:
            return _completion(
                "ask_reviewer",
                {
                    "section_id": "dodavatel",
                    "item_id": "dodavatel",
                    "tag": "dodavatel.dic",
                    "value": "SK1020215534",
                },
            )
        return _completion(
            "ask_reviewer",
            {"section_id": "dodavatel", "item_id": "dodavatel", "tag": "dodavatel.dic"},
        )

    monkeypatch.setattr("app.agent.httpx.post", fake_post)
    turn = start_session("doc-1", invoice_tree(None))
    assert calls["n"] == 3
    assert turn.decider == "model"
    assert turn.status == "waiting"
    assert turn.focus is not None
    assert turn.focus.tag == "dodavatel.dic"
    assert _dic(_sessions[turn.session_id].tree) is None


def test_ready_is_refused_while_a_field_is_empty(monkeypatch):
    monkeypatch.delenv("AGENT_API_KEY", raising=False)

    def always_ready(_session):
        return {"name": "ready_to_confirm", "arguments": {}}

    turn = start_session("doc-1", invoice_tree(None), decide=always_ready)
    assert turn.status == "failed"
    assert _dic(_sessions[turn.session_id].tree) is None


def test_unknown_tool_does_not_write(monkeypatch):
    monkeypatch.delenv("AGENT_API_KEY", raising=False)

    def invent(_session):
        return {"name": "set_field", "arguments": {"tag": "dodavatel.dic", "value": "SK1020215534"}}

    turn = start_session("doc-1", invoice_tree(None), decide=invent)
    assert turn.status == "failed"
    assert _dic(_sessions[turn.session_id].tree) is None


def test_empty_answer_is_refused(monkeypatch):
    monkeypatch.delenv("AGENT_API_KEY", raising=False)
    started = start_session("doc-1", invoice_tree(None))
    focus = started.focus
    assert focus is not None
    with pytest.raises(ValueError, match="empty_value"):
        answer_session(started.session_id, focus.section_id, focus.item_id, focus.tag, "  ")
    assert _dic(_sessions[started.session_id].tree) is None


def test_half_filled_line_is_missing():
    tree = Tree(
        roots=[
            Root(
                id="vyuctovanie",
                sections=[
                    Section(
                        id="polozky",
                        title="Položky",
                        items=[
                            Item(
                                id="row-1",
                                tags=[
                                    _tag("TABLE_ITEM_STRING", "Názov", "Konzultácia", required=False),
                                    _tag("TABLE_ITEM_CURRENCY", "Suma", None, required=False),
                                ],
                            )
                        ],
                    )
                ],
            )
        ]
    )
    assert missing_fields(tree) == [
        AgentField(section_id="polozky", item_id="row-1", tag="TABLE_ITEM_CURRENCY", label="Suma")
    ]


def test_agent_http_round_trip(monkeypatch):
    monkeypatch.delenv("AGENT_API_KEY", raising=False)
    client = TestClient(app)
    started = client.post(
        "/agent/start",
        json={"document_id": "doc-1", "tree": invoice_tree(None).model_dump()},
    )
    assert started.status_code == 200
    body = started.json()
    focus = body["focus"]
    answered = client.post(
        "/agent/answer",
        json={
            "session_id": body["session_id"],
            "section_id": focus["section_id"],
            "item_id": focus["item_id"],
            "tag": focus["tag"],
            "value": "SK1020215534",
        },
    )
    assert answered.status_code == 200
    assert answered.json()["status"] == "ready"
    refused = client.post(
        "/agent/answer",
        json={
            "session_id": body["session_id"],
            "section_id": focus["section_id"],
            "item_id": focus["item_id"],
            "tag": focus["tag"],
            "value": "SK1020215534",
        },
    )
    assert refused.status_code == 400
    assert refused.json()["detail"]["code"] == "wrong_field"


class _Response:
    def __init__(self, payload: dict) -> None:
        self._payload = payload

    def raise_for_status(self) -> None:
        return None

    def json(self) -> dict:
        return self._payload


def _completion(name: str, arguments: dict) -> _Response:
    return _Response(
        {
            "choices": [
                {
                    "message": {
                        "tool_calls": [
                            {
                                "id": f"call-{name}-{json.dumps(arguments, sort_keys=True)}",
                                "type": "function",
                                "function": {"name": name, "arguments": json.dumps(arguments)},
                            }
                        ]
                    }
                }
            ]
        }
    )
