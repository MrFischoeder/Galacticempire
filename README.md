<div align="center">

# GALACTIC EMPIRE

**Przeglądarkowa strategia kosmiczna w czasie rzeczywistym.**
Zdobywaj układy gwiezdne, kontroluj trasy hiperprzestrzenne i przetrwaj w galaktyce, która nigdy nie śpi.

`status: we wczesnym rozwoju` · `TypeScript` · `Three.js` · `gra przeglądarkowa`

</div>

---

## O grze

Galactic Empire to ciągła gra strategiczna osadzona w galaktyce losowo wygenerowanych układów gwiezdnych, połączonych trasami hiperprzestrzennymi. Każdy gracz zaczyna od jednej planety i rozbudowuje gospodarkę, flotę i technologie, żeby zdobywać kolejne planety i całe układy.

Gra nie ma rund. Świat działa także wtedy, gdy jesteś offline: planety produkują, transporty kursują, a ktoś może właśnie lecieć w Twoją stronę.

Oprawa graficzna to proste, płasko cieniowane 3D z neonowymi liniami, w duchu filmów science fiction z lat 80.

## Najważniejsze cechy

- **Żywa galaktyka:** losowe układy gwiezdne, różne typy planet i skończone złoża. Koszt i czas lotu zależą od rzeczywistej odległości w latach świetlnych.
- **Gospodarka do zaplanowania:** 5 surowców, przetwórstwo, energia, żywność, populacja, magazyny i niezniszczalny rdzeń planety, który pozwala odbudować się po klęsce.
- **Cztery rasy:** Kupcy, Rój, Kolosy i Forteca, każda z inną rolą i unikalną mechaniką.
- **Przemyślana walka:** 7 statków bojowych, jednostki lądowe i obrona planet. Koszt każdej jednostki wynika z jej mocy bojowej, a kontry są sprawdzone symulacją. Zwiad decyduje o wyniku.
- **Badania:** 13 technologii, które wzmacniają jednostki, ale nie odwracają kontr.
- **Logistyka i handel:** trasy cykliczne, blokady, grabież, rynek graczy z fizycznym transportem towarów.
- **Mgła wojny:** widzisz tylko to, co odkryłeś i zeskanowałeś.
- **Sojusze:** wspólna mapa, wymiana zasobów i wspólna obrona.
- **Tryby gry:** gra jednoosobowa przeciw komputerowi (w przeglądarce, z przyspieszeniem czasu), kooperacja przeciw AI, gra wieloosobowa i obrona przed inwazją.

## Jak wygląda rozgrywka

1. Rozbuduj planetę startową: energia, żywność, magazyny, kopalnie.
2. Wyślij sondy i odkryj okolicę.
3. Zajmij kolejne planety i przejmij kontrolę nad układami.
4. Połącz planety trasami handlowymi i chroń je przed blokadami.
5. Zbuduj flotę pod przeciwnika, którego zeskanowałeś, i atakuj albo się broń.
6. Wracaj co kilka godzin: magazyny się zapełniają, badania się kończą, a skanery ostrzegają przed atakiem.

## Status projektu

Gra jest budowana krok po kroku według planu w [`docs/plan-budowy.md`](docs/plan-budowy.md). Aktualny postęp jest w [`docs/PROGRESS.md`](docs/PROGRESS.md).

| Faza | Zakres | Status |
|---|---|---|
| 1 | Fundamenty i ekonomia, widok 3D | ⏳ w trakcie |
| 2 | Walka, obrona planet, grabież, desant | ⬜ |
| 3 | Przeciwnicy komputerowi i gra jednoosobowa (pierwsza grywalna wersja) | ⬜ |
| 4 | Serwer, konta, powiadomienia, gra ze znajomymi | ⬜ |
| 5 | Blokady, kontrola układów, rynek, inwazja | ⬜ |
| 6 | Balans i skalowanie | ⬜ |

## Technologia

| Obszar | Wybór |
|---|---|
| Język | TypeScript (strict) |
| Monorepo | pnpm workspaces |
| Grafika | Three.js, interfejs w HTML/CSS |
| Budowanie | Vite |
| Testy | Vitest |
| Serwer (od fazy 4) | Node.js, WebSocket, SQLite na start |

### Zasady architektury

- **Czysta logika gry** w `packages/shared`: funkcje `(stan, komenda, czasGry) => nowyStan`, bez zależności od przeglądarki.
- **Ta sama symulacja wszędzie:** w przeglądarce (gra jednoosobowa) i na serwerze (gra sieciowa).
- **Determinizm:** losowość z ziarnem i własny zegar gry. Ta sama gra odtworzona od początku daje ten sam wynik.
- **Dane zamiast kodu:** wszystkie liczby, jednostki, budynki, rasy i technologie są w plikach konfiguracyjnych.
- **Uczciwe AI:** komputer korzysta z tych samych komend i podlega tej samej mgle wojny co gracz.

## Struktura repozytorium

```
galactic-empire/
├── packages/
│   ├── shared/     # logika gry, konfiguracja, symulacja (bez DOM)
│   ├── ai/         # przeciwnicy komputerowi
│   ├── client/     # przeglądarka: Three.js i interfejs
│   └── server/     # serwer gry (od fazy 4)
├── docs/
│   ├── specyfikacja.md   # pełny projekt gry: zasady i wszystkie liczby
│   ├── plan-budowy.md    # plan budowy krok po kroku
│   ├── PROGRESS.md       # dziennik postępów
│   └── PYTANIA.md        # otwarte pytania projektowe
├── CLAUDE.md       # zasady pracy dla Claude Code
└── README.md
```

## Uruchomienie

Wymagania: Node.js 20 lub nowszy i pnpm.

```bash
pnpm install
pnpm dev      # uruchamia grę w przeglądarce
pnpm check    # typy, lint i wszystkie testy
pnpm sim --days 14 --players 6 --seed 1   # symulacja bez grafiki (od kroku 1.13)
```

## Dokumentacja

- [Specyfikacja gry](docs/specyfikacja.md): wszystkie zasady, liczby i wyniki symulacji balansu.
- [Plan budowy](docs/plan-budowy.md): kolejne kroki rozwoju z kryteriami akceptacji.
- [Dziennik postępów](docs/PROGRESS.md).

## Jak powstaje gra

Projekt jest rozwijany z pomocą [Claude Code](https://claude.com/claude-code), według planu podzielonego na małe kroki. Każdy krok ma własny zakres, testy i kryteria akceptacji, kończy się commitem i ręcznym sprawdzeniem. Zasady gry zmieniają się tylko przez specyfikację, nigdy „po cichu” w kodzie.

## Autor

Łukasz. Projekt hobbystyczny.

## Licencja

Do ustalenia.
