# eGrant AI Data Extraction

Detachable module for the FUTURE MAKERS hackathon. An applicant uploads an invoice, a receipt, or a contract. The FastAPI service reads it, keeps only values that pass the validators, and returns an eGrant tag tree. A grant manager checks the split-screen form and confirms the JSON. eGrant's own backend is not modified.

The requirements live in [docs/SRS.md](docs/SRS.md). The JSON contract lives in [docs/egrant-fill.md](docs/egrant-fill.md).

## How it stays honest

A field is returned only when a validator accepts it:

- IČO is 8 digits and passes the Slovak/Czech checksum.
- DIČ / IČ DPH is `SK` plus 10 digits, as printed on the document.
- Dates are real calendar dates.
- Amounts use Slovak money (`1 234,56`) and are stored as decimal strings.
- If the gross total is lower than the net total, both totals become `null`.
- Supplier IČO is taken from the supplier block, not from the customer block.

The confidence threshold defaults to `0.8` (`CONFIDENCE_THRESHOLD`). Each score is calculated from the label and the validator, and blended with the OCR or Donut token probability when that read exists. Below `0.8`, the value is `null`. A bare total with no currency is one of those weak reads. The manager UI does not show scores. It marks blank fields with the hint "Neznámy údaj - doplňte ručne".

Digital PDFs use the text layer, which is exact and finishes well under 15 seconds. Photos and scanned PDFs go through EasyOCR (`sk` + `en`). When PyTorch and Transformers are installed, those pages also run Donut (`naver-clova-ix/donut-base-finetuned-cord-v2`). Donut may fill a field the anchored read left empty, after the same validators. If the two reads disagree, the field stays `null`. Donut does not run on a digital PDF, so a receipt-model guess cannot erase a checked invoice. Set `ENABLE_DONUT=false` to skip it. Install the model extra with [backend/requirements-donut.txt](backend/requirements-donut.txt). The time budget is `DONUT_BUDGET_SECONDS` (default 8), and the whole page stops at 15 seconds.

## Run on Windows

From the repository root, in two terminals.

Backend:

```powershell
cd backend
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

`pip install -r requirements.txt` includes PyTorch and EasyOCR. Those wheels are large. The sample PDF and the unit tests do not download model weights. Image OCR downloads EasyOCR language data on the first photo.

Frontend:

```powershell
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The button **Načítať ukážkovú faktúru** sends [backend/fixtures/sample-invoice.pdf](backend/fixtures/sample-invoice.pdf). DIČ is missing on purpose, so that field stays empty until a person fills it.

The browser talks only to Next.js. [frontend/app/api/extract/route.ts](frontend/app/api/extract/route.ts) forwards `FormData` to FastAPI. Override the target with `API_URL` (see [frontend/.env.example](frontend/.env.example)).

Tests:

```powershell
cd backend
.\venv\Scripts\python.exe -m pytest
```

Scorecard:

```powershell
cd backend
.\venv\Scripts\python.exe -m scorecard.run
```

The scorecard reads every JSON file in [backend/scorecard/cases](backend/scorecard/cases) and compares the extractor's answer with the values a person read from the document. It prints how many values were filled correctly, how many were left for a person, and how many were wrong. A blank is a safe miss. A wrong value is the failure to drive to zero, and `--fail-on-wrong` exits with 1 when there is one.

To add a document, copy a case file and change it. `file` is a path inside `backend` (PDF, JPG, PNG or XLSX). `lines` can be used instead for plain text. `expected` maps each tag to its value in the form the API returns: dates as `DD.MM.YYYY`, amounts as `1234.56`. Write `null` for a value that is not printed on the document, so that an invented value is counted as wrong. `items` lists each row as `[text, amount]`.

Regenerate the sample invoice:

```powershell
cd backend
.\venv\Scripts\python.exe fixtures\build_sample.py
```

## Embed in eGrant

Host this Next.js app and point an iframe at `/embed`. A local stand-in is [http://localhost:3000/embed-host.html](http://localhost:3000/embed-host.html).

```html
<iframe src="https://extractor.example/embed" title="Overenie dokladu"></iframe>
<script>
  window.addEventListener("message", (event) => {
    if (event.data?.type === "egrant:fill") {
      // event.data.payload is egrant-fill.v1
    }
  });
</script>
```

Confirming in the iframe posts `{ type: "egrant:fill", payload }`. In production, eGrant would `POST` that payload to `/api/v1/applications/{id}/fill`. The same screen is a React component (`ExtractorApp`) if eGrant would rather mount it than use an iframe. Tag names are data in [backend/app/mapping/tags.json](backend/app/mapping/tags.json), so a real výzva dictionary can replace them without rewriting the pipeline.

## API

`GET /health` → `{ "status": "ok" }`

`POST /extract` with `multipart/form-data` field `file`. PDF, JPG, or PNG, up to 10 MB. The response is the tag tree, `document_kind`, `needs_review`, and `page_preview` (a PNG data URL of the first page, used by the review screen).
