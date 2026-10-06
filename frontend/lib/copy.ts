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
  navTagline: string;
  sampleShort: string;
  themeDark: string;
  themeLight: string;
  browse: string;
  readFirst: string;
  continueProcess: string;
  chooseAnother: string;
  noSheetPreview: string;
  orWord: string;
  encrypted: string;
  stepUpload: string;
  fileAccepted: string;
  actions: string;
  sampleFailed: string;
  sections: Record<string, string>;
  kinds: Record<string, string>;
  tags: Record<string, string>;
  errors: Record<string, string>;
  mappingTitle: string;
  mappingHint: string;
  mappingUpload: string;
  mappingExample: string;
  mappingClear: string;
  mappingInvalid: string;
  mappingLines: string;
  mappingNone: string;
  mappingReady: string;
  canonical: Record<string, string>;
  lineFields: Record<string, string>;
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
  "vyuctovanie.pocet": "Počet dokladov",
  "vyuctovanie.obdobie": "Obdobie",
  "vyuctovanie.suma": "Suma spolu",
  "doklad.faktura": "Faktúra",
  "doklad.subor_id": "ID súboru",
  "vypis.datum": "Dátum zaúčtovania",
  "vypis.protistrana": "Protistrana",
  "vypis.suma": "Suma",
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
  "vyuctovanie.pocet": "Number of documents",
  "vyuctovanie.obdobie": "Period",
  "vyuctovanie.suma": "Total amount",
  "doklad.faktura": "Invoice file",
  "doklad.subor_id": "File id",
  "vypis.datum": "Booking date",
  "vypis.protistrana": "Counterparty",
  "vypis.suma": "Amount",
};

const errorsSk: Record<string, string> = {
  unsupported_type: "Povolené formáty sú PDF, JPG, PNG a XLSX.",
  file_too_large: "Súbor je väčší ako 10 MB.",
  empty_file: "Súbor je prázdny.",
  unreadable_file: "Súbor sa nepodarilo prečítať.",
  empty_pdf: "PDF neobsahuje žiadnu stranu.",
  ocr_unavailable: "Čítanie fotografií nie je nainštalované. Nainštalujte requirements.txt.",
  extract_failed: "Extrakciu sa nepodarilo dokončiť.",
  sample_failed: "Ukážkovú faktúru sa nepodarilo načítať.",
  invalid_mapping: "Mapovanie formulára nie je platný JSON.",
};

const errorsEn: Record<string, string> = {
  unsupported_type: "Allowed formats are PDF, JPG, PNG, and XLSX.",
  file_too_large: "The file is larger than 10 MB.",
  empty_file: "The file is empty.",
  unreadable_file: "The file could not be read.",
  empty_pdf: "The PDF has no pages.",
  ocr_unavailable: "Photo reading is not installed. Install requirements.txt.",
  extract_failed: "Extraction could not be completed.",
  sample_failed: "The sample invoice could not be loaded.",
  invalid_mapping: "The form mapping is not valid JSON.",
};

const dictionaries: Record<Lang, Copy> = {
  sk: {
    brand: "eGrant",
    title: "eGrant extrakcia",
    embedTitle: "Overenie dokladu",
    subtitle: "Overenie údajov z dokladu pred uložením do žiadosti",
    uploadTitle: "Nahrať súbor",
    uploadHint: "Pretiahnite sem PDF, JPG, PNG alebo XLSX, alebo vyberte súbor.",
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
    navTagline: "Overenie údajov z dokladov",
    sampleShort: "Ukážka",
    themeDark: "Tmavý režim",
    themeLight: "Svetlý režim",
    browse: "Prehliadať",
    readFirst: "Prečítajte doklad. Spracovanie začne až po pokračovaní.",
    continueProcess: "Pokračovať",
    chooseAnother: "Vybrať iný súbor",
    noSheetPreview: "Tabuľku nie je možné zobraziť vopred. Pokračujte, ak má byť spracovaná.",
    orWord: "ALEBO",
    encrypted: "Šifrované od konca po koniec",
    stepUpload: "Krok 1 z 2",
    fileAccepted: "Súbor prijatý",
    actions: "Akcie",
    sampleFailed: errorsSk.sample_failed,
    sections: {
      dodavatel: "Dodávateľ",
      faktura: "Faktúra",
      doklad: "Bloček",
      zmluva: "Zmluva",
      polozky: "Položky dokladu",
      vyuctovanie: "Vyúčtovanie",
      vypis: "Výpis z účtu",
    },
    kinds: {
      invoice: "Faktúra",
      receipt: "Bloček",
      contract: "Zmluva",
      settlement: "Vyúčtovanie",
      statement: "Výpis z účtu",
    },
    tags: tagsSk,
    errors: errorsSk,
    mappingTitle: "Mapovanie na formulár",
    mappingHint: "Vložte JSON export formulára a priraďte polia dokladu k jeho tagom. Bez mapovania ostáva ukážkový formulár.",
    mappingUpload: "Nahrať JSON formulára",
    mappingExample: "Načítať ukážkový formulár",
    mappingClear: "Zrušiť mapovanie",
    mappingInvalid: "JSON formulára sa nepodarilo prečítať.",
    mappingLines: "Položky tabuľky",
    mappingNone: "Nepriradené",
    mappingReady: "Ďalšia extrakcia použije tieto tagy.",
    canonical: {
      supplier_name: "Názov dodávateľa",
      ico: "IČO",
      dic: "DIČ",
      invoice_number: "Číslo faktúry",
      issue_date: "Dátum vystavenia",
      due_date: "Dátum splatnosti",
      total_net: "Suma bez DPH",
      total_gross: "Suma s DPH",
      contract_number: "Číslo zmluvy",
      signed_date: "Dátum uzavretia",
      effective_date: "Dátum účinnosti",
      subject: "Predmet",
      contract_value: "Zmluvná cena",
      settlement_count: "Počet dokladov",
      settlement_period: "Obdobie",
      settlement_total: "Suma vyúčtovania",
      booking_date: "Dátum zaúčtovania",
      counterparty: "Protistrana",
      statement_amount: "Suma výpisu",
    },
    lineFields: {
      description: "Text položky",
      amount: "Suma položky",
      invoice_file: "Súbor faktúry",
      file_id: "ID súboru",
    },
  },
  en: {
    brand: "eGrant",
    title: "eGrant extraction",
    embedTitle: "Document review",
    subtitle: "Check the document data before it is saved to the application",
    uploadTitle: "Upload a file",
    uploadHint: "Drop a PDF, JPG, PNG, or XLSX here, or choose a file.",
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
    navTagline: "Document data for grant forms",
    sampleShort: "Sample",
    themeDark: "Dark mode",
    themeLight: "Light mode",
    browse: "Browse",
    readFirst: "Read the document. Processing starts only after you continue.",
    continueProcess: "Continue",
    chooseAnother: "Choose another file",
    noSheetPreview: "This spreadsheet cannot be shown in advance. Continue when it should be processed.",
    orWord: "OR",
    encrypted: "End-to-end encrypted",
    stepUpload: "Step 1 of 2",
    fileAccepted: "File accepted",
    actions: "Actions",
    sampleFailed: errorsEn.sample_failed,
    sections: {
      dodavatel: "Supplier",
      faktura: "Invoice",
      doklad: "Receipt",
      zmluva: "Contract",
      polozky: "Line items",
      vyuctovanie: "Settlement",
      vypis: "Bank statement",
    },
    kinds: {
      invoice: "Invoice",
      receipt: "Receipt",
      contract: "Contract",
      settlement: "Settlement",
      statement: "Bank statement",
    },
    tags: tagsEn,
    errors: errorsEn,
    mappingTitle: "Form mapping",
    mappingHint: "Paste a form JSON export and assign document fields to its tags. Without a mapping, the sample form stays in place.",
    mappingUpload: "Upload form JSON",
    mappingExample: "Load the example form",
    mappingClear: "Clear mapping",
    mappingInvalid: "The form JSON could not be read.",
    mappingLines: "Table columns",
    mappingNone: "Not assigned",
    mappingReady: "The next extract will use these tags.",
    canonical: {
      supplier_name: "Supplier name",
      ico: "Company ID",
      dic: "VAT ID",
      invoice_number: "Invoice number",
      issue_date: "Issue date",
      due_date: "Due date",
      total_net: "Amount excl. VAT",
      total_gross: "Amount incl. VAT",
      contract_number: "Contract number",
      signed_date: "Date of signature",
      effective_date: "Effective date",
      subject: "Subject",
      contract_value: "Contract price",
      settlement_count: "Number of documents",
      settlement_period: "Period",
      settlement_total: "Settlement total",
      booking_date: "Booking date",
      counterparty: "Counterparty",
      statement_amount: "Statement amount",
    },
    lineFields: {
      description: "Line text",
      amount: "Line amount",
      invoice_file: "Invoice file",
      file_id: "File id",
    },
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