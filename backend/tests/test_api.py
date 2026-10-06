from fastapi.testclient import TestClient

from app.main import app
from fixtures.build_sample import build


def test_health():
    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_extract_rejects_a_broken_mapping():
    client = TestClient(app)
    response = client.post(
        "/extract",
        files={"file": ("poznamka.pdf", b"%PDF-1.4", "application/pdf")},
        data={"mapping": "{"},
    )
    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "invalid_mapping"


def test_extract_rejects_unknown_type():
    client = TestClient(app)
    response = client.post(
        "/extract",
        files={"file": ("poznamka.txt", b"nie je doklad", "text/plain")},
    )
    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "unsupported_type"


def test_extract_sample_pdf():
    pdf_path, _png_path = build()
    client = TestClient(app)
    response = client.post(
        "/extract",
        files={"file": (pdf_path.name, pdf_path.read_bytes(), "application/pdf")},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["tree"]["roots"][0]["id"] == "vyuctovanie"
    assert body["page_preview"].startswith("data:image/png;base64,")
    assert "dodavatel.dic" in body["needs_review"]
