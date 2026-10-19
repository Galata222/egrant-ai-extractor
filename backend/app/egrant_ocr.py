import logging
import os

logger = logging.getLogger("egrant.ocr")


def configured() -> bool:
    return bool(os.getenv("EGRANT_OCR_URL", "").strip())


def read_text(data: bytes, filename: str) -> str | None:
    url = os.getenv("EGRANT_OCR_URL", "").strip()
    if not url:
        return None
    try:
        import httpx

        # The organizer image reads a text layer itself and OCRs only when that
        # layer is missing. force_ocr is left off so this call cannot replace a
        # checked value the local text layer already accepted.
        response = httpx.post(
            url,
            files={"file": (filename or "doklad", data)},
            timeout=45.0,
        )
        response.raise_for_status()
        return text_from_body(response.json())
    except Exception:
        logger.warning("egrant ocr request failed")
        return None


def text_from_body(body: object) -> str | None:
    if not isinstance(body, dict):
        return None
    text = body.get("text")
    if not isinstance(text, str) or not text.strip():
        return None
    return text
