# Galactic Empire: zasady projektu

Przeglądarkowa strategia kosmiczna w czasie rzeczywistym. Właściciel: Łukasz.

## Język

- Odpowiadaj po polsku (rozmowa z właścicielem i dokumenty w `docs/` po polsku).
- **Cała gra jest po angielsku** (decyzja właściciela 3.11.2026): interfejs, nazwy zasobów, budynków, jednostek, technologii, ras i planet, komunikaty błędów komend, wpisy dziennika.
- Kod, nazwy, komentarze i komunikaty commitów po angielsku.

## Źródła prawdy

- `docs/specyfikacja.md` (wersja 2.7) to jedyne źródło zasad i liczb gry. Nie zmieniaj zasad na własną rękę.
- Niejasności i sprzeczności zapisuj w `docs/PYTANIA.md` (i wspomnij w podsumowaniu). Nie zgaduj.
- Decyzje właściciela (odpowiedzi na pytania) trafiają do `docs/PYTANIA.md` jako „Odpowiedź” i, jeśli zmieniają zasady, do specyfikacji (sekcja 0 „Zmiany”).

## Sposób pracy

- Pracujemy krokami z `docs/plan-budowy.md`. Jeden krok naraz. Po kroku zatrzymaj się i czekaj na właściciela.
- Nie dodawaj funkcji spoza bieżącego kroku. Rzeczy na później zapisuj w `docs/PROGRESS.md`.
- Jeśli krok jest za duży, podziel go na części (1.4a, 1.4b...) i zrób tylko pierwszą.
- Każdy krok kończy się blokiem ZAKOŃCZENIE KROKU z planu (`pnpm check`, `docs/PROGRESS.md`, commit, podsumowanie, stop).

## Wersje i gałęzie (zasada właściciela)

- **Każdy krok = nowa wersja = nowa gałąź** w repozytorium `MrFischoeder/Galacticempire`.
- Numer wersji: `0.<faza>.<n>` dopóki gra nie jest grywalna, gdzie `n` to kolejny numer kroku lub części kroku w fazie (dokładne przypisanie w tabeli „Mapa wersji” w `docs/PROGRESS.md`; np. krok 0 → `0.0.0`, krok 1.0 → `0.1.0`); od pierwszej grywalnej wersji (krok 3.4) `1.0.0` i dalej według uznania właściciela. Poprawka w obrębie kroku: ostatnia liczba z literą lub kolejna gałąź `-fix` (np. `0.1.4-fix1`).
- Nazwa gałęzi: `v<wersja>-<krótki-opis>`, np. `v0.1.0-szkielet`, `v0.1.4-produkcja-planety`.
- Nowa gałąź wychodzi z gałęzi poprzedniego kroku (albo z `main`, jeśli właściciel ją scalił).
- Wersja jest zapisana w `package.json` (główny) i widoczna w kliencie (od kroku 1.0). Każda wersja ma wpis w `docs/PROGRESS.md`.
- W podsumowaniu kroku podaj nazwę gałęzi i link do pobrania:
  `https://github.com/MrFischoeder/Galacticempire/archive/refs/heads/<gałąź>.zip`
  (repozytorium jest prywatne: link działa tylko po zalogowaniu na GitHub) i wyślij właścicielowi plik ZIP tej wersji (`git archive`) bezpośrednio w rozmowie.

## Architektura (sekcja 19 specyfikacji)

- Monorepo pnpm: `packages/shared` (czysta logika: zero DOM, zero zależności od przeglądarki i Node), `packages/ai`, `packages/client`, później `packages/server`.
- Logika to czyste funkcje `(stan, komenda, czasGry) => nowyStan`.
- Gracz i AI zmieniają stan wyłącznie przez komendy walidowane w `shared`. Błąd komendy = kod + opis po angielsku.
- Symulacja używa ZEGARA GRY (mnożnik ×1/×5/×20/×60, pauza), nigdy `Date.now()`, `new Date()`, `performance.now()` ani timerów w `shared`.
- Cała losowość przez deterministyczny generator z ziarnem (osobne strumienie, np. galaktyka, bitwy). Zakaz `Math.random()` w `shared` i `ai`.
- Produkcja liczona leniwie od znacznika czasu, odcinkami między „punktami zmiany” (pełny magazyn, pusty akumulator, koniec żywności, wyczerpane złoże). Zdarzenia (przyloty, końce budów, bitwy) w kolejce zdarzeń posortowanej po czasie gry, stabilnej dla równych czasów.
- Wszystkie liczby gry w `packages/shared/src/config/`, nigdy wpisane w logikę.
- Rasy, jednostki, budynki i technologie to dane, nie osobne klasy.
- Efektywne statystyki (rasa, badania, bonusy, głód) liczone w JEDNYM module modyfikatorów.
- AI korzysta wyłącznie z `getPlayerView(stan, graczId)` i komend (sekcja 23.3). Klient od kroku 1.11 też.
- Stan gry serializowalny (JSON), żeby działał zapis, Web Worker i serwer.
- Rdzeń (`packages/shared/src/core/`): `clock.ts` (zegar gry), `rng.ts` (`Rng`, `rngStream`), `queue.ts` (kolejka zdarzeń), `state.ts` (`GameState`), `commands.ts` (komendy: każda ma `validate` i `apply` w `COMMANDS`), `events.ts` (zdarzenia: `EVENT_HANDLERS`, `scheduleEvent`), `engine.ts` (`advanceTo`, `applyCommand`, `replay`). Nowa komenda = typ w unii `Command` + wpis w `COMMANDS`; nowe zdarzenie = typ w unii `GameEvent` + wpis w `EVENT_HANDLERS`. Losowość w zdarzeniach z `state.rng` albo z `rngStream(seed, ...)`.
- Dane (`packages/shared/src/config/`): `resources`, `recipes`, `planets`, `buildings` (+ `BUILD`, `CORE`), `units`, `techs` (+ `RESEARCH`), `races`, `population`, `modifiers` (typy modyfikatorów), `schema` (`validateConfig`). Nowy element gry = wpis w danych + przejście walidacji. Wartości oznaczone `PROVISIONAL` czekają na krok 1.2b.
- Galaktyka (`packages/shared/src/galaxy/`): `generateGalaxy(seed, opts)` deterministycznie ze strumienia `galaxy`; `systemsFor(gracze)` dobiera wielkość. **Nie ma tras** (decyzja właściciela): loty w linii prostej między dowolnymi układami, odległość `systemDistance`, sąsiedzi `systemsWithin`. Zmiana generatora zmienia wszystkie galaktyki: pilnuj testów w `test/galaxy.test.ts`.
- Ekonomia planety (`packages/shared/src/economy/`): `settlePlanet` rozlicza planetę odcinkami między punktami zmiany (`planetRates`, `nextChangePoint`); komendy zmieniające planetę najpierw wołają `settleOwned`; podgląd bez zmiany stanu: `planetAt`. Złoża (pule) są w galaktyce (`world.galaxy.planets[id].deposits`) i maleją przy rozliczeniu. Mieszkańcy zmieniają się o całe osoby (każda zmiana to punkt zmiany); robotników przydziela `staffing` według `POPULATION.workerPriority`. `tests/engine-vs-balance.test.ts` pilnuje zgodności silnika z modelem `tools/balance`.
- Badania (`economy/research.ts`, `economy/schedule.ts`): zadanie badawcze zabiera z magazynu planety z laboratorium wszystko, czego jeszcze potrzebuje (`paid`), czas biegnie niezależnie; koniec = czas minął i koszt zapłacony; bez anulowania, przerywa je tylko brak laboratorium; `finalizeResearch` w `settleOwned` przenosi ukończone do `player.techs`; zdarzenie `ResearchCheck` pilnuje ukończenia. `ownerContext` = rasa + technologie gracza.
- Floty (`packages/shared/src/fleet/`): jednostki gracza przy własnej planecie to `PlanetState.units` (hangary) i `orbit`; `GameState.fleets` to wyłącznie floty w locie (nie ma stacjonowania u obcych; paliwo całej misji płacone na starcie; kosmoport niepotrzebny do startu; loty w układzie bez paliwa; decyzje właściciela 3.11.2026). `flightPlan` (czas, paliwo), `canSendFleet`/`sendFleet`, `recallFleet`, `arriveFleet` (zdarzenie `FleetArrival`), `landUnits`, `fitHangar`, `moveUnits` (hangar ↔ orbita, darmowe). Liczby lotu i stoczni w `config/fleets.ts`. Stocznia: `fleet/shipyard.ts` (`PlanetState.shipyard`, `OrderUnits`/`CancelUnitOrder`). Budowa i jednostki postępują w `settlePlanet` (tempo budowy = wydajność energii, stoczni = energia × obsada; zdarzenie `PlanetJobs` sprawdza je, `PlanetState.news` → dziennik). Załoga (`CREW`) to koszt produkcji: znika z populacji, nie zajmuje mieszkań. Wyżywienie jednostek planety można przepisać na inną planetę (`SetUpkeepPlanet`, `upkeepFrom`/`support`, `refreshSupport` po każdej komendzie i zdarzeniu). Energię zużywają tylko pracujące budynki i plac budowy (decyzja 4.11.2026). Transporty (misja `transport`, `cargo`, `loadTime`, czekanie na orbicie `waiting` + `FleetRetry`), kolonizacja (misja `colonize`, `systemController`), trasy cykliczne (`fleet/routes.ts`, `RouteTick`). Utrzymanie jednostek (hangary, orbita, `away` = w locie) to proces `upkeep` w `planetRates`, karmiony po mieszkańcach (`upkeepFed`).
- Wywiad (`packages/shared/src/intel/`): `getPlayerView` to jedyne źródło danych dla klienta (i AI): własne planety, mapa nieba `chart` (nieodkryte układy jako „Unknown” bez planet, bez ziarna), skany z wiekiem, kontakty w zasięgu skanerów, ostrzeżenia, własny dziennik (`LogEntry.who` — każdy nowy wpis dziennika dotyczący gracza musi mieć `who`). Misja `scan` (sonda), zdarzenie `FleetWarning`.
- Efektywne statystyki: wyłącznie `packages/shared/src/rules/modifiers.ts` (`effectiveUnit`, `economyBonus`, `researchCostMultiplier`). W obrębie jednego źródła bonusy się dodają, różne źródła mnożą.

- Klient (`packages/client/src/`): `sim/` (Web Worker ze stanem gry i zegarem gry; `handler.ts` testowalny, migawki co 250 ms, `SimClient` na stronie), `map/` (mapa galaktyki), `system/` (widok układu), `surface/` (powierzchnia planety w rzucie izometrycznym: heksy pól z `hexSpiral`, sceneria typu planety w `themes.ts`, modele budynków w `buildingModels.ts`, `SurfaceView`), `ui/` (panele DOM: `planetPanel`, `researchPanel`, `format`; akcje przez `data-action` i `pointerdown`). W trybie dev `window.__map`, `__system`, `__surface`, `__sim` (debug).

## Polecenia

- `pnpm install`, `pnpm dev` (klient Vite), `pnpm build`, `pnpm check` (typy, lint, testy), `pnpm format` (Prettier; pliki `*.md` pominięte), `pnpm balance` (model ekonomii w `tools/balance/`, przepisuje `docs/BALANS.md`; uruchom po każdej zmianie kosztów, czasów lub wydajności; `tests/balance.test.ts` pilnuje tempa startu).
- Reguły czystości (`shared`, `ai`) są w `eslint.config.js`; test `tests/purity.test.ts` sprawdza, że wykrywają `Math.random`, `Date.now`, `new Date()`, timery, `window`, `document` i importy Node.
- Narzędzia: TypeScript 6.0 (typescript-eslint nie wspiera jeszcze 7.x), Vite, Three.js, Vitest, ESLint, Prettier.

## Jakość

- TypeScript strict. Testy Vitest. Każda reguła gry ma test, a liczby ze specyfikacji (tabele) mają testy porównujące z tolerancją zaokrągleń.
- `pnpm check` = typy + lint + wszystkie testy. Musi przechodzić przed commitem.

## Styl graficzny (sekcja 18)

- Lata 80., low-poly, płaskie cieniowanie, bez tekstur, neonowe linie, bez cząsteczek.
- Tło granat/czerń, akcent cyjan, wrogowie magenta, zasoby żółty, poprawny stan zielony fosforowy. Maks. 3 akcenty naraz.
- Interfejs: HTML/CSS nad canvasem, panele jak terminal, monospace.
