import base64
import io
import os
import time
from uuid import uuid4

from PIL import Image

from app.donut_extract import enabled as donut_enabled
from app.donut_extract import extract_donut
from app.gate import empty, enforce_vat, merge_candidate
from app.ingest import ingest
from app.mapping.engine import to_response
from app.ocr_extract import Draft, extract_fields, lines_from_page
from app.schemas import ExtractionResponse


def confidence_threshold() -> float:
    raw = os.getenv("CONFIDENCE_THRESHOLD", "0.8")
    try:
        value = float(raw)
    except ValueError:
        return 0.8
    if not 0 < value <= 1:
        return 0.8
    return value


def extract_document(data: bytes, filename: str) -> ExtractionResponse:
    started = time.perf_counter()
    page = ingest(data, filename)
    pairs = lines_from_page(page)
    ocr_draft = extract_fields([text for text, _score in pairs], [score for _text, score in pairs])
    donut_draft = Draft()
    # The vision model reads pages that have no text layer. A digital PDF keeps
    # the text layer so a receipt model cannot erase a checked value, and the
    # page stays inside the 15 second budget.
    if page.embedded_text is None and donut_enabled():
        remaining = 14.0 - (time.perf_counter() - started)
        donut_draft = extract_donut(page.image, budget=remaining)
    merged = merge_drafts(ocr_draft, donut_draft, confidence_threshold())
    if page.embedded_text is None and not pairs and _draft_empty(merged):
        raise RuntimeError("ocr_unavailable")
    response = to_response(merged, confidence_threshold(), str(uuid4()))
    return response.model_copy(update={"page_preview": preview_data_url(page.image)})


def preview_data_url(image: Image.Image) -> str:
    preview = image.copy()
    preview.thumbnail((1200, 1600))
    buffer = io.BytesIO()
    preview.save(buffer, format="PNG")
    encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
    return f"data:image/png;base64,{encoded}"


def merge_drafts(ocr: Draft, donut: Draft, threshold: float) -> Draft:
    keys = set(ocr.fields) | set(donut.fields)
    fields = {
        key: merge_candidate(ocr.fields.get(key, empty()), donut.fields.get(key), threshold)
        for key in keys
    }
    net, gross = enforce_vat(fields.get("total_net", empty()), fields.get("total_gross", empty()))
    fields["total_net"] = net
    fields["total_gross"] = gross
    # Rows stay with the anchored read. Donut rows are used only when that read found none.
    lines = ocr.lines or donut.lines
    text_found = any(candidate.value for candidate in ocr.fields.values()) or bool(ocr.lines)
    kind = ocr.kind if text_found or ocr.kind != "invoice" else donut.kind or "invoice"
    return Draft(fields=fields, lines=lines, kind=kind)


def _draft_empty(draft: Draft) -> bool:
    if draft.lines:
        return False
    return all(candidate.value is None for candidate in draft.fields.values())
