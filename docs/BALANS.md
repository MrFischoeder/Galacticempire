# Balans ekonomii (krok 1.2b)

Plik generowany przez `pnpm balance` (`tools/balance/`). Liczby pochodzą z `packages/shared/src/config/`; zmiana liczby = zmiana konfiguracji i ponowne uruchomienie. **Zaakceptowane przez właściciela 3.11.2026.**

## Zasady

- **Koszt poziomu L** = koszt poziomu 1 × 1.6^(L−1). **Czas** = czas poziomu 1 × 1.8^(L−1). **Energia** = zużycie poziomu 1 × 1.15^(L−1).
- Poziom 1 kosztuje ok. 60 jednostek wartości (ważne budynki więcej), dzięki czemu ulepszenie 1→2 kopalni kosztuje ok. 100 i zwraca się w ok. 6–7 h, jak w specyfikacji (sekcja 9).
- **Pusty start:** 16 pustych pól, pusty magazyn. Rdzeń mieści po 150 każdego zasobu, 100 energii i 100 biomasy, **dodaje się do magazynów, silosów i akumulatorów** (decyzja właściciela) i daje schronienie 10 osobom.
- **Zbiór awaryjny rdzenia:** 20/h każdego minerału podstawowego, ale tylko dopóki na planecie nie działa kopalnia tego minerału; do tego 5 biomasy/h (żyzna planeta) i 5 energii/h (energia odnawialna). 10 osób zjada dokładnie 5 biomasy/h, więc wzrost populacji wymaga farmy.
- **Planeta startowa:** zielona, żyzność 1, wiatr, złoże metalu średnie (×1), pozostałe ubogie (×0.7).
- **Elektrownia odnawialna:** 25 energii/h na poziomie 1, ×1,3 za poziom (było 15 bez wzrostu: przy pustym starcie bez reaktora planeta nie miała z czego żyć). Maks. 3 na planecie. Reaktor (materiał rozpadowy) i reaktor fuzyjny (hel-3) to droga do większej mocy.
- **Przetwórstwo i farma** rosną ×1,25 za poziom, tak jak kopalnia (zasada „jedna kopalnia = jeden zakład”).

## Budynki: koszt, czas, energia

Koszt i czas na poziomie 1, 5 i 8 (budynki cywilne i magazynowe dochodzą do 8 bez surowców specjalnych, produkcyjne do 5, wojskowe i techniczne do 4; od 9 egzotyczna materia). „Maks. bez specjalnych” = najwyższy poziom osiągalny z surowców podstawowych.

| Budynek | Poziom 1 | Czas 1 | Poziom 5 | Czas 5 | Poziom 8 | Czas 8 | Energia 1 / 5 | Maks. bez specjalnych |
|---|---|---|---|---|---|---|---|---|
| Kopalnia | 25 ruda metalu, 20 ruda tytanu, 15 krzem | 3 min | 164 ruda metalu, 131 ruda tytanu, 98 krzem | 31 min | 671 ruda metalu, 537 ruda tytanu, 403 krzem | 3.1 h | 10 / 17 | 5 |
| Rafineria | 35 ruda metalu, 20 ruda tytanu, 25 krzem | 6 min | 229 ruda metalu, 131 ruda tytanu, 164 krzem | 1.0 h | 940 ruda metalu, 537 ruda tytanu, 671 krzem | 6.1 h | 15 / 26 | 5 |
| Huta | 35 ruda metalu, 30 ruda tytanu, 25 krzem | 6 min | 229 ruda metalu, 197 ruda tytanu, 164 krzem | 1.0 h | 940 ruda metalu, 805 ruda tytanu, 671 krzem | 6.1 h | 20 / 35 | 5 |
| Warsztat | 35 ruda metalu, 25 ruda tytanu, 40 krzem | 8 min | 229 ruda metalu, 164 ruda tytanu, 262 krzem | 1.4 h | 940 ruda metalu, 671 ruda tytanu, 1074 krzem | 8.2 h | 20 / 35 | 5 |
| Farma | 25 ruda metalu, 10 ruda tytanu, 15 krzem | 3 min | 164 ruda metalu, 66 ruda tytanu, 98 krzem | 31 min | 671 ruda metalu, 268 ruda tytanu, 403 krzem | 3.1 h | 5 / 9 | 8 |
| Reaktor | 100 ruda metalu, 80 ruda tytanu, 50 materiał rozpadowy | 20 min | 655 ruda metalu, 524 ruda tytanu, 328 materiał rozpadowy | 3.5 h | 2684 ruda metalu, 2147 ruda tytanu, 1342 materiał rozpadowy | 20.4 h | — | 0 |
| Reaktor fuzyjny | 200 stopy, 40 komponenty, 40 hel-3 | 1.0 h | 1311 stopy, 262 komponenty, 262 hel-3 | 10.5 h | 5369 stopy, 1074 komponenty, 1074 hel-3 | 2.6 d | — | 0 |
| Elektrownia odnawialna | 20 ruda metalu, 10 ruda tytanu, 25 krzem | 3 min | 131 ruda metalu, 66 ruda tytanu, 164 krzem | 31 min | 537 ruda metalu, 268 ruda tytanu, 671 krzem | 3.1 h | — | 8 |
| Mieszkanie | 25 ruda metalu, 25 ruda tytanu, 10 krzem | 4 min | 164 ruda metalu, 164 ruda tytanu, 66 krzem | 42 min | 671 ruda metalu, 671 ruda tytanu, 268 krzem | 4.1 h | 2 / 3 | 8 |
| Magazyn | 30 ruda metalu, 25 ruda tytanu, 5 krzem | 4 min | 197 ruda metalu, 164 ruda tytanu, 33 krzem | 42 min | 805 ruda metalu, 671 ruda tytanu, 134 krzem | 4.1 h | 2 / 3 | 8 |
| Akumulator | 15 ruda metalu, 15 ruda tytanu, 30 krzem | 4 min | 98 ruda metalu, 98 ruda tytanu, 197 krzem | 42 min | 403 ruda metalu, 403 ruda tytanu, 805 krzem | 4.1 h | 1 / 2 | 4 |
| Silos | 25 ruda metalu, 15 ruda tytanu, 20 krzem | 4 min | 164 ruda metalu, 98 ruda tytanu, 131 krzem | 42 min | 671 ruda metalu, 403 ruda tytanu, 537 krzem | 4.1 h | 1 / 2 | 8 |
| Schron | 30 ruda metalu, 45 ruda tytanu, 5 krzem | 6 min | 197 ruda metalu, 295 ruda tytanu, 33 krzem | 1.0 h | 805 ruda metalu, 1208 ruda tytanu, 134 krzem | 6.1 h | 2 / 3 | 8 |
| Hangar | 45 ruda metalu, 40 ruda tytanu, 15 krzem | 8 min | 295 ruda metalu, 262 ruda tytanu, 98 krzem | 1.4 h | 1208 ruda metalu, 1074 ruda tytanu, 403 krzem | 8.2 h | 5 / 9 | 4 |
| Stocznia | 80 ruda metalu, 70 ruda tytanu, 50 krzem | 15 min | 524 ruda metalu, 459 ruda tytanu, 328 krzem | 2.6 h | 2147 ruda metalu, 1879 ruda tytanu, 1342 krzem | 15.3 h | 15 / 26 | 4 |
| Kosmoport | 60 ruda metalu, 50 ruda tytanu, 40 krzem | 12 min | 393 ruda metalu, 328 ruda tytanu, 262 krzem | 2.1 h | 1611 ruda metalu, 1342 ruda tytanu, 1074 krzem | 12.2 h | 10 / 17 | 4 |
| Skaner | 40 ruda metalu, 30 ruda tytanu, 80 krzem | 12 min | 262 ruda metalu, 197 ruda tytanu, 524 krzem | 2.1 h | 1074 ruda metalu, 805 ruda tytanu, 2147 krzem | 12.2 h | 15 / 26 | 4 |
| Generator tarczy | 150 stopy, 30 komponenty, 30 krystalit | 30 min | 983 stopy, 197 komponenty, 197 krystalit | 5.2 h | 4027 stopy, 805 komponenty, 805 krystalit | 30.6 h | 30 / 52 | 0 |
| Laboratorium badawcze | 60 stopy, 15 komponenty, 60 krzem | 20 min | 393 stopy, 98 komponenty, 393 krzem | 3.5 h | 1611 stopy, 403 komponenty, 1611 krzem | 20.4 h | 20 / 35 | 4 |
| Giełda handlowa | 400 stopy, 100 komponenty | 40 min | 2621 stopy, 655 komponenty | 7.0 h | — | — | 15 / 26 | 5 |
| Centrum administracyjne | 300 stopy, 80 komponenty, 10 egzotyczna materia | 2.0 h | — | — | — | — | 15 / 26 | 0 |
| Stacja orbitalna | 600 stopy, 120 komponenty, 40 krystalit, 10 egzotyczna materia | 3.0 h | — | — | — | — | 20 / 35 | 0 |
| Działko przeciwlotnicze | 240 stopy, 35 komponenty | 1.7 h | 1573 stopy, 229 komponenty | 17.5 h | 6442 stopy, 940 komponenty | 4.3 d | 10 / 17 | 4 |
| Wyrzutnia torped | 350 stopy, 56 komponenty, 30 materiał rozpadowy | 2.6 h | 2294 stopy, 367 komponenty, 197 materiał rozpadowy | 27.1 h | 9395 stopy, 1503 komponenty, 805 materiał rozpadowy | 6.6 d | 15 / 26 | 0 |
| Działo obronne | 450 stopy, 65 komponenty | 3.2 h | 2949 stopy, 426 komponenty | 33.2 h | 12 080 stopy, 1745 komponenty | 8.1 d | 20 / 35 | 4 |

## Kopalnia: wydobycie i zwrot ulepszenia

| Poziom | Wydobycie/h (złoże średnie) | Koszt poziomu (wartość) | Czas | Zwrot ulepszenia |
|---|---|---|---|---|
| 1 | 60 | 60 | 3 min | 1.0 h |
| 2 | 75 | 96 | 5 min | 6.4 h |
| 3 | 94 | 153 | 10 min | 8.2 h |
| 4 | 117 | 245 | 17 min | 10.5 h |
| 5 | 146 | 393 | 31 min | 13.4 h |
| 6 | 183 | 629 | 57 min | 17.2 h |
| 7 | 229 | 1007 | 1.7 h | 22.0 h |
| 8 | 286 | 1611 | 3.1 h | 28.2 h |
| 9 | 358 | 2577 | 5.5 h | 36.0 h |
| 10 | 447 | 4123 | 9.9 h | 46.1 h |

## Symulacja startu

Bot „rozsądny gracz”: najpierw elektrownia, farma, kopalnia metalu, mieszkanie, kolejne kopalnie, magazyn, huta, rafineria, kosmoport, stocznia, warsztat, hangar (16 pól), potem równe ulepszenia. Pilnuje energii (dobudowuje i ulepsza elektrownie), rąk do pracy (mieszkania) i żywności (farma). Nie buduje statków. Okres: 21 dni gry.

| Moment | Czas gry | Cel |
|---|---|---|
| Pierwsza budowa rusza | 1.3 h | kilkadziesiąt minut – 1,5 h |
| Pierwszy budynek gotowy | 1.3 h |  |
| 5 budynków | 4.4 h | ok. 6 h |
| 10 budynków | 13.0 h |  |
| Stocznia | 36.3 h | 1–2 dni |
| Stać nas na pierwszy myśliwiec | 38.8 h | 1–2 dni |
| Wszystkie 16 pól zajęte | 39.8 h | 2–3 dni |
| Wszystko na maksimum bez surowców specjalnych | 9.0 d | ok. 1–2 tygodni (dalej tylko z surowcami specjalnymi, czyli ekspansja) |

Ograniczenia w czasie 21 dni: brak energii 4.0 h, brak rąk do pracy 9.7 h, czekanie na zasoby 6.3 d, jakiś minerał w pełnym magazynie 5.0 d.

| Dzień | Ludzie | Metal/h | Lód/h | Tytan/h | Krzem/h | Bilans energii/h | Bilans biomasy/h |
|---|---|---|---|---|---|---|---|
| 0.5 | 22 | 60 | 42 | 42 | 42 | 11 | 24 |
| 1 | 70 | 60 | 42 | 42 | 42 | -8 | 8 |
| 2 | 70 | 75 | 42 | 53 | 53 | 4 | 8 |
| 3 | 70 | 94 | 53 | 66 | 66 | -3 | 17 |
| 7 | 130 | 146 | 103 | 103 | 103 | 137 | 32 |
| 14 | 170 | 146 | 103 | 103 | 103 | 240 | 63 |
| 21 | 170 | 146 | 103 | 103 | 103 | 240 | 63 |

### Pierwsze godziny

- 1.3 h: Elektrownia odnawialna: poziom 1
- 2.3 h: Farma: poziom 1
- 3.6 h: Kopalnia metalu: poziom 1
- 4.0 h: Mieszkanie: poziom 1
- 4.4 h: Kopalnia krzemu: poziom 1
- 5.4 h: Kopalnia tytanu: poziom 1
- 9.3 h: Elektrownia odnawialna: poziom 1
- 10.4 h: Magazyn: poziom 1
- 11.5 h: Mieszkanie: poziom 2
- 11.9 h: Kopalnia lodu: poziom 1
- 12.3 h: Farma: poziom 2
- 13.0 h: Huta: poziom 1
- 13.2 h: Elektrownia odnawialna: poziom 1
- 16.2 h: Mieszkanie: poziom 3
- 17.8 h: Rafineria: poziom 1
- 22.0 h: Kosmoport: poziom 1
- 23.9 h: Elektrownia odnawialna: poziom 2
- 33.4 h: Elektrownia odnawialna: poziom 2
- 34.0 h: Elektrownia odnawialna: poziom 2
- 34.9 h: Elektrownia odnawialna: poziom 3
- 36.3 h: Stocznia: poziom 1
- 37.0 h: Elektrownia odnawialna: poziom 3

## Wiele planet: kolonie wspierane przez imperium

Im więcej planet, tym szybciej rozwija się każda następna, bo dojrzałe planety wysyłają jej surowce transportami. Model: nowa kolonia (rdzeń, 10 osób, mieszkanie poz. 1, te same złoża co planeta startowa) dostaje stały dowóz każdego z 4 minerałów. Przyjmuję, że jedna dojrzała planeta oddaje ok. 60/h każdego minerału (ok. połowę wydobycia na poziomie 5; reszta idzie na jej własną flotę i przetwórstwo).

| Planet wspierających | Dowóz każdego minerału | Stocznia gotowa | 16 pól zajętych | Maksimum bez specjalnych | Czekanie na zasoby |
|---|---|---|---|---|---|
| 0 | 0/h | 1.4 d | 1.6 d | 8.9 d | 6.2 d |
| 1 | 60/h | 0.3 d | 0.3 d | 5.5 d | 2.8 d |
| 2 | 120/h | 0.2 d | 0.2 d | 4.1 d | 1.4 d |
| 3 | 180/h | 0.1 d | 0.1 d | 3.3 d | 0.6 d |
| 4 | 240/h | 0.1 d | 0.1 d | 2.7 d | 0.0 d |
| 6 | 360/h | 0.1 d | 0.1 d | 2.7 d | 0.0 d |
| 10 | 600/h | 0.1 d | 0.1 d | 2.7 d | 0.0 d |

**Dolna granica:** nawet przy nieograniczonym dowozie planeta potrzebuje **2.7 d**, bo buduje jedną rzecz naraz (kolejka budowy) i musi wyhodować ludzi do pracy. To naturalny hamulec: zasoby przyspieszają rozwój kolonii z ok. 9 do ok. 3 dni, ale nie do zera.

### Ile kosztuje taki dowóz

Transportowiec wozi 500 jednostek. Lot w obie strony (spec 12.1.4): 10 LY = 14 paliwa (ok. 4% wartości ładunku), 30 LY = 34 (9%), 60 LY = 64 (17%), 100 LY = 104 (28%). Przy odległości ok. 30 LY jeden transportowiec robi kurs w ok. 1,7 h i przewozi ok. 300 jednostek/h, więc wsparcie 60/h każdego z 4 minerałów (240/h) to ok. 1 transportowiec na wspierającą planetę. Wspieranie kolonii w tym samym układzie (1–5 LY) jest prawie darmowe, z drugiego końca galaktyki traci się ćwierć ładunku.

### Wnioski

- **Tempo rośnie z liczbą planet**, tak jak chcesz: kolonia bez wsparcia potrzebuje 8.9 d do maksimum bez surowców specjalnych, wspierana przez 1 planetę 5.5 d, przez 2 4.1 d, przez 4 i więcej 2.7 d (dolna granica).
- **Hamulce przed kulą śnieżną** (już w specyfikacji): kolejka jednej budowy na planetę (dolna granica ok. 3 dni), koszt paliwa rosnący z odległością, koszt kolonizatora (300 stopów, 50 komponentów, 200 biomasy), utrzymanie floty w biomasie, surowce specjalne powyżej poziomu 4–5, zasięg administracji (−5% produkcji za każde 20 LY ponad 80 LY od stolicy, sekcja 14) i 70% zajętości mapy.
- **Propozycja do decyzji:** gdyby w testach z AI imperia rosły za szybko, najprostsze dodatkowe hamulce to (a) koszt kolonizatora rosnący z liczbą posiadanych planet (np. +15% za każdą) albo (b) dłuższy czas budowy na koloniach daleko od stolicy. Na razie niczego takiego nie dodaję.

