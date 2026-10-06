import logging

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from app.ingest import IngestError
from app.mapping.form_export import parse_mapping
from app.pipeline import extract_document
from app.schemas import ExtractionResponse

logger = logging.getLogger("egrant")

app = FastAPI(title="eGrant AI Extraction", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/extract", response_model=ExtractionResponse)
async def extract(
    file: UploadFile = File(...),
    mapping: str | None = Form(None),
) -> ExtractionResponse:
    data = await file.read()
    try:
        chosen = parse_mapping(mapping)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail={"code": str(exc)}) from exc
    try:
        return extract_document(data, file.filename or "doklad", chosen)
    except IngestError as exc:
        raise HTTPException(status_code=400, detail={"code": exc.code}) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail={"code": str(exc)}) from exc
    except Exception as exc:
        logger.exception("extract failed")
        raise HTTPException(status_code=500, detail={"code": "extract_failed"}) from exc
