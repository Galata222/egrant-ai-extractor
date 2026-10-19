from app.ocr_extract import extract_fields

TABLE_INVOICE = [
    "Faktúra č. 20260087",
    "Dodávateľ:",
    "TLAČIAREŇ KUBÍK s.r.o.",
    "Hlavná 12, 040 01 Košice",
    "IČO: 36211222",
    "DIČ: 2020123456",
    "IČ DPH: SK2020123456",
    "Odberateľ:",
    "Občianske združenie Lúč",
    "IČO: 00151653",
    "Dátum vystavenia: 03.09.2026",
    "Dátum splatnosti: 17.09.2026",
    "Popis Množstvo MJ Cena za MJ DPH Spolu",
    "Tlač plagátov A2 200 ks 1,50 20 % 360,00",
    "Celkom k úhrade: 600,00 €",
]

SPLIT_LABELS = [
    "FAKTÚRA",
    "Číslo faktúry",
    "2026-0142",
    "Dodávateľ",
    "Ateliér Sever, s. r. o.",
    "IČO",
    "00151653",
    "Dátum vystavenia",
    "12.03.2026",
    "Dátum splatnosti",
    "26.03.2026",
    "Spolu s DPH",
    "1 481,47 EUR",
]

SIDE_BY_SIDE = [
    "FAKTÚRA",
    "Dodávateľ Odberateľ",
    "Ateliér Sever, s. r. o. Obec Revúca",
    "IČO: 00151653 IČO: 00318574",
    "Suma na úhradu 1 481,47 EUR",
]


def _values(lines: list[str]) -> dict[str, str | None]:
    return {key: candidate.value for key, candidate in extract_fields(lines).fields.items()}


def test_header_with_a_colon_still_gives_the_supplier_name():
    assert _values(TABLE_INVOICE)["supplier_name"] == "TLAČIAREŇ KUBÍK s.r.o."


def test_plain_dic_line_does_not_hide_the_vat_id_below_it():
    assert _values(TABLE_INVOICE)["dic"] == "SK2020123456"


def test_table_header_is_not_read_as_the_total():
    assert _values(TABLE_INVOICE)["total_gross"] == "600.00"


def test_value_on_the_line_below_its_label_is_read():
    values = _values(SPLIT_LABELS)
    assert values["invoice_number"] == "2026-0142"
    assert values["supplier_name"] == "Ateliér Sever, s. r. o."
    assert values["ico"] == "00151653"
    assert values["issue_date"] == "12.03.2026"
    assert values["due_date"] == "26.03.2026"
    assert values["total_gross"] == "1481.47"


def test_labelled_line_below_a_heading_is_not_joined_to_it():
    values = _values(["FAKTÚRA", "Dodávateľ", "IČO: 00151653", "Odberateľ", "IČO: 00318574"])
    assert values["ico"] == "00151653"
    assert values["supplier_name"] is None


def test_side_by_side_parties_leave_the_name_blank():
    values = _values(SIDE_BY_SIDE)
    assert values["supplier_name"] is None
    assert values["ico"] == "00151653"


def test_side_by_side_parties_follow_the_header_order():
    lines = ["FAKTÚRA", "Odberateľ Dodávateľ", "IČO: 00318574 IČO: 00151653"]
    assert _values(lines)["ico"] == "00151653"


def test_side_by_side_with_one_ico_is_not_guessed():
    lines = ["FAKTÚRA", "Dodávateľ Odberateľ", "Ateliér Sever Obec Revúca", "IČO: 00318574"]
    assert _values(lines)["ico"] is None


def test_net_that_does_not_add_up_with_the_vat_is_left_empty():
    values = _values(
        [
            "FAKTÚRA",
            "Základ dane: 234,56 EUR",
            "DPH 20 %: 246,91 EUR",
            "Spolu s DPH: 1 481,47 EUR",
        ]
    )
    assert values["total_net"] is None
    assert values["total_gross"] == "1481.47"


def test_net_that_matches_the_vat_and_the_gross_is_kept():
    values = _values(
        [
            "FAKTÚRA",
            "Základ dane: 1 234,56 EUR",
            "DPH 20 %: 246,91 EUR",
            "Spolu s DPH: 1 481,47 EUR",
        ]
    )
    assert values["total_net"] == "1234.56"
    assert values["total_gross"] == "1481.47"


def test_total_without_vat_is_not_taken_as_the_gross_total():
    values = _values(["FAKTÚRA", "Spolu bez DPH: 500,00 €", "Spolu s DPH: 600,00 €"])
    assert values["total_net"] == "500.00"
    assert values["total_gross"] == "600.00"


def test_settled_balance_of_zero_is_not_the_total():
    assert _values(["FAKTÚRA", "K úhrade: 0,00 €"])["total_gross"] is None


def test_other_wordings_of_number_and_due_date():
    values = _values(["Faktúra číslo: FV-2026-11", "Splatnosť: 19. 10. 2026"])
    assert values["invoice_number"] == "FV-2026-11"
    assert values["due_date"] == "19.10.2026"


def test_whole_euro_amounts_are_read_next_to_their_currency():
    values = _values(["Faktúra číslo: FV-2026-11", "Položky", "Oprava lavičiek 350 €", "Spolu: 1 350,- EUR"])
    assert values["total_gross"] == "1350.00"
    lines = extract_fields(["FAKTÚRA", "Položky", "Oprava lavičiek 350 €", "Spolu: 350 €"]).lines
    assert [(line.description.value, line.amount.value) for line in lines] == [("Oprava lavičiek", "350.00")]


def test_whole_number_without_a_currency_is_not_money():
    assert _values(["FAKTÚRA", "Spolu: 350"])["total_gross"] is None


def test_single_vat_base_is_the_net_total():
    values = _values(["FAKTÚRA", "Základ DPH 20 %: 500,00 €", "DPH 20 %: 100,00 €", "Celkom k úhrade: 600,00 €"])
    assert values["total_net"] == "500.00"
    assert values["total_gross"] == "600.00"


def test_bases_of_two_vat_rates_are_not_taken_as_the_net_total():
    lines = ["FAKTÚRA", "Základ DPH 20 %: 500,00 €", "Základ DPH 10 %: 200,00 €", "Spolu s DPH: 820,00 €"]
    assert _values(lines)["total_net"] is None


def test_printed_net_total_wins_over_the_bases_per_rate():
    lines = ["FAKTÚRA", "Základ DPH 20 %: 500,00 €", "Základ DPH 10 %: 200,00 €", "Spolu bez DPH: 700,00 €"]
    assert _values(lines)["total_net"] == "700.00"


def test_number_in_the_title_is_used_when_no_label_carries_it():
    assert _values(["FAKTÚRA 2026/015", "Dodávateľ"])["invoice_number"] == "2026/015"
    assert _values(["FAKTÚRA 2026", "Dodávateľ"])["invoice_number"] is None
    assert _values(["FAKTÚRA 2026/015", "Číslo faktúry: FV-7"])["invoice_number"] == "FV-7"


def test_short_date_labels_need_a_colon():
    values = _values(["FAKTÚRA", "Vystavená: 12.03.2026 Splatná: 26.03.2026"])
    assert values["issue_date"] == "12.03.2026"
    assert values["due_date"] == "26.03.2026"
    assert _values(["FAKTÚRA", "Faktúra je splatná do 26.03.2026"])["due_date"] is None
