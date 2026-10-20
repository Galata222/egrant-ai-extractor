from app.pipeline import extract_document
from fixtures.build_sample import build


def test_generated_invoice_roundtrip():
    pdf_path, png_path = build()
    assert png_path.stat().st_size > 1000
    response = extract_document(pdf_path.read_bytes(), pdf_path.name)
    values = {
        tag.tag: tag.value
        for root in response.tree.roots
        for section in root.sections
        for item in section.items
        for tag in item.tags
    }
    assert values["dodavatel.nazov"] == "Ateliér Sever, s. r. o."
    assert values["dodavatel.ico"] == "00151653"
    assert values["dodavatel.dic"] is None
    assert values["faktura.cislo"] == "2026-0142"
    assert values["faktura.suma_bez_dph"] == "1234.56"
    assert values["faktura.suma_s_dph"] == "1481.47"
    assert "dodavatel.dic" in response.needs_review


def test_building_the_sample_again_changes_no_file():
    first = [path.read_bytes() for path in build()]
    stamps = [path.stat().st_mtime_ns for path in build()]
    second = build()
    assert [path.read_bytes() for path in second] == first
    assert [path.stat().st_mtime_ns for path in second] == stamps  # not even rewritten
