# Filling an eGrant form

This module reads one uploaded file and returns tag values. It does not write into eGrant.

1. The platform sends the file. It may also send a mapping from this module’s fields onto the tags of a form export (`type` / `children` / `tag`).
2. This module returns those tag values. A value that fails validation is `null`.
3. A person checks the values and confirms them.
4. Only the confirmed object is what eGrant would then write into the form, through `POST /api/v1/applications/{id}/fill`.

Without a mapping, the sample profiles in [backend/app/mapping/tags.json](../backend/app/mapping/tags.json) are used, so the demo still shows `dodavatel.ico` and the other sample tags. With a mapping, the confirmed JSON uses the manager’s tags, for example `ziadatel.ico`.

eGrant’s own OCR is an optional text source. The shared image is `trayvor/ocr-api-slk:v0.0.7`, published on this machine at `http://127.0.0.1:9010`. Set `EGRANT_OCR_URL` to `http://127.0.0.1:9010/ocr-upload`. This module posts the file as form field `file` and reads the JSON `text` string. It does not send `force_ocr`. That text is read with the same validators as a text layer. When the variable is unset, a digital PDF keeps its text layer and a photo keeps the local reader. An empty or wrong OCR response does not replace a value the text layer already accepted. This module still decides which values are valid.

## Confirmed object

```json
{
  "contract": "egrant-fill.v1",
  "document_id": "uuid",
  "confirmed_at": "2026-10-05T12:00:00.000Z",
  "integration": {
    "method": "POST",
    "path": "/api/v1/applications/{id}/fill"
  },
  "tree": {
    "roots": [
      {
        "id": "vyuctovanie",
        "sections": [
          {
            "id": "dodavatel",
            "items": [
              {
                "id": "dodavatel",
                "tags": [
                  { "tag": "dodavatel.ico", "value": "00151653" }
                ]
              }
            ]
          }
        ]
      }
    ]
  }
}
```

The sample invoice profile uses these tags:

| Key | Tag |
| --- | --- |
| supplier_name | `dodavatel.nazov` |
| ico | `dodavatel.ico` |
| dic | `dodavatel.dic` |
| invoice_number | `faktura.cislo` |
| issue_date | `faktura.datum_vystavenia` |
| due_date | `faktura.datum_splatnosti` |
| total_net | `faktura.suma_bez_dph` |
| total_gross | `faktura.suma_s_dph` |

Each line is an item under section `polozky` with `TABLE_ITEM_STRING` and `TABLE_ITEM_CURRENCY`.

`document_kind` is `invoice`, `receipt`, `contract`, `settlement`, or `statement`.

A receipt uses the same `faktura.*` tags. Due date, net total, and DIČ are not required.

A contract uses `zmluva.cislo`, `zmluva.datum_uzavretia`, `zmluva.datum_ucinnosti`, `zmluva.predmet`, and `zmluva.cena`.

A bank statement uses `vypis.datum` (booking date), `vypis.protistrana` (counterparty), and `vypis.suma` (amount). A missing label stays `null`.

A settlement spreadsheet keeps each row. The invoice column (`Faktúra` or `Fa`) is stored in full on `doklad.faktura`. An eGrant path `/file/2457463.pdf/...` also stores `2457463` on `doklad.subor_id`. A Dropbox link is stored as the link and does not invent that id. `Objednávka` is stored on `doklad.objednavka` and `Plnenie` on `doklad.plnenie`. An order link is not used as the invoice.

Amounts are decimal strings (`1234.56`). Dates are `DD.MM.YYYY`. IČO is 8 digits with a valid checksum. DIČ / IČ DPH is `SK` plus 10 digits. Anything that fails validation is `null`.

## Iframe message

The `/embed` route posts the confirmed object to the parent window:

```js
window.parent.postMessage({ type: "egrant:fill", payload }, "*");
```

The parent can listen for `egrant:fill` and forward `payload` after the person has confirmed it. The same review screen is the part an eGrant page would mount.
