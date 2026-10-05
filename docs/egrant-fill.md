# egrant-fill.v1

eGrant assigns form tags per výzva. Published system codes (`cin`, `tin`, `vatin`, `{granted_sum}`) are not a fixed invoice tree. This prototype therefore owns a versioned fill contract that follows the SRS shape **Roots → Sections → Items → Tags**.

Replace [backend/app/mapping/tags.json](../backend/app/mapping/tags.json) to point the same extractor at another dictionary. The pipeline keys (`supplier_name`, `ico`, `invoice_number`, …) stay stable.

## Tree

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

Header tags:

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

Each receipt row is an item under section `polozky` with `TABLE_ITEM_STRING` and `TABLE_ITEM_CURRENCY`.

The response field `document_kind` is `invoice`, `receipt`, or `contract`.

A receipt uses the same `faktura.*` tags. Due date, net total, and DIČ are not required.

A contract uses:

| Key | Tag |
| --- | --- |
| contract_number | `zmluva.cislo` |
| signed_date | `zmluva.datum_uzavretia` |
| effective_date | `zmluva.datum_ucinnosti` |
| subject | `zmluva.predmet` |
| contract_value | `zmluva.cena` |

Amounts are decimal strings (`1234.56`). Dates are `DD.MM.YYYY`. IČO is 8 digits with a valid checksum. DIČ / IČ DPH is `SK` plus 10 digits. Anything that fails validation is `null`.

## Iframe message

The `/embed` route posts the confirmed object to the parent window:

```js
window.parent.postMessage({ type: "egrant:fill", payload }, "*");
```

eGrant can listen for `egrant:fill` and forward `payload` to `POST /api/v1/applications/{id}/fill`. The same React desk is the component an eGrant page would mount.
