# Dziennik postępów

Każdy krok z `docs/plan-budowy.md` to osobna wersja na osobnej gałęzi (zasady w `CLAUDE.md`).

## Mapa wersji

| Krok | Wersja | Gałąź | Zakres | Status |
|---|---|---|---|---|
| 0 | 0.0.0 | `v0.0.0-przygotowanie` | CLAUDE.md, dokumenty, pytania do specyfikacji | ✅ czeka na odpowiedzi |
| 1.0 | 0.1.0 | `v0.1.0-szkielet` | monorepo, narzędzia, pusta scena 3D | ⬜ |
| 1.1 | 0.1.1 | `v0.1.1-rdzen-symulacji` | zegar gry, RNG, kolejka zdarzeń, komendy | ⬜ |
| 1.2 | 0.1.2 | `v0.1.2-konfiguracja` | wszystkie liczby jako dane, modyfikatory | ⬜ |
| 1.3 | 0.1.3 | `v0.1.3-galaktyka` | generator galaktyki i tras | ⬜ |
| 1.4a | 0.1.4 | `v0.1.4-produkcja` | wydobycie, przetwórstwo, magazyn, rdzeń, energia | ⬜ |
| 1.4b | 0.1.5 | `v0.1.5-populacja` | populacja, robotnicy, żywność, silos, głód | ⬜ |
| 1.5 | 0.1.6 | `v0.1.6-budowa` | budowa i ulepszenia budynków | ⬜ |
| 1.6 | 0.1.7 | `v0.1.7-badania` | laboratorium i 13 technologii | ⬜ |
| 1.7 | 0.1.8 | `v0.1.8-mapa-galaktyki` | Web Worker, mapa 3D | ⬜ |
| 1.8 | 0.1.9 | `v0.1.9-widok-planety` | widok układu, panele, pasek czasu | ⬜ |
| 1.9 | 0.1.10 | `v0.1.10-ruch-flot` | ruch flot, paliwo, kosmoport, hangary | ⬜ |
| 1.10a | 0.1.11 | `v0.1.11-stocznia` | stocznia, utrzymanie | ⬜ |
| 1.10b | 0.1.12 | `v0.1.12-transporty` | transporty, trasy cykliczne, kolonizacja | ⬜ |
| 1.11 | 0.1.13 | `v0.1.13-mgla-wojny` | `getPlayerView`, sondy, skanery | ⬜ |
| 1.12 | 0.1.14 | `v0.1.14-sojusze` | sojusze | ⬜ |
| 1.13 | 0.1.15 | `v0.1.15-bot-symulacja` | bot ekonomiczny, `pnpm sim` | ⬜ |
| 2.1–2.4 | 0.2.x | `v0.2.x-...` | walka | ⬜ |
| 3.1–3.5 | 0.3.x → 1.0.0 | `v0.3.x-...`, `v1.0.0-gra-jednoosobowa` | AI i pierwsza grywalna wersja | ⬜ |
| 4.x–6.x | 1.x | | serwer, mechaniki zaawansowane, balans | ⬜ |

Kroki 1.4 i 1.10 są w planie dość duże, dlatego od razu proponuję podział na a/b (numer wersji rośnie o jeden na każdą część). Pozostałe zostają jak w planie; jeśli któryś okaże się za duży, dzielimy go w trakcie.

## Wpisy

### 0.0.0: przygotowanie (krok 0)
- Skopiowano specyfikację 2.7 (`docs/specyfikacja.md`), plan budowy (`docs/plan-budowy.md`) i README.
- Utworzono `CLAUDE.md` z zasadami (w tym: każdy krok = nowa wersja = nowa gałąź).
- Krytyczny przegląd specyfikacji: wszystkie liczby z tabel przeliczone; zgadzają się wartości jednostek, utrzymanie, czasy i paliwo lotów, koszty badań, bilans energii i robotników planety startowej. Sprzeczności i braki w `docs/PYTANIA.md` (28 pozycji, 7 oznaczonych jako blokujące).
- Bez kodu gry. Nic nie zostało zainstalowane.
- Do sprawdzenia: przeczytać `CLAUDE.md` i odpowiedzieć na pytania z `docs/PYTANIA.md` (przynajmniej blokujące) przed krokiem 1.2.
