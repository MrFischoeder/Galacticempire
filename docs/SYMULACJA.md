# Symulacja bez grafiki

Wygenerowane przez `pnpm sim --days 14 --players 6 --seed 1` (krok 1.13). Boty grają tylko przez widok gracza i komendy; tura co 30 min gry.

Czas wykonania: **6.9 s**. Komendy: 901, odrzucone: 0. Błędy stanu (NaN, wartości ujemne): brak. Skrót stanu: `8a576468`.

## Gracze

Wydobyto = jednostki wykopane ze złóż planet bota w całej grze (średnio na godzinę w nawiasie); produkcja teraz = minerały na godzinę na końcu (spada, gdy magazyn pełny); magazyn = średnie zapełnienie.

| Bot | Planety | Ludność | Suma poziomów | Wydobyto | Produkcja teraz | Magazyn | Pierwsza kolonia |
|---|---|---|---|---|---|---|---|
| p1 | 5 | 174 | 124 | 78,279 (233/h) | 20/h | 22% | 79.5 h |
| p2 | 4 | 153 | 110 | 57,291 (171/h) | 186/h | 24% | 79.5 h |
| p3 | 2 | 171 | 103 | 65,533 (195/h) | 265/h | 34% | 79.5 h |
| p4 | 4 | 173 | 116 | 76,343 (227/h) | 20/h | 25% | 79.5 h |
| p5 | 5 | 459 | 266 | 153,603 (457/h) | 593/h | 39% | 79.5 h |
| p6 | 3 | 325 | 164 | 102,979 (306/h) | 50/h | 33% | 79.5 h |

## Wąskie gardła (godziny planet)

Ile godzin (zsumowanych po planetach) bot czekał z powodu: brak energii, brak żywności, brak rąk do pracy, brak zasobów na następną budowę, magazyn za mały. „Bez przeszkód” = budowa szła albo nic nie blokowało.

| Bot | Energia | Żywność | Ręce do pracy | Zasoby | Magazyn | Bez przeszkód |
|---|---|---|---|---|---|---|
| p1 | 75.5 | 0 | 1 | 1,083.5 | 0 | 173 |
| p2 | 68 | 0 | 1 | 941.5 | 0 | 84 |
| p3 | 54 | 0 | 1 | 446.5 | 0 | 92 |
| p4 | 68 | 0 | 1 | 848.5 | 0 | 177 |
| p5 | 179 | 106 | 26.5 | 837 | 0 | 184.5 |
| p6 | 62.5 | 14 | 1 | 482 | 0 | 287.5 |

## Poziomy budynków na planecie startowej

| Bot | Renewable power plant | Farm | Mine | Housing | Warehouse | Smelter | Refinery | Workshop | Shipyard | Silo | Accumulator |
|---|---|---|---|---|---|---|---|---|---|---|---|
| p1 | 8 | 8 | 5 | 8 | 8 | 5 | 5 | 5 | 4 | 8 | 4 |
| p2 | 8 | 7 | 5 | 7 | 7 | 5 | 5 | 5 | 4 | 7 | 4 |
| p3 | 8 | 8 | 5 | 8 | 8 | 5 | 5 | 5 | 4 | 7 | 4 |
| p4 | 8 | 8 | 5 | 8 | 8 | 5 | 5 | 5 | 4 | 8 | 4 |
| p5 | 8 | 8 | 5 | 8 | 8 | 5 | 5 | 5 | 4 | 7 | 4 |
| p6 | 8 | 8 | 5 | 8 | 8 | 5 | 5 | 5 | 4 | 7 | 4 |

## Złoża planety startowej (ile zostało)

| Bot | Ruda metalu | Lód deuterowy | Ruda tytanu | Krzem |
|---|---|---|---|---|
| p1 | 87% | 47% | 19% | 0% |
| p2 | 88% | 74% | 0% | 0% |
| p3 | 71% | 68% | 0% | 4% |
| p4 | 89% | 64% | 18% | 0% |
| p5 | 85% | 59% | 0% | 0% |
| p6 | 89% | 63% | 9% | 0% |
