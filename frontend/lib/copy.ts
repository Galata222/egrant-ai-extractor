export type Lang = "sk" | "en";

type Copy = {
  brand: string;
  title: string;
  embedTitle: string;
  subtitle: string;
  uploadTitle: string;
  uploadHint: string;
  sample: string;
  loading: string;
  unknown: string;
  confirm: string;
  reset: string;
  document: string;
  form: string;
  reviewNote: string;
  addItem: string;
  removeItem: string;
  emptyItems: string;
  copyJson: string;
  copied: string;
  download: string;
  integration: string;
  posted: string;
  confirmedTitle: string;
  confirmedValues: string;
  preview: string;
  language: string;
  actions: string;
  sampleFailed: string;
  sections: Record<string, string>;
  kinds: Record<string, string>;
  tags: Record<string, string>;
  errors: Record<string, string>;
};

const tagsSk: Record<string, string> = {
  "dodavatel.nazov": "Názov dodávateľa",
  "dodavatel.ico": "IČO dodávateľa",
  "dodavatel.dic": "DIČ dodávateľa",
  "faktura.cislo": "Číslo faktúry",
  "faktura.datum_vystavenia": "Dátum vystavenia",
  "faktura.datum_splatnosti": "Dátum splatnosti",
  "faktura.suma_bez_dph": "Suma bez DPH",
  "faktura.suma_s_dph": "Suma s DPH",
  TABLE_ITEM_STRING: "Názov položky",
  TABLE_ITEM_CURRENCY: "Suma položky",
  "zmluva.cislo": "Číslo zmluvy",
  "zmluva.datum_uzavretia": "Dátum uzavretia",
  "zmluva.datum_ucinnosti": "Dátum účinnosti",
  "zmluva.predmet": "Predmet zmluvy",
  "zmluva.cena": "Zmluvná cena",
};

const tagsEn: Record<string, string> = {
  "dodavatel.nazov": "Supplier name",
  "dodavatel.ico": "Supplier company ID",
  "dodavatel.dic": "VAT ID",
  "faktura.cislo": "Invoice number",
  "faktura.datum_vystavenia": "Issue date",
  "faktura.datum_splatnosti": "Due date",
  "faktura.suma_bez_dph": "Amount excl. VAT",
  "faktura.suma_s_dph": "Amount incl. VAT",
  TABLE_ITEM_STRING: "Item name",
  TABLE_ITEM_CURRENCY: "Item amount",
  "zmluva.cislo": "Contract number",
  "zmluva.datum_uzavretia": "Date of signature",
  "zmluva.datum_ucinnosti": "Effective date",
  "zmluva.predmet": "Subject of the contract",
  "zmluva.cena": "Contract price",
};

const errorsSk: Record<string, string> = {
  unsupported_type: "Povolené formáty sú PDF, JPG a PNG.",
  file_too_large: "Súbor je väčší ako 10 MB.",
  empty_file: "Súbor je prázdny.",
  unreadable_file: "Súbor sa nepodarilo prečítať.",
  empty_pdf: "PDF neobsahuje žiadnu stranu.",
  ocr_unavailable: "Čítanie fotografií nie je nainštalované. Nainštalujte requirements.txt.",
  extract_failed: "Extrakciu sa nepodarilo dokončiť.",
  sample_failed: "Ukážkovú faktúru sa nepodarilo načítať.",
};

const errorsEn: Record<string, string> = {
  unsupported_type: "Allowed formats are PDF, JPG, and PNG.",
  file_too_large: "The file is larger than 10 MB.",
  empty_file: "The file is empty.",
  unreadable_file: "The file could not be read.",
  empty_pdf: "The PDF has no pages.",
  ocr_unavailable: "Photo reading is not installed. Install requirements.txt.",
  extract_failed: "Extraction could not be completed.",
  sample_failed: "The sample invoice could not be loaded.",
};

const dictionaries: Record<Lang, Copy> = {
  sk: {
    brand: "eGrant",
    title: "eGrant extrakcia",
    embedTitle: "Overenie dokladu",
    subtitle: "Overenie údajov z dokladu pred uložením do žiadosti",
    uploadTitle: "Nahrať súbor",
    uploadHint: "Pretiahnite sem PDF, JPG alebo PNG, alebo vyberte súbor.",
    sample: "Načítať ukážkovú faktúru",
    loading: "Extrahujem údaje zo súboru...",
    unknown: "Neznámy údaj - doplňte ručne",
    confirm: "Potvrdiť údaje",
    reset: "Nahrať iný súbor",
    document: "Doklad",
    form: "Údaje pre eGrant",
    reviewNote: "Údaje sa neuložia, kým ich nepotvrdíte.",
    addItem: "Pridať položku",
    removeItem: "Odstrániť položku",
    emptyItems: "Doklad neobsahuje položky.",
    copyJson: "Kopírovať JSON",
    copied: "Skopírované",
    download: "Stiahnuť JSON",
    integration: "V produkcii by sa tento objekt odoslal na POST /api/v1/applications/{id}/fill.",
    posted: "Údaje boli odoslané nadradenému oknu.",
    confirmedTitle: "Potvrdený objekt egrant-fill.v1",
    confirmedValues: "Potvrdené údaje",
    preview: "Náhľad dokladu",
    language: "Jazyk",
    actions: "Akcie",
    sampleFailed: errorsSk.sample_failed,
    sections: {
      dodavatel: "Dodávateľ",
      faktura: "Faktúra",
      doklad: "Bloček",
      zmluva: "Zmluva",
      polozky: "Položky dokladu",
    },
    kinds: {
      invoice: "Faktúra",
      receipt: "Bloček",
      contract: "Zmluva",
    },
    tags: tagsSk,
    errors: errorsSk,
  },
  en: {
    brand: "eGrant",
    title: "eGrant extraction",
    embedTitle: "Document review",
    subtitle: "Check the document data before it is saved to the application",
    uploadTitle: "Upload a file",
    uploadHint: "Drop a PDF, JPG, or PNG here, or choose a file.",
    sample: "Load the sample invoice",
    loading: "Extracting data from the file...",
    unknown: "Unknown value - fill it in manually",
    confirm: "Confirm data",
    reset: "Upload another file",
    document: "Document",
    form: "Data for eGrant",
    reviewNote: "Nothing is saved until you confirm.",
    addItem: "Add item",
    removeItem: "Remove item",
    emptyItems: "The document has no line items.",
    copyJson: "Copy JSON",
    copied: "Copied",
    download: "Download JSON",
    integration: "In production this object would be sent to POST /api/v1/applications/{id}/fill.",
    posted: "The data was sent to the parent window.",
    confirmedTitle: "Confirmed egrant-fill.v1 object",
    confirmedValues: "Confirmed values",
    preview: "Document preview",
    language: "Language",
    actions: "Actions",
    sampleFailed: errorsEn.sample_failed,
    sections: {
      dodavatel: "Supplier",
      faktura: "Invoice",
      doklad: "Receipt",
      zmluva: "Contract",
      polozky: "Line items",
    },
    kinds: {
      invoice: "Invoice",
      receipt: "Receipt",
      contract: "Contract",
    },
    tags: tagsEn,
    errors: errorsEn,
  },
};

export function copyFor(lang: Lang): Copy {
  return dictionaries[lang];
}

export function missingCountLabel(count: number, lang: Lang): string {
  if (lang === "en") {
    return count === 1 ? "Fill in 1 field" : `Fill in ${count} fields`;
  }
  if (count === 1) return "Doplňte 1 údaj";
  if (count >= 2 && count <= 4) return `Doplňte ${count} údaje`;
  return `Doplňte ${count} údajov`;
}
