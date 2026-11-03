# Dziennik postępów

Każdy krok z `docs/plan-budowy.md` to osobna wersja na osobnej gałęzi (zasady w `CLAUDE.md`).

## Mapa wersji

| Krok | Wersja | Gałąź | Zakres | Status |
|---|---|---|---|---|
| 0 | 0.0.0 | `v0.0.0-przygotowanie` | CLAUDE.md, dokumenty, pytania do specyfikacji | ✅ |
| 0 | 0.0.1 | `v0.0.1-odpowiedzi` | odpowiedzi właściciela, pytania uzupełniające | ✅ |
| 0 | 0.0.2 | `v0.0.2-decyzje` | decyzje o złożach, biomasie i starcie; specyfikacja 2.8 (zapowiedź) | ✅ |
| 0 | 0.0.3 | `v0.0.3-surowce-specjalne` | propozycja surowców specjalnych (`docs/SUROWCE.md`) | ✅ |
| 0 | 0.0.4 | `v0.0.4-surowce-4` | 4 surowce specjalne zamiast 6 | ✅ zaakceptowane |
| 1.0 | 0.1.0 | `v0.1.0-szkielet` | monorepo, narzędzia, pusta scena 3D | ✅ |
| 1.0 | 0.1.0a | `v0.1.0a-start-bat` | `start-gry.bat`: uruchamianie jednym kliknięciem | ✅ |
| 1.1 | 0.1.1 | `v0.1.1-rdzen-symulacji` | zegar gry, RNG, kolejka zdarzeń, komendy | ✅ |
| 1.2a | 0.1.2 | `v0.1.2-konfiguracja` | wszystkie liczby jako dane, modyfikatory | ✅ |
| 1.2b | 0.1.3 | `v0.1.3-balans-ekonomii` | narzędzie liczące + tabela kosztów, czasów i wydajności budynków do akceptacji | ✅ |
| 1.2b | 0.1.3a | `v0.1.3a-balans-imperium` | analiza wielu planet: kolonie wspierane dowozem | ✅ zaakceptowane |
| 1.3 | 0.1.4 | `v0.1.4-galaktyka` | generator galaktyki i tras | ✅ |
| 1.4a | 0.1.5 | `v0.1.5-produkcja` | wydobycie, przetwórstwo, magazyn, rdzeń, energia | ⬜ |
| 1.4b | 0.1.6 | `v0.1.6-populacja` | populacja, robotnicy, żywność, silos, głód | ⬜ |
| 1.5 | 0.1.7 | `v0.1.7-budowa` | budowa i ulepszenia budynków | ⬜ |
| 1.6 | 0.1.8 | `v0.1.8-badania` | laboratorium i 13 technologii | ⬜ |
| 1.7 | 0.1.9 | `v0.1.9-mapa-galaktyki` | Web Worker, mapa 3D | ⬜ |
| 1.8 | 0.1.10 | `v0.1.10-widok-planety` | widok układu, panele, pasek czasu | ⬜ |
| 1.9 | 0.1.11 | `v0.1.11-ruch-flot` | ruch flot, paliwo, kosmoport, hangary | ⬜ |
| 1.10a | 0.1.12 | `v0.1.12-stocznia` | stocznia, utrzymanie | ⬜ |
| 1.10b | 0.1.13 | `v0.1.13-transporty` | transporty, trasy cykliczne, kolonizacja | ⬜ |
| 1.11 | 0.1.14 | `v0.1.14-mgla-wojny` | `getPlayerView`, sondy, skanery | ⬜ |
| 1.12 | 0.1.15 | `v0.1.15-sojusze` | sojusze | ⬜ |
| 1.13 | 0.1.16 | `v0.1.16-bot-symulacja` | bot ekonomiczny, `pnpm sim` | ⬜ |
| 2.1–2.4 | 0.2.x | `v0.2.x-...` | walka | ⬜ |
| 3.1–3.5 | 0.3.x → 1.0.0 | `v0.3.x-...`, `v1.0.0-gra-jednoosobowa` | AI i pierwsza grywalna wersja | ⬜ |
| 4.x–6.x | 1.x | | serwer, mechaniki zaawansowane, balans | ⬜ |

Kroki 1.4 i 1.10 są w planie dość duże, dlatego od razu proponuję podział na a/b (numer wersji rośnie o jeden na każdą część). Pozostałe zostają jak w planie; jeśli któryś okaże się za duży, dzielimy go w trakcie.

## Wpisy

### 0.1.4: generator galaktyki (krok 1.3, 3.11.2026)
- `packages/shared/src/galaxy/`: `types.ts` (Galaxy, StarSystem, Planet, Deposit, Route), `graph.ts` (sąsiedztwo, Dijkstra po LY, liczba skoków, `shortestPath`, spójność), `names.ts` (nazwy gwiazd z sylab, planety z cyframi rzymskimi), `generate.ts` (`generateGalaxy(seed, {systems, radius, startSlots})`, `systemsFor(gracze)`, `radiusFor(układy)`); `config/galaxy.ts` (`GALAXY`). Stan gry (`World.galaxy`, wersja stanu 2) dostaje galaktykę przy `createGameState`.
- Kroki generatora (strumień losowy `galaxy`): układy w dysku (min. 8 LY odstępu), trasy z grafu Gabriela obcięte do 5 połączeń (bez rozspójnienia) i uzupełnione do 2; pozycje startowe = największy zbiór układów oddalonych o ≥ 60 LY po trasach (heurystyka „najmniej konfliktów najpierw”, 40 prób z ziarnem); układy bogate (15%) i anomalie (3–6) najdalej od startów; w układzie startowym planeta startowa (`STARTER_PLANET`, 16 pól) i planeta lodowa/gazowy gigant; w promieniu 3 skoków od każdego startu planeta radioaktywna i krystaliczna albo gazowy gigant z helem-3; każdy układ ma ≥ 3 różne specjalizacje, bogaty układ rzadką planetę.
- Planety: typ, orbita 1–5 LY, 8–14 pól, żyzność, energia odnawialna, specjalność (bogate złoże podstawowe, złoże specjalne albo biomasa), 4 złoża podstawowe (ubogie, pula 10–40 tys.), złoże specjalne (pula 15–80 tys.).
- Wyniki na 50 ziarnach: połączenia 2–5, trasy 8–74 LY (średnio 22,4; spec: 8–ok. 60, średnio 22), średnia odległość po trasach 104 LY (spec: ok. 100), najdłuższa ok. 230 LY (spec: ok. 240). Generowanie: ok. 10–35 ms.
- Decyzja do potwierdzenia (pytanie 29): 60 układów mieści ok. 10 graczy przy 60 LY odstępu; 12 graczy dostaje 84 układy o tej samej gęstości.
- Testy (11 nowych, 50 ziaren × 2 rozmiary): determinizm, odstępy, spójność i stopnie, skala tras, specjalności i bogate układy, złoża, 12 pozycji startowych, planeta startowa, surowce specjalne przy startach, anomalie daleko od startów, najkrótsza ścieżka, galaktyka w stanie gry.
- Do sprawdzenia ręcznie: nic w grze (galaktykę zobaczysz w kroku 1.7, mapa 3D); `pnpm check`.

### 0.1.3a: tempo przy wielu planetach (3.11.2026)
- **Zaakceptowane przez właściciela (3.11.2026)** razem z balansem z 0.1.3.
- Uwaga właściciela: im więcej planet, tym szybciej powinien iść rozwój, bo zasoby można rozdzielać między systemami.
- Model (`tools/balance/economy.ts`, `SimOptions`): kolonia (rdzeń, 10 osób, mieszkanie poz. 1, spec 10.5) i stały dowóz każdego minerału z reszty imperium. Raport (`docs/BALANS.md`, sekcja „Wiele planet”): kolonia bez wsparcia 8,9 dnia do maksimum bez surowców specjalnych, z 1 planetą wspierającą (60/h każdego minerału) 5,5 dnia, z 2 — 4,1, z 4 i więcej — 2,7 dnia (dolna granica: jedna budowa naraz i wzrost populacji).
- Koszt dowozu: ok. 1 transportowiec na wspierającą planetę przy 30 LY (paliwo ok. 9% ładunku); w tym samym układzie prawie darmowo, przez całą galaktykę ok. 1/4 ładunku.
- Hamulce kuli śnieżnej opisane w raporcie (kolejka budowy, paliwo, kolonizator, utrzymanie, surowce specjalne, zasięg administracji, 70% mapy); propozycje dodatkowych hamulców tylko do decyzji, nic nie dodane.
- `tests/balance.test.ts`: kolonia wspierana rozwija się wyraźnie szybciej, ale nie szybciej niż 2 dni.

### 0.1.3: balans ekonomii (krok 1.2b, 3.11.2026)
- Decyzja właściciela: pojemność rdzenia **dodaje się** do magazynów (też silosów i akumulatorów). Zapisane w `CORE` (`config/buildings.ts`), `docs/PYTANIA.md` i specyfikacji (sekcja 0, 2.8).
- `tools/balance/`: `economy.ts` (model jednej planety minuta po minucie: kopalnie na złożach, zbiór awaryjny rdzenia, energia z akumulatorem i niedoborem, robotnicy z priorytetem, przetwórstwo, biomasa, wzrost i głód populacji, pojemność rdzeń + magazyn), `plan.ts` (bot „rozsądny gracz” z pilnowaniem energii, rąk do pracy i żywności), `report.ts` → `pnpm balance` generuje `docs/BALANS.md` (tabele kosztów, czasów, energii i maks. poziomu bez surowców specjalnych, zwrot ulepszeń kopalni, przebieg startu).
- Nowe/zmienione liczby: koszt i czas poziomu 1 każdego budynku (`buildMinutes`), koszty rozłożone na metal, tytan i krzem (pierwsza wersja, tylko z metalem, robiła z metalu wąskie gardło); rdzeń: 10 mieszkańców, zbiór 20/h każdego minerału tylko bez jego kopalni, 5 biomasy, 5 energii; elektrownia odnawialna 25/h ×1,3 (15/h nie wystarczało bez reaktora); planeta startowa `STARTER_PLANET` (zielona, żyzność 1, wiatr, metal średni, reszta uboga).
- Wynik symulacji: pierwsza budowa po 1,3 h, 5 budynków po 4,4 h, stocznia po 36 h, pierwszy myśliwiec po 39 h, 16 pól po 40 h, wszystko na maksimum bez surowców specjalnych po 9 dniach. Braki energii 4 h, rąk 10 h w ciągu 21 dni.
- `tests/balance.test.ts` pilnuje tego tempa (zmiana konfiguracji, która je psuje, zatrzyma `pnpm check`).
- Do sprawdzenia przez właściciela: `docs/BALANS.md` — czy tempo pasuje (szybciej/wolniej), czy koszty i czasy są rozsądne.

### 0.1.2: konfiguracja i dane gry (krok 1.2a, 3.11.2026)
- `packages/shared/src/config/`: `resources.ts` (5 podstawowych, 4 specjalne, 3 przetworzone, wartości z 10.0), `recipes.ts` (4.2), `planets.ts` (10 typów planet z decyzjami 2.8: specjalizacje, żyzność, energia odnawialna, częstość, kolor; klasy i pule złóż; 8–14 pól, startowa 16), `buildings.ts` (25 budynków: koszt, energia, robotnicy, wymagania, progi surowców specjalnych, efekt i jego wzrost; wzory `BUILD`; rdzeń `CORE`), `units.ts` (16 jednostek i 4 obiekty obronne z tabel 10.1–10.3, 11.3, 12.3 + dodatki ze `SUROWCE.md`), `techs.ts` (13 technologii, `RESEARCH`), `races.ts` (4 rasy jako dane, mechaniki unikalne jako parametry), `population.ts`, `modifiers.ts` (wspólny opis „+x% do statystyki jednostek”), `schema.ts` (walidacja zod + sprawdzenia krzyżowe, `validateConfig()` wołane też przy starcie klienta).
- `packages/shared/src/rules/modifiers.ts`: jedyny moduł efektywnych statystyk: `effectiveUnit` (atak, pancerz, struktura, cele, prędkość, paliwo, ładowność, koszt ze specjalnymi, czas budowy, utrzymanie), `economyBonus` (wydobycie, tarcza, skanery, żywność), `researchCostMultiplier` (rabaty ras). Zasada łączenia: w obrębie jednego źródła (poziomy jednej technologii, jedna rasa) bonusy się dodają, różne źródła mnożą.
- Testy (21 nowych): walidacja; kopalnia poz. N = zakład poz. N; czasy zapełnienia magazynu z tabeli 8; energia z 5.1; progi surowców specjalnych; wartości jednostek z kolumną „Wartość” (±1%); poziomy stoczni z 9.2; utrzymanie ≈ 2% wartości dziennie; koszty badań z 9.3.3; modyfikatory (Kolosy +30% struktury, Rój −30% kosztu, broń ciężka 5 = +15% ataku, Kupcy transportowiec 625, Forteca, głód, artyleria +1 cel na poz. 5 i 10, napędy, czujniki, rabaty ras).
- **Wartości tymczasowe (do kroku 1.2b „balans ekonomii”):** koszty postawienia wszystkich budynków (poza giełdą), wzrost wydajności rafinerii, huty, warsztatu, farmy i elektrowni odnawialnej (×1,25 jak kopalnia), reaktor fuzyjny (250 energii, 5 helu-3 na poziom), czas załadunku kosmoportu, ilości surowców specjalnych w budynkach i badaniach (20 × 1,6 lub 1,7 na poziom, egzotyczna 5), koszt centrum administracyjnego i stacji orbitalnej, wartości surowców specjalnych (2/4/4/20), pule złóż podstawowych i specjalnych, częstości typów planet, zbiór awaryjny rdzenia 5/h.
- Otwarte pytania, które dane już uwzględniają jako parametr: Kolosy „+25% tytanu” (`titaniumShare`, pytanie 12), rdzeń a magazyn (pytanie 5a; przyjęte, że się dodają, użyjemy w kroku 1.4).
- Do sprawdzenia ręcznie: nic nowego w grze; `pnpm check`. Liczby można przejrzeć w plikach `config/*.ts` (nazwy po polsku przy każdym elemencie).

### 0.1.1: rdzeń symulacji (krok 1.1, 3.11.2026)
- `packages/shared/src/core/`:
  - `clock.ts`: zegar gry (czas gry w ms, mnożnik ×1/×5/×20/×60 z `config/time.ts`, pauza), `tickClock` przelicza czas rzeczywisty na czas gry.
  - `rng.ts`: generator sfc32 z ziarnem (hash cyrb128), stan = 4 liczby (zapisywalny w stanie gry), klasa `Rng` (`int`, `float`, `range`, `chance`, `pick`, `shuffle`), `rngStream(ziarno, 'etykieta')` = niezależne strumienie (np. galaktyka, bitwy).
  - `queue.ts`: kolejka zdarzeń jako kopiec w zwykłej tablicy (serializowalna), stabilna dla równych czasów (numer kolejny `seq`).
  - `state.ts`: `GameState` (wersja, czas, świat, gracze, stan generatora zdarzeń, kolejka, dziennik), wyłącznie dane JSON.
  - `commands.ts`: komendy z walidacją (kod błędu + komunikat po polsku) i zastosowaniem; na razie `AddPlayer`, `RenamePlayer` i `DebugScheduleMarker` (do testów i przyszłego panelu debug).
  - `events.ts`: obsługa zdarzeń; na razie `DebugMarker` (zapis do dziennika, opcjonalny rzut kością z generatora stanu, opcjonalne powtórzenia).
  - `engine.ts`: `advanceTo(stan, czas)` przetwarza zdarzenia do zadanego czasu; `applyCommand(stan, komenda, czas)` = przesunięcie czasu + walidacja + zastosowanie; `replay` odtwarza listę komend. Obie funkcje nie zmieniają stanu wejściowego (kopia), komenda z przeszłości jest odrzucana.
- Testy (33 w `shared`): powtarzalność generatora, niezależność strumieni, wznowienie z zapisanego stanu, równomierność; pauza i mnożniki zegara; kolejność i stabilność kolejki (2000 losowych zdarzeń); kolejność zdarzeń w silniku, łańcuchy zdarzeń, brak mutacji wejścia, błędy komend po polsku; determinizm: to samo ziarno i komendy = identyczny stan, wiele małych kroków = jeden duży, zapis i wczytanie w połowie daje ten sam wynik.
- Decyzje: kopia stanu przez JSON przy każdej komendzie i `advanceTo` (prosto i bezpiecznie; jeśli kiedyś będzie za wolno, zmienimy na kopiowanie tylko zmienionych części). Zdarzenia nie mogą być planowane w przeszłości (wyjątek), a jedno przesunięcie czasu przetwarza najwyżej milion zdarzeń (ochrona przed nieskończoną pętlą).
- Klient bez zmian poza numerem wersji (krok nie obejmuje interfejsu).
- Do sprawdzenia ręcznie: nic w grze (to fundament); `pnpm check`.

### 0.1.0a: start jednym kliknięciem (3.11.2026)
- `start-gry.bat` (Windows): sprawdza Node.js ≥ 20 (brak lub stara wersja → instalacja/aktualizacja Node.js LTS przez winget; bez winget otwiera nodejs.org), instaluje pnpm (`npm install -g`, a w razie problemu uruchamia go przez `npx`), `pnpm install`, `pnpm dev --open` (gra otwiera się w przeglądarce).
- Po świeżej instalacji Node.js Windows może wymagać ponownego uruchomienia pliku (skrypt o tym mówi).
- Teksty bez polskich znaków (konsola Windows źle je wyświetla). `.gitattributes` trzyma końce linii CRLF dla `*.bat`.
- Numer w grze zostaje 0.1.0 (dodatek bez zmian w kodzie gry).
- Do sprawdzenia ręcznie: dwuklik `start-gry.bat` na Windows.

### 0.1.0: szkielet projektu (krok 1.0, 3.11.2026)
- Monorepo pnpm: `packages/shared`, `packages/ai`, `packages/client`; wspólny `tsconfig.base.json` (strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`).
- `pnpm check` = typy (wszystkie pakiety + `tests/`) + ESLint + testy Vitest (po jednym w każdym pakiecie + `tests/purity.test.ts`).
- ESLint blokuje w `shared` i `ai`: `Math.random`, `Date.now`, `performance.now`, `new Date()`, globalne `Date`, timery, `window`, `document`, `navigator`, `localStorage`, `process`, importy `node:*` i modułów wbudowanych Node. Test sprawdza każdą regułę w obu pakietach i to, że klient może używać zegara przeglądarki.
- Klient: Vite + Three.js, granatowe tło, obracający się cyjanowy sześcian wireframe, napis „GALACTIC EMPIRE v0.1.0” (wersja z głównego `package.json`, też w tytule karty).
- Decyzje: TypeScript 6.0 zamiast 7.0, bo typescript-eslint 8 wspiera TypeScript < 6.1. Prettier nie formatuje `*.md` (dokumenty piszemy ręcznie). Zaakceptowane surowce specjalne wpisane do specyfikacji (sekcja 0, wersja 2.8) i `docs/SUROWCE.md`.
- Znane ograniczenia: brak logiki gry (zgodnie z zakresem). Vite ostrzega o rozmiarze paczki z Three.js (ok. 500 kB): nieistotne na tym etapie.
- Do sprawdzenia ręcznie: `pnpm install`, `pnpm dev`, w przeglądarce (http://localhost:5173) obracający się sześcian i numer wersji.

### 0.0.4: 4 surowce specjalne (3.11.2026)
- Właściciel: 6 to za dużo. Zostają: materiał rozpadowy (atak i energia), krystalit (obrona i przemysł; połączenie neutronium i kryształów), hel-3 (logistyka i fuzja), egzotyczna materia (szczyt rozwoju). Bioplazma usunięta; budynki cywilne bez surowców specjalnych do poz. 8.

### 0.0.3: surowce specjalne (propozycja, 3.11.2026)
- `docs/SUROWCE.md`: 5 surowców podstawowych (metal, lód, tytan, krzem, biomasa) na każdej planecie i 6 specjalnych (materiał rozpadowy, hel-3, kryształy rezonansowe, neutronium, bioplazma, egzotyczna materia) na planetach wyspecjalizowanych, z progami rozwoju (budynki od poz. 5, badania od poz. 5, cięższe jednostki).
- Czeka na akceptację; liczby do przeliczenia w kroku 1.2b.

### 0.0.2: decyzje o złożach, biomasie i starcie (3.11.2026)
- Odpowiedzi na 1a, 5a, 6a w `docs/PYTANIA.md`; zapowiedź zmian w specyfikacji (sekcja 0, wersja 2.8).
- Otwarte: 1b (które surowce są podstawowe, jakie surowce specjalne). Nie blokuje kroków 1.0 i 1.1.
- Na później: konfiguracja kosztów i utrzymania ogólna (dowolny zasób), żeby dało się dodać rasę robotów albo rasę statków organicznych.

### 0.0.1: odpowiedzi właściciela (3.11.2026)
- Odpowiedzi na pytania 1–6 i 11 zapisane w `docs/PYTANIA.md`.
- Każda planeta ma złoża trzech surowców + biomasę, z jednym wiodącym; start z pustym magazynem; planeta startowa ma 16 pól do wyboru; koszty, czasy i wydajności budynków balansuje Claude (nowy krok 1.2b); mnożnik klasy w walce otwarty do kroku 2.1.
- Pytania uzupełniające 1a, 5a, 6a (blokują krok 1.2a). Specyfikacja zostanie zaktualizowana do wersji 2.8 po odpowiedziach.

### 0.0.0: przygotowanie (krok 0)
- Skopiowano specyfikację 2.7 (`docs/specyfikacja.md`), plan budowy (`docs/plan-budowy.md`) i README.
- Utworzono `CLAUDE.md` z zasadami (w tym: każdy krok = nowa wersja = nowa gałąź).
- Krytyczny przegląd specyfikacji: wszystkie liczby z tabel przeliczone; zgadzają się wartości jednostek, utrzymanie, czasy i paliwo lotów, koszty badań, bilans energii i robotników planety startowej. Sprzeczności i braki w `docs/PYTANIA.md` (28 pozycji, 7 oznaczonych jako blokujące).
- Bez kodu gry. Nic nie zostało zainstalowane.
- Do sprawdzenia: przeczytać `CLAUDE.md` i odpowiedzieć na pytania z `docs/PYTANIA.md` (przynajmniej blokujące) przed krokiem 1.2.
