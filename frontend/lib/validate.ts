import { guideKind } from "@/lib/field-guide";

const ICO_WEIGHTS = [8, 7, 6, 5, 4, 3, 2];

const MONTHS: Record<string, number> = {
  january: 1,
  jan: 1,
  february: 2,
  feb: 2,
  march: 3,
  mar: 3,
  april: 4,
  apr: 4,
  may: 5,
  june: 6,
  jun: 6,
  july: 7,
  jul: 7,
  august: 8,
  aug: 8,
  september: 9,
  sep: 9,
  sept: 9,
  october: 10,
  oct: 10,
  november: 11,
  nov: 11,
  december: 12,
  dec: 12,
};

const REJECTED_NAMES = new Set([
  "dodavatel",
  "odberatel",
  "faktura",
  "ico",
  "dic",
  "polozky",
  "ic dph",
  "supplier",
  "vendor",
  "seller",
  "customer",
  "buyer",
  "invoice",
  "items",
  "line items",
  "subtotal",
  "total",
]);

export function invalidFormat(tag: string, value: string | null): boolean {
  const text = value?.trim() ?? "";
  if (!text) return false;
  const kind = guideKind(tag);
  if (kind === "ico") return parseIco(text) === null;
  // A person types the tax number as printed: ten digits, with or without "SK".
  // The server accepts both since the agent change; a document read still needs SK.
  if (kind === "dic") return parseDic(text) === null && !/^\d{10}$/.test(text.replace(/\s/g, ""));
  if (kind === "date") return parseDate(text) === null;
  if (kind === "amount") return parseMoney(text) === null;
  if (isNumberTag(tag)) return parseInvoiceNumber(text) === null;
  if (isNameTag(tag)) return parseName(text) === null;
  return false;
}

function isNumberTag(tag: string): boolean {
  const key = tag.toLowerCase();
  return key === "cislo" || key.endsWith(".cislo") || key.endsWith("_cislo") || key.includes("invoice_number") || key.includes("contract_number");
}

function isNameTag(tag: string): boolean {
  const key = tag.toLowerCase();
  return (
    key === "nazov" ||
    key.endsWith(".nazov") ||
    key.endsWith("_nazov") ||
    key === "predmet" ||
    key.endsWith(".predmet") ||
    key.includes("supplier_name") ||
    key.includes("protistrana") ||
    key.includes("counterparty") ||
    key === "table_item_string"
  );
}

function parseIco(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length !== 8) return null;
  const total = ICO_WEIGHTS.reduce((sum, weight, index) => sum + Number(digits[index]) * weight, 0);
  const remainder = total % 11;
  const check = remainder === 0 ? 1 : remainder === 1 ? 0 : 11 - remainder;
  return check === Number(digits[7]) ? digits : null;
}

const VAT_PREFIXES = new Set([
  "AT",
  "BE",
  "BG",
  "CY",
  "CZ",
  "DE",
  "DK",
  "EE",
  "EL",
  "ES",
  "FI",
  "FR",
  "GB",
  "GR",
  "HR",
  "HU",
  "IE",
  "IT",
  "LT",
  "LU",
  "LV",
  "MT",
  "NL",
  "PL",
  "PT",
  "RO",
  "SE",
  "SI",
  "SK",
  "XI",
]);

function parseDic(raw: string): string | null {
  const compact = raw.replace(/[\s.-]/g, "").toUpperCase();
  const prefix = compact.slice(0, 2);
  if (!VAT_PREFIXES.has(prefix) || !/\d/.test(compact)) return null;
  if (prefix === "SK") return /^SK\d{10}$/.test(compact) ? compact : null;
  return /^[A-Z]{2}[A-Z0-9]{8,12}$/.test(compact) ? compact : null;
}

function parseDate(raw: string): string | null {
  const dotted = raw.match(/(\d{1,2})\s*\.\s*(\d{1,2})\s*\.\s*(\d{4})/);
  if (dotted) return formatDate(Number(dotted[3]), Number(dotted[2]), Number(dotted[1]));
  const iso = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return formatDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  const dayMonth = raw.match(/(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\s+(\d{4})/);
  if (dayMonth && MONTHS[dayMonth[2].toLowerCase()]) {
    return formatDate(Number(dayMonth[3]), MONTHS[dayMonth[2].toLowerCase()], Number(dayMonth[1]));
  }
  const monthDay = raw.match(/([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/);
  if (monthDay && MONTHS[monthDay[1].toLowerCase()]) {
    return formatDate(Number(monthDay[3]), MONTHS[monthDay[1].toLowerCase()], Number(monthDay[2]));
  }
  const slash = raw.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slash) {
    const year = Number(slash[3]);
    return formatDate(year, Number(slash[2]), Number(slash[1])) ?? formatDate(year, Number(slash[1]), Number(slash[2]));
  }
  return null;
}

function formatDate(year: number, month: number, day: number): string | null {
  const value = new Date(Date.UTC(year, month - 1, day));
  if (value.getUTCFullYear() !== year || value.getUTCMonth() !== month - 1 || value.getUTCDate() !== day) return null;
  return `${String(day).padStart(2, "0")}.${String(month).padStart(2, "0")}.${String(year).padStart(4, "0")}`;
}

function parseMoney(raw: string): string | null {
  const spaced = raw.replace(/\u00a0/g, " ").replace(/\u202f/g, " ");
  const text = spaced.replace(/\b(?:eur|usd|gbp|czk)\b|[€$£]/gi, " ");
  const decimal = text.match(/(\d{1,3}(?:[ .]\d{3})+(?:[.,]\d{2})|\d{1,3}(?:,\d{3})+(?:\.\d{2})|\d+[.,]\d{2})/);
  const whole = spaced.match(/(?<![\d.,])(\d{1,3}(?: \d{3})+|\d+)(?:,-)?\s*(?:€|eur\b)/i);
  const match = decimal ?? whole;
  if (!match) return null;
  let token = match[1].replace(/ /g, "");
  if (token.includes(",") && token.includes(".")) {
    token = token.lastIndexOf(",") > token.lastIndexOf(".") ? token.replace(/\./g, "").replace(",", ".") : token.replace(/,/g, "");
  } else if (token.includes(",")) {
    token = /^\d{1,3}(?:,\d{3})+$/.test(token) ? token.replace(/,/g, "") : token.replace(",", ".");
  }
  const value = Number(token);
  if (!Number.isFinite(value) || value < 0 || value > 100_000_000) return null;
  return value.toFixed(2);
}

function parseInvoiceNumber(raw: string): string | null {
  const text = raw.replace(/\s+/g, "");
  if (!/^[A-Za-z0-9][A-Za-z0-9/-]{1,39}$/.test(text)) return null;
  if (!/\d/.test(text)) return null;
  if (parseDate(text)) return null;
  if (/^\d+,\d{2}$/.test(text) || /^\d+\.\d{2}$/.test(text)) return null;
  return text;
}

function parseName(raw: string): string | null {
  const text = raw.replace(/\s+/g, " ").replace(/^[\s:-]+|[\s:-]+$/g, "");
  if (text.length < 2 || text.length > 160) return null;
  if (!/[A-Za-zÀ-ž]/.test(text)) return null;
  if (REJECTED_NAMES.has(fold(text))) return null;
  if (parseIco(text)) return null;
  return text;
}

function fold(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}
