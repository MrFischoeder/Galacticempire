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
| Mine | 25 metal ore, 20 titanium ore, 15 silicon | 3 min | 164 metal ore, 131 titanium ore, 98 silicon | 31 min | 671 metal ore, 537 titanium ore, 403 silicon | 3.1 h | 10 / 17 | 5 |
| Refinery | 35 metal ore, 20 titanium ore, 25 silicon | 6 min | 229 metal ore, 131 titanium ore, 164 silicon | 1.0 h | 940 metal ore, 537 titanium ore, 671 silicon | 6.1 h | 15 / 26 | 5 |
| Smelter | 35 metal ore, 30 titanium ore, 25 silicon | 6 min | 229 metal ore, 197 titanium ore, 164 silicon | 1.0 h | 940 metal ore, 805 titanium ore, 671 silicon | 6.1 h | 20 / 35 | 5 |
| Workshop | 35 metal ore, 25 titanium ore, 40 silicon | 8 min | 229 metal ore, 164 titanium ore, 262 silicon | 1.4 h | 940 metal ore, 671 titanium ore, 1074 silicon | 8.2 h | 20 / 35 | 5 |
| Farm | 25 metal ore, 10 titanium ore, 15 silicon | 3 min | 164 metal ore, 66 titanium ore, 98 silicon | 31 min | 671 metal ore, 268 titanium ore, 403 silicon | 3.1 h | 5 / 9 | 8 |
| Reactor | 100 metal ore, 80 titanium ore, 50 fissile material | 20 min | 655 metal ore, 524 titanium ore, 328 fissile material | 3.5 h | 2684 metal ore, 2147 titanium ore, 1342 fissile material | 20.4 h | — | 0 |
| Fusion reactor | 200 alloys, 40 components, 40 helium-3 | 1.0 h | 1311 alloys, 262 components, 262 helium-3 | 10.5 h | 5369 alloys, 1074 components, 1074 helium-3 | 2.6 d | — | 0 |
| Renewable power plant | 20 metal ore, 10 titanium ore, 25 silicon | 3 min | 131 metal ore, 66 titanium ore, 164 silicon | 31 min | 537 metal ore, 268 titanium ore, 671 silicon | 3.1 h | — | 8 |
| Housing | 25 metal ore, 25 titanium ore, 10 silicon | 4 min | 164 metal ore, 164 titanium ore, 66 silicon | 42 min | 671 metal ore, 671 titanium ore, 268 silicon | 4.1 h | — | 8 |
| Warehouse | 30 metal ore, 25 titanium ore, 5 silicon | 4 min | 197 metal ore, 164 titanium ore, 33 silicon | 42 min | 805 metal ore, 671 titanium ore, 134 silicon | 4.1 h | — | 8 |
| Accumulator | 15 metal ore, 15 titanium ore, 30 silicon | 4 min | 98 metal ore, 98 titanium ore, 197 silicon | 42 min | 403 metal ore, 403 titanium ore, 805 silicon | 4.1 h | — | 4 |
| Silo | 25 metal ore, 15 titanium ore, 20 silicon | 4 min | 164 metal ore, 98 titanium ore, 131 silicon | 42 min | 671 metal ore, 403 titanium ore, 537 silicon | 4.1 h | — | 8 |
| Bunker | 30 metal ore, 45 titanium ore, 5 silicon | 6 min | 197 metal ore, 295 titanium ore, 33 silicon | 1.0 h | 805 metal ore, 1208 titanium ore, 134 silicon | 6.1 h | — | 8 |
| Hangar | 45 metal ore, 40 titanium ore, 15 silicon | 8 min | 295 metal ore, 262 titanium ore, 98 silicon | 1.4 h | 1208 metal ore, 1074 titanium ore, 403 silicon | 8.2 h | — | 4 |
| Shipyard | 80 metal ore, 70 titanium ore, 50 silicon | 15 min | 524 metal ore, 459 titanium ore, 328 silicon | 2.6 h | 2147 metal ore, 1879 titanium ore, 1342 silicon | 15.3 h | 15 / 26 | 4 |
| Spaceport | 60 metal ore, 50 titanium ore, 40 silicon | 12 min | 393 metal ore, 328 titanium ore, 262 silicon | 2.1 h | 1611 metal ore, 1342 titanium ore, 1074 silicon | 12.2 h | 10 / 17 | 4 |
| Scanner | 40 metal ore, 30 titanium ore, 80 silicon | 12 min | 262 metal ore, 197 titanium ore, 524 silicon | 2.1 h | 1074 metal ore, 805 titanium ore, 2147 silicon | 12.2 h | 15 / 26 | 4 |
| Shield generator | 150 alloys, 30 components, 30 crystalite | 30 min | 983 alloys, 197 components, 197 crystalite | 5.2 h | 4027 alloys, 805 components, 805 crystalite | 30.6 h | 30 / 52 | 0 |
| Research laboratory | 60 alloys, 15 components, 60 silicon | 20 min | 393 alloys, 98 components, 393 silicon | 3.5 h | 1611 alloys, 403 components, 1611 silicon | 20.4 h | 20 / 35 | 4 |
| Trade exchange | 400 alloys, 100 components | 40 min | 2621 alloys, 655 components | 7.0 h | — | — | 15 / 26 | 5 |
| Administration center | 300 alloys, 80 components, 10 exotic matter | 2.0 h | — | — | — | — | 15 / 26 | 0 |
| Orbital station | 600 alloys, 120 components, 40 crystalite, 10 exotic matter | 3.0 h | — | — | — | — | 20 / 35 | 0 |
| Anti-aircraft gun | 240 alloys, 35 components | 1.7 h | 1573 alloys, 229 components | 17.5 h | 6442 alloys, 940 components | 4.3 d | 10 / 17 | 4 |
| Torpedo launcher | 350 alloys, 56 components, 30 fissile material | 2.6 h | 2294 alloys, 367 components, 197 fissile material | 27.1 h | 9395 alloys, 1503 components, 805 fissile material | 6.6 d | 15 / 26 | 0 |
| Defense cannon | 450 alloys, 65 components | 3.2 h | 2949 alloys, 426 components | 33.2 h | 12 080 alloys, 1745 components | 8.1 d | 20 / 35 | 4 |

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
| Stocznia | 36.0 h | 1–2 dni |
| Stać nas na pierwszy myśliwiec | 36.9 h | 1–2 dni |
| Wszystkie 16 pól zajęte | 37.8 h | 2–3 dni |
| Wszystko na maksimum bez surowców specjalnych | 9.0 d | ok. 1–2 tygodni (dalej tylko z surowcami specjalnymi, czyli ekspansja) |

Ograniczenia w czasie 21 dni: brak energii 0 min, brak rąk do pracy 9.7 h, czekanie na zasoby 6.3 d, jakiś minerał w pełnym magazynie 5.0 d.

| Dzień | Ludzie | Metal/h | Lód/h | Tytan/h | Krzem/h | Bilans energii/h | Bilans biomasy/h |
|---|---|---|---|---|---|---|---|
| 0.5 | 22 | 60 | 42 | 42 | 42 | 16 | 24 |
| 1 | 70 | 60 | 42 | 42 | 42 | -11 | 8 |
| 2 | 70 | 75 | 42 | 53 | 53 | 14 | 8 |
| 3 | 70 | 94 | 53 | 66 | 66 | -5 | 17 |
| 7 | 130 | 146 | 103 | 103 | 103 | 153 | 32 |
| 14 | 170 | 146 | 103 | 103 | 103 | 258 | 63 |
| 21 | 170 | 146 | 103 | 103 | 103 | 258 | 63 |

### Pierwsze godziny

- 1.3 h: Renewable power plant: poziom 1
- 2.3 h: Farm: poziom 1
- 3.6 h: Mine metalu: poziom 1
- 4.0 h: Housing: poziom 1
- 4.4 h: Mine krzemu: poziom 1
- 5.4 h: Mine tytanu: poziom 1
- 9.3 h: Renewable power plant: poziom 1
- 10.4 h: Warehouse: poziom 1
- 11.5 h: Housing: poziom 2
- 11.9 h: Mine lodu: poziom 1
- 12.3 h: Farm: poziom 2
- 13.0 h: Smelter: poziom 1
- 13.2 h: Renewable power plant: poziom 1
- 16.2 h: Housing: poziom 3
- 17.8 h: Refinery: poziom 1
- 22.0 h: Spaceport: poziom 1
- 26.3 h: Renewable power plant: poziom 2
- 33.1 h: Renewable power plant: poziom 2
- 33.7 h: Renewable power plant: poziom 2
- 34.6 h: Renewable power plant: poziom 3
- 36.0 h: Shipyard: poziom 1
- 36.5 h: Workshop: poziom 1

## Wiele planet: kolonie wspierane przez imperium

Im więcej planet, tym szybciej rozwija się każda następna, bo dojrzałe planety wysyłają jej surowce transportami. Model: nowa kolonia (rdzeń, 10 osób, mieszkanie poz. 1, te same złoża co planeta startowa) dostaje stały dowóz każdego z 4 minerałów. Przyjmuję, że jedna dojrzała planeta oddaje ok. 60/h każdego minerału (ok. połowę wydobycia na poziomie 5; reszta idzie na jej własną flotę i przetwórstwo).

| Planet wspierających | Dowóz każdego minerału | Stocznia gotowa | 16 pól zajętych | Maksimum bez specjalnych | Czekanie na zasoby |
|---|---|---|---|---|---|
| 0 | 0/h | 1.4 d | 1.6 d | 8.9 d | 6.2 d |
| 1 | 60/h | 0.3 d | 0.3 d | 5.4 d | 2.7 d |
| 2 | 120/h | 0.2 d | 0.2 d | 4.1 d | 1.4 d |
| 3 | 180/h | 0.1 d | 0.1 d | 3.3 d | 0.6 d |
| 4 | 240/h | 0.1 d | 0.1 d | 2.7 d | 0.0 d |
| 6 | 360/h | 0.1 d | 0.1 d | 2.7 d | 0.0 d |
| 10 | 600/h | 0.1 d | 0.1 d | 2.7 d | 0.0 d |

**Dolna granica:** nawet przy nieograniczonym dowozie planeta potrzebuje **2.7 d**, bo buduje jedną rzecz naraz (kolejka budowy) i musi wyhodować ludzi do pracy. To naturalny hamulec: zasoby przyspieszają rozwój kolonii z ok. 9 do ok. 3 dni, ale nie do zera.

### Ile kosztuje taki dowóz

Transportowiec wozi 500 jednostek. Lot w obie strony (spec 12.1.4): 10 LY = 14 paliwa (ok. 4% wartości ładunku), 30 LY = 34 (9%), 60 LY = 64 (17%), 100 LY = 104 (28%). Przy odległości ok. 30 LY jeden transportowiec robi kurs w ok. 1,7 h i przewozi ok. 300 jednostek/h, więc wsparcie 60/h każdego z 4 minerałów (240/h) to ok. 1 transportowiec na wspierającą planetę. Wspieranie kolonii w tym samym układzie (1–5 LY) jest prawie darmowe, z drugiego końca galaktyki traci się ćwierć ładunku.

### Wnioski

- **Tempo rośnie z liczbą planet**, tak jak chcesz: kolonia bez wsparcia potrzebuje 8.9 d do maksimum bez surowców specjalnych, wspierana przez 1 planetę 5.4 d, przez 2 4.1 d, przez 4 i więcej 2.7 d (dolna granica).
- **Hamulce przed kulą śnieżną** (już w specyfikacji): kolejka jednej budowy na planetę (dolna granica ok. 3 dni), koszt paliwa rosnący z odległością, koszt kolonizatora (300 stopów, 50 komponentów, 200 biomasy), utrzymanie floty w biomasie, surowce specjalne powyżej poziomu 4–5, zasięg administracji (−5% produkcji za każde 20 LY ponad 80 LY od stolicy, sekcja 14) i 70% zajętości mapy.
- **Propozycja do decyzji:** gdyby w testach z AI imperia rosły za szybko, najprostsze dodatkowe hamulce to (a) koszt kolonizatora rosnący z liczbą posiadanych planet (np. +15% za każdą) albo (b) dłuższy czas budowy na koloniach daleko od stolicy. Na razie niczego takiego nie dodaję.

