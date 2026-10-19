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
  agentTitle: string;
  agentWorking: string;
  agentWorkingTitle: string;
  agentAsk: string;
  agentFromDocument: string;
  agentReady: string;
  agentReadyTitle: string;
  agentRules: string;
  agentSend: string;
  agentFailed: string;
  fieldGuide: Record<"ico" | "dic" | "date" | "amount" | "text", FieldGuide>;
  checkHighlighted: string;
  confirming: string;
  readyForEgrant: string;
  showTechnical: string;
  hideTechnical: string;
  revise: string;
  largerText: string;
  regularText: string;
  help: string;
  reading: string;
};

type FieldGuide = {
  shape: string;
  missing: string;
  invalid: string;
  help?: string;
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
  unreadable_file: "Súbor sa nepodarilo prečítať. Skúste iný PDF, JPG, PNG alebo XLSX.",
  empty_pdf: "PDF neobsahuje žiadnu stranu. Nahrajte doklad, ktorý má aspoň jednu stranu.",
  ocr_unavailable: "Fotku sa nepodarilo prečítať. Nahrajte PDF s textom alebo nainštalujte čítanie fotografií.",
  extract_failed: "Extrakciu sa nepodarilo dokončiť. Skúste súbor nahrať znova.",
  sample_failed: "Ukážkovú faktúru sa nepodarilo načítať. Skúste to ešte raz.",
  invalid_mapping: "Mapovanie formulára nie je platný JSON.",
  empty_value: "Najprv doplňte údaj, ktorý agent pýta.",
  invalid_value: "Údaj nemá správny tvar. Skontrolujte ho a skúste znova.",
  wrong_field: "Agent čaká na iný údaj.",
  agent_session: "Relácia agenta už nie je otvorená.",
};

const errorsEn: Record<string, string> = {
  unsupported_type: "Allowed formats are PDF, JPG, PNG, and XLSX.",
  file_too_large: "The file is larger than 10 MB.",
  empty_file: "The file is empty.",
  unreadable_file: "The file could not be read. Try another PDF, JPG, PNG, or XLSX.",
  empty_pdf: "The PDF has no pages. Upload a document that has at least one page.",
  ocr_unavailable: "The photo could not be read. Upload a PDF with text, or install photo reading.",
  extract_failed: "Extraction could not be completed. Upload the file again.",
  sample_failed: "The sample invoice could not be loaded. Try again.",
  invalid_mapping: "The form mapping is not valid JSON.",
  empty_value: "Fill in the field the agent asked for first.",
  invalid_value: "The value is not in the right format. Check it and try again.",
  wrong_field: "The agent is waiting for a different field.",
  agent_session: "The agent session is no longer open.",
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
    agentTitle: "Agent",
    agentWorking: "Agent vyberá ďalší krok.",
    agentWorkingTitle: "Vyberá ďalší krok",
    agentAsk: "Doplňte údaj „{label}“. Agent ho sám nenapíše.",
    agentFromDocument: "Agent tento údaj nenapíše. Odpíšte ho z dokladu.",
    agentReady: "Povinné údaje sú doplnené. Potvrďte, keď doklad sedí.",
    agentReadyTitle: "Môžete potvrdiť",
    agentRules: "Kľúč modelu nie je nastavený, preto agent ide v pevnom poradí.",
    agentSend: "Odoslať tento údaj",
    agentFailed: "Agent nevedel vybrať ďalší krok. Formulár môžete doplniť aj tak.",
    fieldGuide: {
      ico: {
        shape: "8 číslic, napríklad 00151653",
        missing: "IČO nie je na doklade. Doplňte 8 číslic.",
        invalid: "IČO má mať 8 číslic a platný kontrolný súčet, napríklad 00151653.",
      },
      dic: {
        shape: "SK a 10 číslic",
        missing: "DIČ nie je na doklade. Doplňte ho v tvare SK a 10 číslic.",
        invalid: "DIČ má byť v tvare SK a 10 číslic.",
        help: "DIČ je daňové identifikačné číslo. IČO je osemmiestne číslo organizácie. Na doklade nemusia byť obe.",
      },
      date: {
        shape: "DD.MM.RRRR",
        missing: "Dátum nie je na doklade. Zapíšte ho ako DD.MM.RRRR.",
        invalid: "Dátum zapíšte ako DD.MM.RRRR.",
      },
      amount: {
        shape: "Suma a mena, napríklad 1481.47 EUR",
        missing: "Suma nie je na doklade. Odpíšte ju aj s menou.",
        invalid: "Suma má obsahovať číslo a menu, napríklad 1481.47 EUR.",
      },
      text: {
        shape: "",
        missing: "Toto pole je prázdne. Odpíšte ho z dokladu.",
        invalid: "Skontrolujte tento údaj podľa dokladu.",
      },
    },
    checkHighlighted: "Skontrolujte zvýraznené polia.",
    confirming: "Ukladám…",
    readyForEgrant: "Údaje sú pripravené pre eGrant",
    showTechnical: "Zobraziť technický zápis",
    hideTechnical: "Skryť technický zápis",
    revise: "Vrátiť sa k úprave",
    largerText: "Väčší text",
    regularText: "Bežný text",
    help: "Pomoc",
    reading: "Čítame doklad…",
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
    agentTitle: "Agent",
    agentWorking: "The agent is choosing the next step.",
    agentWorkingTitle: "Choosing the next step",
    agentAsk: "Fill in “{label}”. The agent will not type it.",
    agentFromDocument: "The agent will not type this. Copy it from the document.",
    agentReady: "The required fields are filled. Confirm when the document looks right.",
    agentReadyTitle: "Ready to confirm",
    agentRules: "No model key is set, so the agent follows a fixed order.",
    agentSend: "Send this value",
    agentFailed: "The agent could not choose a next step. You can still complete the form.",
    fieldGuide: {
      ico: {
        shape: "8 digits, for example 00151653",
        missing: "The company ID is not on the document. Enter 8 digits.",
        invalid: "The company ID needs 8 digits and a valid check digit, for example 00151653.",
      },
      dic: {
        shape: "SK plus 10 digits",
        missing: "The VAT ID is not on the document. Enter SK plus 10 digits.",
        invalid: "The VAT ID needs to be SK plus 10 digits.",
        help: "The VAT ID is the tax number. The company ID is the 8-digit organisation number. A document does not have to print both.",
      },
      date: {
        shape: "DD.MM.YYYY",
        missing: "The date is not on the document. Enter it as DD.MM.YYYY.",
        invalid: "Enter the date as DD.MM.YYYY.",
      },
      amount: {
        shape: "Amount and currency, for example 1481.47 EUR",
        missing: "The amount is not on the document. Copy it with the currency.",
        invalid: "The amount needs a number and a currency, for example 1481.47 EUR.",
      },
      text: {
        shape: "",
        missing: "This field is empty. Copy it from the document.",
        invalid: "Check this value against the document.",
      },
    },
    checkHighlighted: "Check the highlighted fields.",
    confirming: "Saving…",
    readyForEgrant: "The data is ready for eGrant",
    showTechnical: "Show the technical record",
    hideTechnical: "Hide the technical record",
    revise: "Return to editing",
    largerText: "Larger text",
    regularText: "Regular text",
    help: "Help",
    reading: "Reading the document…",
  },
};

export function copyFor(lang: Lang): Copy {
  return dictionaries[lang];
}

export function readingFileLabel(name: string, lang: Lang): string {
  return lang === "en" ? `Reading “${name}”…` : `Čítame doklad „${name}“…`;
}

export function missingFieldLabel(label: string, lang: Lang): string {
  return lang === "en" ? `Fill in “${label}” first.` : `Najprv doplňte „${label}“.`;
}

export function invalidFieldLabel(label: string, lang: Lang): string {
  return lang === "en" ? `Correct “${label}”.` : `Opravte „${label}“.`;
}

export function missingCountLabel(count: number, lang: Lang): string {
  if (lang === "en") {
    return count === 1 ? "Fill in 1 field" : `Fill in ${count} fields`;
  }
  if (count === 1) return "Doplňte 1 údaj";
  if (count >= 2 && count <= 4) return `Doplňte ${count} údaje`;
  return `Doplňte ${count} údajov`;
}