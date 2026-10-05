import os
import time
from typing import Any

from PIL import Image

from app.confidence import blend
from app.gate import Candidate, accept, empty
from app.ocr_extract import Draft, LineCandidate
from app.validators import (
    parse_date,
    parse_description,
    parse_dic,
    parse_ico,
    parse_invoice_number,
    parse_money,
    parse_supplier_name,
)

_MODEL_NAME = "naver-clova-ix/donut-base-finetuned-cord-v2"
_processor = None
_model = None


def enabled() -> bool:
    raw = os.getenv("ENABLE_DONUT")
    if raw is None:
        return _installed()
    return raw.strip().lower() in {"1", "true", "yes"}


def extract_donut(image: Image.Image, budget: float | None = None) -> Draft:
    if not enabled():
        return Draft()
    limit = 8.0 if budget is None else budget
    limit = min(limit, float(os.getenv("DONUT_BUDGET_SECONDS", "8")))
    if limit <= 0:
        return Draft()
    started = time.perf_counter()
    try:
        raw, recognition = _generate(image)
    except Exception:
        return Draft()
    if time.perf_counter() - started > limit:
        return Draft()
    return _from_cord(raw, recognition)


def _installed() -> bool:
    try:
        import torch  # noqa: F401
        import transformers  # noqa: F401
    except ImportError:
        return False
    return True


def _generate(image: Image.Image) -> tuple[dict[str, Any], float | None]:
    global _processor, _model
    import torch
    from transformers import DonutProcessor, VisionEncoderDecoderModel

    if _processor is None or _model is None:
        _processor = DonutProcessor.from_pretrained(_MODEL_NAME)
        _model = VisionEncoderDecoderModel.from_pretrained(_MODEL_NAME)
        _model.eval()
    pixel = _processor(image.convert("RGB"), return_tensors="pt").pixel_values
    decoder_input = _processor.tokenizer(
        "<s_cord-v2>",
        add_special_tokens=False,
        return_tensors="pt",
    ).input_ids
    with torch.no_grad():
        outputs = _model.generate(
            pixel,
            decoder_input_ids=decoder_input,
            max_length=int(_model.config.decoder.max_position_embeddings),
            pad_token_id=_processor.tokenizer.pad_token_id,
            eos_token_id=_processor.tokenizer.eos_token_id,
            use_cache=True,
            bad_words_ids=[[_processor.tokenizer.unk_token_id]],
            return_dict_in_generate=True,
            output_scores=True,
        )
    sequence = _processor.batch_decode(outputs.sequences)[0]
    sequence = sequence.replace(_processor.tokenizer.eos_token, "").replace(_processor.tokenizer.pad_token, "")
    sequence = sequence.replace(_processor.tokenizer.bos_token, "")
    parsed = _processor.token2json(sequence)
    payload = parsed if isinstance(parsed, dict) else {}
    return payload, _sequence_confidence(outputs)


def _sequence_confidence(outputs: Any) -> float | None:
    scores = getattr(outputs, "scores", None)
    if not scores:
        return None
    import torch

    probabilities: list[float] = []
    for step in scores:
        probabilities.append(float(torch.softmax(step[0], dim=-1).max()))
    if not probabilities:
        return None
    return sum(probabilities) / len(probabilities)


def _from_cord(payload: dict[str, Any], recognition: float | None) -> Draft:
    total = payload.get("total") if isinstance(payload.get("total"), dict) else {}
    subtotal = payload.get("sub_total") if isinstance(payload.get("sub_total"), dict) else {}
    gross = parse_money(_text(total.get("total_price")))
    net = parse_money(_text(subtotal.get("subtotal_price")))
    menu = payload.get("menu")
    lines: list[LineCandidate] = []
    if isinstance(menu, list):
        for row in menu:
            if not isinstance(row, dict):
                continue
            description = parse_description(_text(row.get("nm")))
            amount = parse_money(_text(row.get("price")))
            if description and amount:
                lines.append(
                    LineCandidate(
                        _field(description, 0.86, recognition),
                        _field(amount, 0.9, recognition),
                    )
                )
    return Draft(
        kind="receipt",
        fields={
            "supplier_name": _field(parse_supplier_name(_text(payload.get("store_name"))), 0.86, recognition),
            "ico": _field(parse_ico(_text(payload.get("store_id"))), 0.94, recognition),
            "dic": _field(parse_dic(_text(payload.get("tax_id"))), 0.9, recognition),
            "invoice_number": _field(parse_invoice_number(_text(payload.get("invoice_number"))), 0.9, recognition),
            "issue_date": _field(parse_date(_text(payload.get("date"))), 0.9, recognition),
            "due_date": empty(),
            "total_net": _field(net, 0.9, recognition),
            "total_gross": _field(gross, 0.9, recognition),
        },
        lines=lines,
    )


def _field(value: str | None, anchor: float, recognition: float | None) -> Candidate:
    return accept(value, blend(anchor, recognition))


def _text(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None
