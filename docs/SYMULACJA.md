# Symulacja bez grafiki

Wygenerowane przez `pnpm sim --days 14 --players 6 --seed 1` (krok 1.13). Boty grają tylko przez widok gracza i komendy; tura co 30 min gry.

Czas wykonania: **5.5 s**. Komendy: 827, odrzucone: 0. Błędy stanu (NaN, wartości ujemne): brak. Skrót stanu: `fb69a6e7`.

## Gracze

Wydobyto = jednostki wykopane ze złóż planet bota w całej grze (średnio na godzinę w nawiasie); produkcja teraz = minerały na godzinę na końcu (spada, gdy magazyn pełny); magazyn = średnie zapełnienie.

| Bot | Planety | Ludność | Suma poziomów | Wydobyto | Produkcja teraz | Magazyn | Pierwsza kolonia |
|---|---|---|---|---|---|---|---|
| p1 | 5 | 174 | 115 | 78,022 (232/h) | 0/h | 30% | 79.5 h |
| p2 | 4 | 133 | 89 | 46,059 (137/h) | 0/h | 41% | 79.5 h |
| p3 | 2 | 151 | 92 | 53,616 (160/h) | 0/h | 45% | 79.5 h |
| p4 | 4 | 173 | 102 | 75,980 (226/h) | 0/h | 41% | 79.5 h |
| p5 | 5 | 421 | 247 | 141,392 (421/h) | 403/h | 42% | 79.5 h |
| p6 | 3 | 305 | 154 | 91,630 (273/h) | 0/h | 43% | 79.5 h |

## Wąskie gardła (godziny planet)

Ile godzin (zsumowanych po planetach) bot czekał z powodu: brak energii, brak żywności, brak rąk do pracy, brak zasobów na następną budowę, magazyn za mały. „Bez przeszkód” = budowa szła albo nic nie blokowało.

| Bot | Energia | Żywność | Ręce do pracy | Zasoby | Magazyn | Bez przeszkód |
|---|---|---|---|---|---|---|
| p1 | 577 | 0 | 1 | 585.5 | 0 | 169.5 |
| p2 | 821.5 | 0 | 1 | 217 | 0 | 55 |
| p3 | 309.5 | 0 | 1 | 218 | 0 | 65 |
| p4 | 821.5 | 0 | 1 | 100.5 | 0 | 171.5 |
| p5 | 418 | 4.5 | 3 | 750 | 0 | 157.5 |
| p6 | 318 | 14 | 1 | 248 | 0 | 266 |

## Poziomy budynków na planecie startowej

| Bot | Renewable power plant | Farm | Mine | Housing | Warehouse | Smelter | Refinery | Workshop | Shipyard | Silo | Accumulator |
|---|---|---|---|---|---|---|---|---|---|---|---|
| p1 | 8 | 8 | 5 | 8 | 8 | 5 | 5 | 5 | 4 | 8 | 4 |
| p2 | 7 | 6 | 5 | 6 | 6 | 5 | 5 | 5 | 4 | 6 | 4 |
| p3 | 7 | 7 | 5 | 7 | 7 | 5 | 5 | 5 | 4 | 6 | 4 |
| p4 | 8 | 8 | 5 | 8 | 8 | 5 | 5 | 5 | 4 | 8 | 4 |
| p5 | 7 | 7 | 5 | 7 | 7 | 5 | 5 | 5 | 4 | 7 | 4 |
| p6 | 8 | 7 | 5 | 7 | 7 | 5 | 5 | 5 | 4 | 7 | 4 |

## Złoża planety startowej (ile zostało)

| Bot | Ruda metalu | Lód deuterowy | Ruda tytanu | Krzem |
|---|---|---|---|---|
| p1 | 87% | 47% | 19% | 0% |
| p2 | 91% | 80% | 0% | 22% |
| p3 | 78% | 74% | 0% | 27% |
| p4 | 89% | 64% | 18% | 0% |
| p5 | 87% | 66% | 0% | 17% |
| p6 | 91% | 71% | 27% | 0% |
