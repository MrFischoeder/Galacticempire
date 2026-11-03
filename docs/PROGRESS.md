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
| 1.1 | 0.1.1 | `v0.1.1-rdzen-symulacji` | zegar gry, RNG, kolejka zdarzeń, komendy | ⬜ |
| 1.2a | 0.1.2 | `v0.1.2-konfiguracja` | wszystkie liczby jako dane, modyfikatory | ⬜ |
| 1.2b | 0.1.3 | `v0.1.3-balans-ekonomii` | narzędzie liczące + tabela kosztów, czasów i wydajności budynków do akceptacji | ⬜ |
| 1.3 | 0.1.4 | `v0.1.4-galaktyka` | generator galaktyki i tras | ⬜ |
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
