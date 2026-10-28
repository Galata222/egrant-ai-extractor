# eGrant AI Data Extraction

Detachable module for the FUTURE MAKERS hackathon. A grant manager reviews one uploaded document and confirms the values before they can be written into an eGrant application. eGrant’s own backend is not modified.

The requirements live in [docs/SRS.md](docs/SRS.md). The JSON contract lives in [docs/egrant-fill.md](docs/egrant-fill.md).

## Problem and use case

Settlement of a grant means typing invoice, receipt, and contract details into a nested eGrant form. The person doing that work is a clerk, often reading Slovak documents, including a phone photo of a receipt. A wrong IČO, date, or amount can land in a legal settlement. An empty field that a person fills from the paper is a safe result. A guessed value is not.

The prototype covers that review:

1. Someone uploads a PDF, JPG, PNG, or XLSX, up to 10 MB. The screen shows the file and waits.
2. They press **Pokračovať**. The service reads the file and returns an eGrant tag tree.
3. A split screen shows the document beside the form. Empty and invalid fields are marked in amber, with a sentence that says what shape the value should have.
4. A review agent asks for the next empty required field. It does not type the value. The person does.
5. **Potvrdiť údaje** stays blocked until the required fields are present and well formed. Confirming builds `egrant-fill.v1`. In an iframe, that object is posted to the parent window. eGrant would then `POST` it to `/api/v1/applications/{id}/fill`.

## Solution

A field is returned only when a validator accepts it:

- IČO is 8 digits and passes the Slovak/Czech checksum. The supplier IČO is taken from the supplier block, not from the customer block.
- DIČ / IČ DPH is `SK` plus 10 digits, as printed on the document.
- Dates are real calendar dates.
- Amounts use Slovak money (`1 234,56`) and are stored as decimal strings.
- If the gross total is lower than the net total, both totals become `null`.

The confidence threshold defaults to `0.8` (`CONFIDENCE_THRESHOLD`). Below that, the value is `null`. The manager screen does not show scores.

What reads the file:

- A digital PDF uses its text layer. That read is exact and stays well under 15 seconds. Donut does not run, so a receipt model cannot replace a checked invoice value.
- A photo or scan has no text layer. EasyOCR (`sk` + `en`) reads it. When PyTorch and Transformers are installed, Donut (`naver-clova-ix/donut-base-finetuned-cord-v2`) may fill a field the OCR read left empty, after the same validators. If the two reads disagree, the field stays `null`. Set `ENABLE_DONUT=false` to skip it. The Donut budget is `DONUT_BUDGET_SECONDS` (default 8), and the page stops at 15 seconds.
- The organizer OCR image can fill a gap when `EGRANT_OCR_URL` is `http://127.0.0.1:9010/ocr-upload` (`trayvor/ocr-api-slk:v0.0.7`). This module does not send `force_ocr`. A value the text layer already accepted stays.
- An XLSX settlement is read as a table, not as a photo. Each row keeps its amount. The description joins the document number, issue date, supplier, and subject. A column named `Faktúra` or `Fa` is stored on `doklad.faktura`. `Objednávka` is stored on `doklad.objednavka` and is not used as the invoice. `Plnenie` is stored on `doklad.plnenie`, including several links in one cell. A path such as `/file/2457463` also stores the numeric id. A Dropbox link is stored as the link and does not invent that id.

The review agent is a fixed sequence when `AGENT_API_KEY` is empty: list the empty required fields, ask for the first one, then wait. A typed value goes through the same validators as an extracted one. The person still presses confirm.

Without a mapping, the tags come from [backend/app/mapping/tags.json](backend/app/mapping/tags.json). `POST /extract` accepts an optional `mapping` string when a real form export should replace those tags. The manager screen uses the built-in tags.

## How to run and test

From the repository root, in two terminals. These steps are for Windows.

Backend:

```powershell
cd backend
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

`pip install -r requirements.txt` includes PyTorch and EasyOCR. Those wheels are large. The sample PDF and the text-layer tests do not download model weights. The first photo downloads EasyOCR language data.

Optional Slovak OCR container, only when a photo should use the organizer image:

```powershell
docker run -d --name ocr-api -p 127.0.0.1:9010:8000 trayvor/ocr-api-slk:v0.0.7
```

Copy [backend/.env.example](backend/.env.example) to `backend/.env`. That file is gitignored. Leave `AGENT_API_KEY` empty to keep the agent on this machine. Set `EGRANT_OCR_URL=http://127.0.0.1:9010/ocr-upload` only when the container above is running. The API reads `.env` on startup and does not override variables already set in the process.

Frontend:

```powershell
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). In the header, **Ukážka** loads [backend/fixtures/sample-invoice.pdf](backend/fixtures/sample-invoice.pdf). **Pokračovať** starts the read. DIČ is missing on that invoice on purpose, so the VAT ID stays empty until a person fills it. A typed VAT ID must be `SK` plus 10 digits before **Potvrdiť údaje** is enabled. After confirm, the heading is **Údaje sú pripravené pre eGrant**. The JSON is behind **Zobraziť technický zápis**.

To test a settlement spreadsheet, upload an `.xlsx` whose columns include `Suma` and at least one of document number, supplier, or subject. Columns named `Fa`, `Objednávka`, and `Plnenie` appear as separate links on each row.

The browser talks only to Next.js. [frontend/app/api/extract/route.ts](frontend/app/api/extract/route.ts) forwards `FormData` to FastAPI. Override the target with `API_URL` (see [frontend/.env.example](frontend/.env.example)).

Automated tests:

```powershell
cd backend
.\venv\Scripts\python.exe -m pytest
```

Scorecard:

```powershell
cd backend
.\venv\Scripts\python.exe -m scorecard.run
```

The scorecard reads every JSON file in [backend/scorecard/cases](backend/scorecard/cases) and compares the extractor’s answer with the values a person read from the document. It prints how many values were filled correctly, how many were left for a person, and how many were wrong. A blank is a safe miss. A wrong value is the failure to drive to zero, and `--fail-on-wrong` exits with 1 when there is one.

`01-sample-invoice-pdf.json` scores the digital PDF. `06-sample-invoice-scan.json` scores the same invoice as [backend/fixtures/sample-invoice.png](backend/fixtures/sample-invoice.png), which has no text layer, so the photo reader runs. The expected values are what is printed, including `null` for the VAT ID that is not on the page. A net total that does not add up with the printed VAT and the gross total is left empty instead of shown. A line that has an amount but no reliable description is left for the person and is not counted as a wrong row.

To add a document, copy a case file and change it. `file` is a path inside `backend` (PDF, JPG, PNG or XLSX). `lines` can be used instead for plain text. `expected` maps each tag to its value in the form the API returns: dates as `DD.MM.YYYY`, amounts as `1234.56`. Write `null` for a value that is not printed on the document, so that an invented value is counted as wrong. `items` lists each row as `[text, amount]`.

Regenerate the sample invoice:

```powershell
cd backend
.\venv\Scripts\python.exe fixtures\build_sample.py
```

## Technologies

- Next.js 16, React 19, and Tailwind CSS 4 for the manager screen.
- FastAPI and Pydantic for `POST /extract`, `POST /agent/start`, and `POST /agent/answer`.
- PyMuPDF for the text layer and the first-page preview of a PDF.
- EasyOCR (`sk` + `en`) for a photo or scan.
- Optional Donut (`naver-clova-ix/donut-base-finetuned-cord-v2`) on pages that have no text layer.
- Optional organizer OCR container `trayvor/ocr-api-slk:v0.0.7`.
- openpyxl for an XLSX settlement.
- An in-process rules agent. An OpenAI-compatible chat endpoint is used only when `AGENT_API_KEY` is set.

## UX/UI

The screen is the design. There is no separate design file. It is Slovak first, with an English switch. The upload step shows the file and does not extract until **Pokračovať**. The review step is a document on one side and the form on the other. An empty required field names what is missing (for example an IČO of 8 digits, or a VAT ID of `SK` plus 10 digits). A value in the wrong shape is rejected as it is typed, and confirm names that field. Body text is at least 16px, and **A+** raises it. Light and dark themes are both available. After confirm, the clerk sees the values first. The JSON is behind a disclosure.

## Demo

Use this path for a 10-minute jury demo. Say this about the read: a digital PDF keeps its text layer, so the model is not asked to guess over text that is already exact.

1. Open [http://localhost:3000](http://localhost:3000). Press **Ukážka**, then **Pokračovať**.
2. Show the filled supplier, IČO `00151653`, invoice number, both dates, and both totals. Those values are printed on the invoice.
3. Show the empty VAT ID. The invoice does not print a DIČ, so the field stays empty and the agent asks for it. Confirm stays blocked.
4. Type a VAT ID that is not `SK` plus 10 digits and show the warning. Then type `SK1020215534`. That number is the reviewer’s entry for the rehearsal. It is not on the document, and the extractor did not produce it.
5. Press **Potvrdiť údaje**. The heading is **Údaje sú pripravené pre eGrant**. Open the technical disclosure only if someone asks for the JSON.

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

Confirming in the iframe posts `{ type: "egrant:fill", payload }`. In production, eGrant would `POST` that payload to `/api/v1/applications/{id}/fill`. The same screen is a React component (`ExtractorApp`) if eGrant would rather mount it than use an iframe.

## Known limitations

- Confirm builds JSON and, inside an iframe, posts it to the parent. This module does not call eGrant and does not write the application.
- Only the first page of a PDF is read.
- Donut is a receipt model, not a model trained on Slovak invoices. It does not run on a digital PDF. On a photo it may leave a field empty when it disagrees with OCR or when its confidence is below `0.8`.
- The organizer OCR container is a separate process. With `EGRANT_OCR_URL` unset, a photo uses EasyOCR and, when installed, Donut.
- The manager screen always uses the sample tags in `tags.json`. A real form export is accepted only as the optional `mapping` field on `POST /extract`.
- A settlement sheet’s other columns, such as `Účel`, `Prevodom`, `V hotovosti`, `Typ zdrojov`, and `Paid from account`, are not separate form fields. Document number, date, supplier, and subject are joined into the line description.
- Review agent sessions live in the memory of the API process. A restart ends them, and only the 100 most recent sessions are kept. The form on screen still holds the values. More than one API process would need a shared store.
- The first photo download of EasyOCR language data, and a first Donut run, are slower than the text layer. The text-layer budget remains 15 seconds.
- There is no login. The prototype is meant to run beside eGrant, not as a public service.

## API

`GET /health` → `{ "status": "ok" }`

`POST /extract` with `multipart/form-data` field `file`, and an optional `mapping` string. PDF, JPG, PNG, or XLSX, up to 10 MB. The response is the tag tree, `document_kind`, `needs_review`, and `page_preview` (a PNG data URL of the first page, used by the review screen).

`POST /agent/start` with JSON `{ "document_id", "tree" }`. The agent lists empty required fields and either asks for one of them or says the form is ready. It never writes a value.

`POST /agent/answer` with JSON `{ "session_id", "section_id", "item_id", "tag", "value" }`. `value` is what the person typed. The agent then chooses the next step.

The API reads `backend/.env` on startup. That file is gitignored. Copy `backend/.env.example` and set `AGENT_API_KEY` there; it is the only key the code reads. `AGENT_BASE_URL` defaults to `https://api.openai.com/v1` in the example, and `AGENT_MODEL` defaults to `gpt-4o-mini`. With no agent key, the same tools run in a fixed order: list the empty fields, ask for the first one, then wait. The person still presses confirm. The confirmed object is unchanged.
