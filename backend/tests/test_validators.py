from decimal import Decimal

from app.gate import Candidate, enforce_vat
from app.validators import parse_date, parse_dic, parse_ico, parse_money


def test_ico_checksum_accepts_known_company():
    assert parse_ico("00151653") == "00151653"
    assert parse_ico("IČO: 00 151 653") == "00151653"


def test_ico_checksum_rejects_bad_digit():
    assert parse_ico("00151654") is None
    assert parse_ico("123") is None


def test_dic_accepts_slovak_and_other_vat_ids():
    assert parse_dic("sk 1020215534") == "SK1020215534"
    assert parse_dic("SK102021553") is None
    assert parse_dic("1020215534") is None
    assert parse_dic("GB123456789") == "GB123456789"


def test_slovak_dates():
    assert parse_date("12.03.2026") == "12.03.2026"
    assert parse_date("vystavená 2. 3. 2026") == "02.03.2026"
    assert parse_date("31.02.2026") is None


def test_english_dates():
    assert parse_date("12 March 2026") == "12.03.2026"
    assert parse_date("March 12, 2026") == "12.03.2026"
    assert parse_date("2026-03-12") == "12.03.2026"
    assert parse_date("04/13/2026") == "13.04.2026"


def test_slovak_money():
    assert parse_money("1 234,56 EUR") == "1234.56"
    assert parse_money("1.234,56") == "1234.56"
    assert Decimal(parse_money("800,00")) == Decimal("800.00")


def test_english_money():
    assert parse_money("1,234.56 USD") == "1234.56"
    assert parse_money("$800.00") == "800.00"


def test_gross_below_net_nulls_both_totals():
    net, gross = enforce_vat(Candidate("100.00", 0.95), Candidate("90.00", 0.95))
    assert net.value is None
    assert gross.value is None


def test_whole_amount_needs_its_currency():
    assert parse_money("350 €") == "350.00"
    assert parse_money("1 350,- EUR") == "1350.00"
    assert parse_money("350") is None
    assert parse_money("DPH 20 %") is None
