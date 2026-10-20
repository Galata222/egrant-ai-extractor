import sys
from pathlib import Path

import pymupdf

ROOT = Path(__file__).resolve().parents[2]
FIXTURE_DIR = Path(__file__).resolve().parent
FONT_CANDIDATES = [
    Path(r"C:\Windows\Fonts\arial.ttf"),
    Path(r"C:\Windows\Fonts\segoeui.ttf"),
    Path(r"C:\Windows\Fonts\calibri.ttf"),
    Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
]


def font_path() -> Path:
    for candidate in FONT_CANDIDATES:
        if candidate.is_file():
            return candidate
    raise FileNotFoundError("Nenašiel sa TTF font s podporou slovenčiny.")


def build() -> tuple[Path, Path]:
    from fixtures.invoice_text import LINES

    font = font_path()
    document = pymupdf.open()
    page = document.new_page(width=595, height=842)
    page.insert_font(fontname="sample", fontfile=str(font))
    y = 56
    for line in LINES:
        page.insert_text((48, y), line, fontname="sample", fontsize=13)
        y += 28
    pdf_path = FIXTURE_DIR / "sample-invoice.pdf"
    png_path = FIXTURE_DIR / "sample-invoice.png"
    document.subset_fonts()
    # no_new_id: PyMuPDF otherwise writes a new random document ID on every save,
    # so each test run changed the committed PDFs although the content was the same.
    _write_if_changed(pdf_path, document.tobytes(garbage=4, deflate=True, no_new_id=True))
    pixmap = page.get_pixmap(matrix=pymupdf.Matrix(2, 2), alpha=False)
    _write_if_changed(png_path, pixmap.tobytes("png"))
    public = ROOT / "frontend" / "public" / "samples"
    public.mkdir(parents=True, exist_ok=True)
    _write_if_changed(public / "sample-invoice.pdf", pdf_path.read_bytes())
    document.close()
    return pdf_path, png_path


def _write_if_changed(path: Path, data: bytes) -> None:
    if not path.is_file() or path.read_bytes() != data:
        path.write_bytes(data)


if __name__ == "__main__":
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
    pdf, png = build()
    print(pdf)
    print(png)
