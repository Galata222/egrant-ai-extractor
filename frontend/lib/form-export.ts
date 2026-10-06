export type FormField = {
  tag: string;
  name: string;
  type: string;
  sectionTag: string;
  sectionName: string;
  tableTag: string | null;
  tableName: string | null;
  mandatory: boolean;
};

export type StoredMapping = {
  formText: string;
  fields: Record<string, string>;
  lines: Record<string, string>;
};

export const EMPTY_MAPPING: StoredMapping = { formText: "", fields: {}, lines: {} };

export const CANONICAL_FIELDS = [
  "supplier_name",
  "ico",
  "dic",
  "invoice_number",
  "issue_date",
  "due_date",
  "total_net",
  "total_gross",
  "contract_number",
  "signed_date",
  "effective_date",
  "subject",
  "contract_value",
  "settlement_count",
  "settlement_period",
  "settlement_total",
  "booking_date",
  "counterparty",
  "statement_amount",
] as const;

export const LINE_FIELDS = ["description", "amount", "invoice_file", "file_id"] as const;

const STORAGE_KEY = "egrant-form-mapping";

const CONTAINERS = new Set([
  "SECTION",
  "SUBSECTION",
  "REPEATABLE_SUBSECTION",
  "POPUP_SECTION",
  "WIZARD",
  "WIZARD_STEP",
]);

export const EXAMPLE_FORM = `{
  "type": "root",
  "children": [
    {
      "type": "SECTION",
      "name": "Žiadateľ",
      "tag": "ziadatel_sekcia",
      "children": [
        { "type": "SIMPLE_STRING", "name": "Názov", "tag": "ziadatel.nazov" },
        { "type": "SIMPLE_STRING", "name": "IČO", "tag": "ziadatel.ico", "mandatory": true }
      ]
    },
    {
      "type": "SECTION",
      "name": "Faktúra",
      "tag": "faktura_sekcia",
      "children": [
        { "type": "SIMPLE_STRING", "name": "Číslo faktúry", "tag": "faktura.cislo" },
        {
          "type": "TABLE_LIST",
          "name": "Položky",
          "tag": "polozky",
          "children": [
            { "type": "TABLE_ITEM_STRING", "name": "Položka", "tag": "polozka" },
            { "type": "TABLE_ITEM_CURRENCY", "name": "Suma", "tag": "suma" }
          ]
        }
      ]
    }
  ]
}`;

export const EXAMPLE_MAPPING: StoredMapping = {
  formText: EXAMPLE_FORM,
  fields: {
    supplier_name: "ziadatel.nazov",
    ico: "ziadatel.ico",
    invoice_number: "faktura.cislo",
  },
  lines: {
    description: "polozka",
    amount: "suma",
  },
};

export function loadMapping(): StoredMapping {
  if (typeof window === "undefined") return EMPTY_MAPPING;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_MAPPING;
    const parsed = JSON.parse(raw) as Partial<StoredMapping>;
    return {
      formText: typeof parsed.formText === "string" ? parsed.formText : "",
      fields: recordOf(parsed.fields),
      lines: recordOf(parsed.lines),
    };
  } catch {
    return EMPTY_MAPPING;
  }
}

export function saveMapping(value: StoredMapping) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

export function readFormExport(
  text: string,
): { ok: true; form: unknown; fields: FormField[] } | { ok: false } {
  const trimmed = text.trim();
  if (!trimmed) return { ok: false };
  try {
    const form = JSON.parse(trimmed) as unknown;
    return { ok: true, form, fields: walk(form, null, null) };
  } catch {
    return { ok: false };
  }
}

export function mappingPayload(stored: StoredMapping): string | null {
  const parsed = readFormExport(stored.formText);
  if (!parsed.ok) return null;
  const fields = compact(stored.fields);
  const lines = compact(stored.lines);
  if (Object.keys(fields).length === 0 && Object.keys(lines).length === 0) return null;
  return JSON.stringify({ form: parsed.form, fields, lines });
}

function recordOf(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );
}

function compact(value: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(value).filter(([, tag]) => tag));
}

function walk(
  node: unknown,
  section: { tag: string; name: string } | null,
  table: { tag: string; name: string } | null,
): FormField[] {
  if (Array.isArray(node)) return node.flatMap((child) => walk(child, section, table));
  if (!node || typeof node !== "object") return [];
  const record = node as Record<string, unknown>;
  const kind = String(record.type || "ROOT").trim().toUpperCase();
  const tag = typeof record.tag === "string" ? record.tag.trim() : "";
  const name = typeof record.name === "string" && record.name.trim() ? record.name.trim() : tag;
  const children = Array.isArray(record.children) ? record.children : [];
  if (kind === "ROOT") return children.flatMap((child) => walk(child, section, table));
  if (CONTAINERS.has(kind)) {
    const next = { tag: tag || section?.tag || "formular", name: name || section?.name || "Formulár" };
    return children.flatMap((child) => walk(child, next, table));
  }
  if (kind === "TABLE_LIST") {
    const nextTable = { tag: tag || "tabulka", name: name || tag || "Tabuľka" };
    const parent = section ?? { tag: "formular", name: "Formulár" };
    return children.flatMap((child) => walk(child, parent, nextTable));
  }
  if (!tag) return children.flatMap((child) => walk(child, section, table));
  return [
    {
      tag,
      name: name || tag,
      type: kind,
      sectionTag: section?.tag ?? "formular",
      sectionName: section?.name ?? "Formulár",
      tableTag: table?.tag ?? null,
      tableName: table?.name ?? null,
      mandatory: Boolean(record.mandatory || record.required),
    },
  ];
}
