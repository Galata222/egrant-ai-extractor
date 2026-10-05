import io
from dataclasses import dataclass

import pymupdf
from PIL import Image


class IngestError(ValueError):
    def __init__(self, code: str) -> None:
        self.code = code
        super().__init__(code)


@dataclass
class IngestedPage:
    image: Image.Image
    embedded_text: str | None


MAX_BYTES = 10 * 1024 * 1024


def detect_kind(data: bytes, filename: str) -> str | None:
    name = filename.lower()
    if data.startswith(b"%PDF") or name.endswith(".pdf"):
        if data.startswith(b"%PDF"):
            return "pdf"
    if data.startswith(b"\x89PNG") or name.endswith(".png"):
        if data.startswith(b"\x89PNG"):
            return "png"
    if data.startswith(b"\xff\xd8\xff") or name.endswith((".jpg", ".jpeg")):
        if data.startswith(b"\xff\xd8\xff"):
            return "jpeg"
    return None


def ingest(data: bytes, filename: str) -> IngestedPage:
    if not data:
        raise IngestError("empty_file")
    if len(data) > MAX_BYTES:
        raise IngestError("file_too_large")
    kind = detect_kind(data, filename)
    if kind == "pdf":
        return _pdf(data)
    if kind in {"png", "jpeg"}:
        return _image(data)
    raise IngestError("unsupported_type")


def _pdf(data: bytes) -> IngestedPage:
    try:
        document = pymupdf.open(stream=data, filetype="pdf")
    except Exception as exc:
        raise IngestError("unreadable_file") from exc
    try:
        if document.page_count < 1:
            raise IngestError("empty_pdf")
        page = document[0]
        text = page.get_text("text") or ""
        pixmap = page.get_pixmap(matrix=pymupdf.Matrix(2, 2), alpha=False)
        image = Image.frombytes("RGB", (pixmap.width, pixmap.height), pixmap.samples)
    finally:
        document.close()
    embedded = text if len(text.strip()) >= 40 else None
    return IngestedPage(image=image, embedded_text=embedded)


def _image(data: bytes) -> IngestedPage:
    try:
        image = Image.open(io.BytesIO(data)).convert("RGB")
    except Exception as exc:
        raise IngestError("unreadable_file") from exc
    return IngestedPage(image=image, embedded_text=None)
