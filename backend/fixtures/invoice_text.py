LINES = [
    "FAKTÚRA",
    "Číslo faktúry: 2026-0142",
    "Dodávateľ",
    "Ateliér Sever, s. r. o.",
    "IČO: 00151653",
    "Odberateľ",
    "Obec Revúca",
    "IČO: 00318574",
    "Dátum vystavenia: 12.03.2026",
    "Dátum splatnosti: 26.03.2026",
    "Položky",
    "Grafický návrh plagátu 800,00",
    "Tlač materiálov 434,56",
    "Základ dane: 1 234,56 EUR",
    "DPH 20 %: 246,91 EUR",
    "Spolu s DPH: 1 481,47 EUR",
]


def as_text() -> str:
    return "\n".join(LINES) + "\n"
