# Galactic Empire: plan budowy w Claude Code (prompty krok po kroku)

Ten plik to kompletny scenariusz budowy gry w Claude Code. Gra powstaje w małych krokach. Każdy krok ma zakres, kryteria akceptacji i testy, a na końcu Claude Code zatrzymuje się i czeka na Ciebie.

---

## Jak korzystać z tego pliku

1. Utwórz pusty katalog projektu i zainicjuj w nim git (`git init`).
2. Skopiuj do niego dokument **`galactic-empire-specyfikacja-v2-7.md`** jako **`docs/specyfikacja.md`**. To jedyne źródło prawdy dla wszystkich zasad i liczb.
3. Skopiuj ten plik jako **`docs/plan-budowy.md`**. Claude Code będzie z niego czytał kolejne kroki.
4. Uruchom Claude Code w katalogu projektu i wklej **Prompt 0**.
5. Potem wklejaj kolejne prompty kroków, **jeden na sesję lub jeden po drugim**, dopiero gdy poprzedni krok jest zakończony i przez Ciebie sprawdzony.
6. Po każdej fazie użyj **promptu przeglądowego** (na końcu pliku).
7. Gdy coś nie działa, użyj **promptu naprawczego** zamiast iść dalej.

**Zasada nadrzędna:** nie przechodzisz do następnego kroku, dopóki `pnpm check` (testy, typy, lint) nie przechodzi i nie sprawdziłeś ręcznie punktów z listy „Do sprawdzenia przez Ciebie”.

**Krótka wersja promptu:** każdy krok możesz też uruchomić krótko:
> Zrealizuj krok 1.4 z `docs/plan-budowy.md`. Trzymaj się zasad z `CLAUDE.md`.

Pełne treści poniżej są na wypadek, gdyby Claude Code potrzebował więcej kontekstu.

---

## Mapa kroków

| Faza | Kroki | Wynik fazy |
|---|---|---|
| **1. Fundamenty i ekonomia** | 1.0–1.13 | Lokalna symulacja galaktyki, planet, ekonomii, badań, ruchu, transportów, mgły wojny i sojuszy z widokiem 3D. Bez walki |
| **2. Walka** | 2.1–2.4 | Bitwy, obrona planet, grabież, desant, bombardowanie, raporty |
| **3. AI i gra jednoosobowa** | 3.1–3.5 | **Pierwsza grywalna wersja:** gra przeciw komputerowi w przeglądarce, z zapisem i przyspieszeniem czasu |
| **4. Serwer i gra z ludźmi** | 4.1–4.5 | Jeden serwer dla Ciebie i znajomych, konta, panel administratora, powiadomienia |
| **5. Mechaniki zaawansowane** | 5.1–5.4 | Blokady, kontrola układów, rynek, inwazja |
| **6. Balans i skalowanie** | 6.1–6.3 | Telemetria, turnieje AI, testy obciążeniowe, strojenie liczb |
| **7. Mechy** | — | Poza zakresem. Osobny plan po stabilnej grze |

---

## Blok standardowy: zakończenie każdego kroku

Każdy prompt kroku kończy się odwołaniem do tego bloku. Claude Code ma go wykonać zawsze:

```
ZAKOŃCZENIE KROKU
1. Uruchom `pnpm check` (typy, lint, wszystkie testy). Wszystko musi przejść.
2. Zaktualizuj `docs/PROGRESS.md`: co zostało zrobione, jakie decyzje podjąłeś i dlaczego, znane ograniczenia, co jest do sprawdzenia ręcznie.
3. Jeśli zmieniła się architektura lub zasady, zaktualizuj `CLAUDE.md`.
4. Jeśli w trakcie znalazłeś niejasność lub sprzeczność w specyfikacji, NIE zgaduj. Opisz ją w `docs/PYTANIA.md` i w podsumowaniu.
5. Zrób commit z opisem kroku (np. `krok 1.4: produkcja planety`).
6. Napisz krótkie podsumowanie po polsku: co działa, jak to uruchomić, lista „Do sprawdzenia przez Ciebie”.
7. ZATRZYMAJ SIĘ. Nie zaczynaj kolejnego kroku.
```

---

# PROMPT 0: Przygotowanie (bez kodu gry)

```
Budujemy przeglądarkową grę strategiczną w czasie rzeczywistym „Galactic Empire”.

Pełna specyfikacja jest w `docs/specyfikacja.md` (wersja 2.7). Plan budowy krok po kroku jest w `docs/plan-budowy.md`. Przeczytaj oba pliki w całości, zanim cokolwiek zrobisz.

W tym kroku NIE piszesz kodu gry. Twoje zadania:

1. Utwórz `CLAUDE.md` z zasadami projektu. Muszą się w nim znaleźć:
   - Odpowiadaj po polsku. Kod, nazwy, komentarze i commity w kodzie po angielsku. Teksty interfejsu po polsku.
   - Specyfikacja `docs/specyfikacja.md` jest źródłem prawdy. Nie zmieniaj zasad gry na własną rękę. Niejasności zapisuj w `docs/PYTANIA.md`.
   - Pracujemy krokami z `docs/plan-budowy.md`. Jeden krok naraz. Po kroku zatrzymaj się.
   - Architektura (sekcja 19 specyfikacji):
     * monorepo pnpm: `packages/shared` (czysta logika, zero DOM, zero zależności od przeglądarki i Node), `packages/ai`, `packages/client`, później `packages/server`;
     * logika to czyste funkcje `(stan, komenda, czasGry) => nowyStan`;
     * gracz (i AI) zmienia stan wyłącznie przez komendy walidowane w `shared`;
     * symulacja używa ZEGARA GRY (z mnożnikiem i pauzą), nigdy `Date.now()` ani zegara systemowego w `shared`;
     * cała losowość przez deterministyczny generator z ziarnem; zakaz `Math.random()` w `shared`;
     * produkcja liczona leniwie od znacznika czasu, zdarzenia (przyloty, końce budów, bitwy) w kolejce zdarzeń;
     * wszystkie liczby gry w `packages/shared/src/config/`, nigdy wpisane w logikę;
     * rasa, jednostki, budynki i technologie to dane, nie osobne klasy w kodzie;
     * efektywne statystyki (z rasą, badaniami, bonusami) liczone w JEDNYM module modyfikatorów.
   - TypeScript w trybie strict. Testy w Vitest. Każda reguła gry ma test.
   - Przed zakończeniem kroku zawsze `pnpm check` i blok ZAKOŃCZENIE KROKU z planu.
   - Nie dodawaj funkcji spoza bieżącego kroku. Jeśli coś będzie potrzebne później, zostaw notatkę w `docs/PROGRESS.md`.
2. Utwórz `docs/PROGRESS.md` (pusta lista kroków ze statusem) i `docs/PYTANIA.md`.
3. Przeczytaj specyfikację krytycznie i wypisz w `docs/PYTANIA.md` wszystkie sprzeczności, braki i niejasności, które znajdziesz. Nie poprawiaj ich sam.
4. Zaproponuj w podsumowaniu strukturę katalogów i listę bibliotek (z uzasadnieniem), ale niczego nie instaluj.

Zakończ krótkim podsumowaniem i zatrzymaj się.
```

**Do sprawdzenia przez Ciebie:** przeczytaj `CLAUDE.md` i `docs/PYTANIA.md`. Odpowiedz na pytania (możesz wkleić odpowiedzi w czacie), zanim przejdziesz do kroku 1.0.

---

# FAZA 1: Fundamenty i ekonomia

## Krok 1.0: Szkielet projektu

```
Zrealizuj krok 1.0 z `docs/plan-budowy.md`.

Cel: działający, pusty szkielet monorepo.

Zakres:
- pnpm workspaces: `packages/shared`, `packages/ai`, `packages/client`.
- TypeScript strict, wspólny `tsconfig.base.json`.
- Vitest w każdym pakiecie, ESLint i Prettier.
- Skrypt `pnpm check` uruchamiający: typy, lint, testy we wszystkich pakietach.
- Reguła ESLint (lub test) blokująca w `packages/shared`: `Math.random`, `Date.now`, `new Date()`, `setTimeout`, `window`, `document`, importy z `node:`.
- Klient: Vite + Three.js, pusta scena z obracającym się sześcianem wireframe w kolorze cyjan na granatowym tle.
- Po jednym przykładowym teście w każdym pakiecie.

Poza zakresem: jakakolwiek logika gry.

Kryteria akceptacji:
- `pnpm install`, `pnpm check` i `pnpm dev` działają.
- Test pokazuje, że użycie `Math.random()` w `shared` jest wykrywane.

Wykonaj blok ZAKOŃCZENIE KROKU.
```

**Do sprawdzenia przez Ciebie:** `pnpm dev`, w przeglądarce widać sześcian.

## Krok 1.1: Rdzeń symulacji

```
Zrealizuj krok 1.1 z `docs/plan-budowy.md`.

Cel: fundament, na którym oprze się cała logika.

Zakres (w `packages/shared`):
- Zegar gry: czas gry w milisekundach, mnożnik (×1, ×5, ×20, ×60), pauza. Funkcja przeliczająca czas rzeczywisty na czas gry. Sekcja 23.2 specyfikacji.
- Deterministyczny generator liczb losowych z ziarnem (np. sfc32 lub mulberry32), z możliwością rozgałęziania (osobne strumienie np. dla galaktyki i bitew).
- Kolejka zdarzeń posortowana po czasie gry (kopiec), ze stabilną kolejnością dla równych czasów.
- Typy stanu gry (na razie szkielet: świat, gracze, czas).
- Wzorzec komend: typ komendy, walidacja zwracająca wynik `ok | błąd z kodem i opisem po polsku`, funkcja `applyCommand`.
- Funkcja `advanceTo(stan, czasGry)` przetwarzająca zdarzenia z kolejki do zadanego czasu.

Testy:
- Ten sam seed daje identyczną sekwencję liczb, różne seedy różne.
- Pauza zatrzymuje czas gry, mnożnik go przyspiesza.
- Zdarzenia wykonują się w poprawnej kolejności, także przy równych czasach.
- Odtworzenie tych samych komend od tego samego stanu daje identyczny wynik (test determinizmu).

Wykonaj blok ZAKOŃCZENIE KROKU.
```

## Krok 1.2: Konfiguracja i dane gry

```
Zrealizuj krok 1.2 z `docs/plan-budowy.md`.

Cel: wszystkie liczby ze specyfikacji jako typowane dane.

Zakres (`packages/shared/src/config/`):
- Zasoby, wartości zasobów (sekcja 10.0), przepisy przetwórstwa (4.2), typy planet (2.3), żyzność, klasy złóż (4.4).
- Budynki: koszty, zużycie energii (5.1), robotnicy (6), wydajności, wzory wzrostu za poziom (8, 9), pojemności magazynów, akumulatorów, silosów, schronu, rdzenia (8.1).
- Jednostki: wszystkie z sekcji 10.1–10.3 z klasą, kosztem, statystykami, mnożnikami, prędkością, paliwem, ładownością, utrzymaniem, miejscami w hangarze, poziomem stoczni (9.2).
- Budynki obronne (11.3), technologie (9.3), rasy z modyfikatorami (3, 9.3.6, 10.8).
- Walidacja schematem (np. zod) przy starcie i w teście.
- Moduł modyfikatorów: jedna funkcja licząca efektywne statystyki jednostki i budynku z uwzględnieniem rasy i poziomów technologii. Na razie bez bonusów kontroli układu.

Testy:
- Konfiguracja przechodzi walidację.
- Testy spójności: jedna kopalnia poziomu N zasila jeden zakład przetwórczy poziomu N (4.2); koszty jednostek zgadzają się z kolumną „Wartość” (z tolerancją 1%); każda jednostka ma poziom stoczni.
- Modyfikatory: np. Kolosy +30% struktury, Rój −30% kosztu, broń ciężka poziom 5 = +15% ataku.

Poza zakresem: logika produkcji i walki.

Wykonaj blok ZAKOŃCZENIE KROKU.
```

## Krok 1.3: Generator galaktyki

```
Zrealizuj krok 1.3 z `docs/plan-budowy.md`.

Cel: deterministyczna galaktyka zgodna z sekcjami 2.1–2.3.

Zakres:
- Układy w dysku o promieniu 100 LY, minimalny odstęp 8 LY, domyślnie 60 układów (parametr).
- Trasy: graf Gabriela, obcięcie do maks. 5 połączeń, uzupełnienie do min. 2 połączeń, graf spójny.
- Układ: 3–7 planet różnych typów, min. 3 różne surowce, część układów „bogatych” (2.2). Odległości planet wewnątrz układu 1–5 LY.
- Planeta: typ, wielkość i liczba pól 8–14, złoże główne z pulą i klasą, żyzność, energia odnawialna.
- Wybór pozycji startowych: min. 60 LY po trasach od innych graczy, warunki planety startowej z sekcji 7.
- Funkcje pomocnicze: najkrótsza droga po LY (Dijkstra), odległość, lista skoków.

Testy (na 50 seedach):
- Determinizm.
- Graf spójny, stopnie 2–5.
- Długości tras 8–ok. 60 LY, średnia odległość między układami po trasach w okolicach 100 LY (tolerancja ±20%).
- Każdy układ ma min. 3 różne surowce.
- Dla 12 graczy da się znaleźć pozycje startowe spełniające warunki.

Wykonaj blok ZAKOŃCZENIE KROKU.
```

## Krok 1.4: Planeta i produkcja

```
Zrealizuj krok 1.4 z `docs/plan-budowy.md`.

Cel: gospodarka jednej planety liczona leniwie z czasu gry.

Zakres (sekcje 4–8):
- Wydobycie, przetwórstwo według przepisów, farma z żyznością, reaktor zużywający materiał rozpadowy, energia odnawialna.
- Bilans energii, akumulatory, niedobór obniżający wydajność proporcjonalnie (5).
- Populacja, robotnicy, żywność, silos, wzrost i głód (6).
- Magazyn, zatrzymanie produkcji przy pełnym magazynie, schron, rdzeń planety ze zbiorem awaryjnym (8, 8.1).
- Wyczerpywanie złóż.
- Leniwe przeliczanie: funkcja `updatePlanet(planeta, czasGry)`. Ponieważ produkcja zmienia się skokowo (magazyn się zapełnia, akumulator się rozładowuje, żywność się kończy), licz od zdarzenia do zdarzenia: wyznacz najbliższy „punkt zmiany” i całkuj odcinkami. Nie licz co tick.
- Planeta startowa z sekcji 7 jako funkcja tworząca.

Testy:
- Bilans planety startowej zgadza się z sekcją 7: energia ok. +6/h, robotnicy 45 z 60, żywność +7,5/h.
- Magazyn zapełnia się po ok. 6,7 h przy poziomie 1 (8).
- Przeliczenie 10 h w jednym kroku daje ten sam wynik co 600 kroków po minucie (tolerancja zaokrągleń).
- Niedobór energii obniża produkcję proporcjonalnie, akumulator rozładowuje się najpierw.
- Głód obniża populację, rdzeń zbiera 5/h bez budynków.
- Brak wartości ujemnych i NaN w żadnym scenariuszu.

Wykonaj blok ZAKOŃCZENIE KROKU.
```

## Krok 1.5: Budowa i ulepszenia budynków

```
Zrealizuj krok 1.5 z `docs/plan-budowy.md`.

Zakres (sekcja 9):
- Komendy: `StartBuilding`, `StartUpgrade`, `CancelConstruction` (zwrot części kosztu, ustal i zapisz decyzję w PROGRESS).
- Walidacja: wolne pola, zasoby, koszt mieści się w magazynie, wymagania (np. giełda wymaga kosmoportu 3, laboratorium wymaga stoczni 2), jedna budowa naraz na planetę.
- Czas i koszt wg wzorów (5 min ×1,8; koszt ×1,6).
- Zakończenie budowy jako zdarzenie w kolejce.
- Komunikaty błędów po polsku.

Testy: wzory czasu i kosztu dla poziomów 1, 5, 10; odrzucenie przy braku pól, zasobów, wymagań; anulowanie; budowa kończy się w dokładnym czasie gry.

Wykonaj blok ZAKOŃCZENIE KROKU.
```

## Krok 1.6: Badania

```
Zrealizuj krok 1.6 z `docs/plan-budowy.md`.

Zakres (sekcja 9.3):
- Laboratorium, limit poziomu technologii = 2 × poziom laboratorium, skrócenie czasu 5% za poziom, drugi slot od poziomu 5.
- 13 technologii z efektami podłączonymi do modułu modyfikatorów.
- Koszt ×1,7, czas ×1,6, płatność rozłożona w czasie badania z magazynu planety z laboratorium, wstrzymanie przy braku zasobów i wznowienie.
- Doganianie: funkcja przyjmująca średni poziom technologii serwera jako parametr (−30% / −50%).
- Rabaty ras 20%.

Testy: koszty i czasy z tabeli 9.3.3; wstrzymanie i wznowienie; limit laboratorium; doganianie; efekt technologii widoczny w efektywnych statystykach.

Wykonaj blok ZAKOŃCZENIE KROKU.
```

## Krok 1.7: Klient 3D: mapa galaktyki

```
Zrealizuj krok 1.7 z `docs/plan-budowy.md`.

Cel: pierwszy widok gry. Styl według sekcji 18 specyfikacji.

Zakres:
- Symulacja (`shared`) uruchomiona w Web Workerze. Klient wysyła komendy i dostaje stan. Klient nigdy nie zmienia stanu bezpośrednio.
- Scena Three.js: układy jako świecące punkty, trasy jako linie, węzły wyróżnione, etykiety długości tras w LY (pokazywane po najechaniu lub przy zbliżeniu).
- Kamera: przesuwanie, zoom, obrót, kliknięcie w układ.
- Kolory i paleta z sekcji 18, maks. 3 akcenty naraz, płaskie cieniowanie, bez tekstur.
- Panel debug (HTML): seed, liczba układów, przycisk „nowa galaktyka”.
- Wydajność: 60 układów płynnie (cel 60 FPS na przeciętnym laptopie).

Poza zakresem: mgła wojny (wszystko widoczne przez flagę debug), widok planety.

Wykonaj blok ZAKOŃCZENIE KROKU.
```

**Do sprawdzenia przez Ciebie:** czy styl pasuje do Twojej wizji lat 80. To dobry moment, żeby poprawić wygląd, zanim powstanie więcej widoków.

## Krok 1.8: Klient: widok układu, planety i interfejs

```
Zrealizuj krok 1.8 z `docs/plan-budowy.md`.

Zakres:
- Widok układu: gwiazda, planety low-poly na orbitach, kolor wg typu planety.
- Panel planety (HTML/CSS w stylu terminala): zasoby, produkcja/h, bilans energii i żywności, populacja, pola, lista budynków z przyciskami budowy i ulepszenia, kolejka, czasy.
- Panel badań.
- Pasek czasu: pauza, ×1, ×5, ×20, ×60, aktualny czas gry.
- Panel debug: dodaj zasoby, ustaw poziom budynku, przewiń czas o X godzin.
- Błędy komend wyświetlane po polsku.
- Interfejs po polsku.

Wykonaj blok ZAKOŃCZENIE KROKU.
```

**Do sprawdzenia przez Ciebie:** zagraj 15 minut na ×60. Czy kolejność rozwoju z sekcji 7.1 ma sens? Czy coś jest nudne albo nieczytelne? Zapisz uwagi przed następnym krokiem.

## Krok 1.9: Ruch flot i paliwo

```
Zrealizuj krok 1.9 z `docs/plan-budowy.md`.

Zakres (sekcja 12.1):
- Flota jako obiekt stanu: jednostki, pozycja, cel, czas startu i przylotu (lot w linii prostej, bez tras; decyzja 3.11.2026).
- Czas = odległość w linii prostej / prędkość najwolniejszej + 3 min (wejście w nadprzestrzeń, raz na lot). Loty wewnątrz układu bez tej dopłaty.
- Paliwo = start + na LY × odległość, w obie strony przy misji z powrotem, zwrot niewykorzystanego paliwa przy odwołaniu.
- Kosmoport ogranicza liczbę flot startujących naraz. Hangary: miejsca według klasy, krążenie na orbicie przy braku miejsca.
- Komendy: `SendFleet` (z typem misji: przelot, powrót, stacjonowanie), `RecallFleet`.
- Klient: wybór celu, podgląd trasy, czasu i paliwa przed wysłaniem, floty w ruchu na mapie ze smugą.

Testy: wartości z tabeli 12.1.3 (tolerancja zaokrągleń); flota leci z prędkością najwolniejszej jednostki; brak paliwa blokuje start; zwrot paliwa przy odwołaniu; limit kosmoportu.

Wykonaj blok ZAKOŃCZENIE KROKU.
```

## Krok 1.10: Stocznia, transporty, trasy cykliczne, kolonizacja

```
Zrealizuj krok 1.10 z `docs/plan-budowy.md`.

Zakres:
- Stocznia: kolejka budowy jednostek, czas 1 min na 10 wartości, odblokowanie wg poziomu stoczni (9.2).
- Utrzymanie w żywności z planety macierzystej i kara za głód (10.4).
- Transport zasobów: załadunek, rozładunek, ładowność, czekanie na orbicie przy pełnym magazynie odbiorcy (12.2).
- Trasy cykliczne jako stałe zlecenia działające bez gracza.
- Kolonizator i zajmowanie wolnych planet (10.5).
- Klient: panel stoczni, panel transportu i tras cyklicznych, kolonizacja z mapy.

Testy: czasy budowy; utrzymanie i głód; transport w obie strony z poprawnym paliwem; trasa cykliczna wykonuje 3 kursy bez udziału gracza; kolonizacja tworzy rdzeń, 10 mieszkańców i mieszkanie.

Wykonaj blok ZAKOŃCZENIE KROKU.
```

## Krok 1.11: Mgła wojny i widok gracza

```
Zrealizuj krok 1.11 z `docs/plan-budowy.md`.

To krytyczny krok dla serwera i AI w kolejnych fazach.

Zakres (sekcja 13):
- Funkcja `getPlayerView(stan, graczId)` zwracająca WYŁĄCZNIE dane widoczne dla gracza: własne planety i floty, odkryte układy, wyniki skanów z wiekiem, floty wroga w zasięgu skanerów.
- Sonda: odkrywanie układu i skan planety. Skaner: zasięg w LY wg poziomu i technologii czujników. Dezaktualizacja skanu po 6 h (+ czujniki).
- Wykrywanie wrogich flot w zasięgu skanera i zdarzenie „ostrzeżenie”.
- Klient korzysta już tylko z `getPlayerView`, nie z pełnego stanu (flaga debug „pokaż wszystko” zostaje).

Testy: widok nie zawiera żadnych danych spoza zasięgu (test na pełnej strukturze, np. przez porównanie z listą dozwolonych identyfikatorów); wiek skanu; ostrzeżenie pojawia się w poprawnym czasie przed przylotem.

Wykonaj blok ZAKOŃCZENIE KROKU.
```

## Krok 1.12: Sojusze

```
Zrealizuj krok 1.12 z `docs/plan-budowy.md`.

Zakres (sekcja 16): tworzenie, zaproszenie, przyjęcie, opuszczenie, limit członków; pełna widoczność planet członków i wspólna mapa w `getPlayerView`; transport zasobów do sojusznika; stacjonowanie floty u sojusznika; zakaz ataku na sojusznika (walidacja przygotowana na Fazę 2); skutki opuszczenia sojuszu.

Testy: widoczność przed i po opuszczeniu; transport do sojusznika; zwrot stacjonujących flot po opuszczeniu.

Wykonaj blok ZAKOŃCZENIE KROKU.
```

## Krok 1.13: Bot ekonomiczny i symulacja bez grafiki

```
Zrealizuj krok 1.13 z `docs/plan-budowy.md`.

Cel: narzędzie, które sprawdza, czy ekonomia działa przez wiele dni gry.

Zakres:
- `packages/ai`: prosty bot ekonomiczny, który korzysta WYŁĄCZNIE z `getPlayerView` i komend (bez dostępu do pełnego stanu). Buduje według kolejności z sekcji 7.1, pilnuje energii i żywności, kolonizuje pobliskie planety.
- Skrypt CLI `pnpm sim --days 14 --players 6 --seed 1`: symulacja bez grafiki, możliwie najszybciej, raport: produkcja, liczba planet, poziomy budynków, czas do pierwszej kolonii, wąskie gardła (np. ile godzin brakowało energii).

Testy: 14 dni gry z 6 botami bez błędów, NaN i wartości ujemnych; deterministyczny wynik dla tego samego seeda; czas wykonania podany w raporcie.

Wykonaj blok ZAKOŃCZENIE KROKU.
```

**Do sprawdzenia przez Ciebie:** przeczytaj raport z symulacji. Jeśli bot po 14 dniach ma za mało albo za dużo, to pierwszy moment na strojenie liczb w konfiguracji (nie w kodzie).

**Teraz użyj promptu przeglądowego dla Fazy 1.**

---

# FAZA 2: Walka

## Krok 2.1: Silnik bitwy

```
Zrealizuj krok 2.1 z `docs/plan-budowy.md`.

Zakres (sekcje 11.1–11.2):
- Czysta funkcja `resolveBattle(atakujący, obrońcy, seed, kontekst) => raport`.
- Wzór obrażeń A×A/(A+P) × mnożnik klasy, cele na strzał, przepadanie nadmiarowych obrażeń, 8 rund, jednoczesne strzały, wycofanie po 8 rundach.
- Efektywne statystyki z modułu modyfikatorów (rasa, badania, głód).
- Mechaniki ras: Fala (Rój), Flagowiec (Kolosy), Bastion (Forteca), osłabienie ataku Kupców.
- Okręt naprawczy po bitwie.
- Raport: składy, straty po rundach, wynik, seed.

Testy:
- Determinizm dla seeda.
- Turniej z sekcji 10.6: dla każdej pary jednostek znak wyniku (kto wygrywa) musi zgadzać się z tabelą, przy budżecie 30 000 i co najmniej 20 bitwach na parę. Jeśli któryś znak się nie zgadza, opisz to w `docs/PYTANIA.md`, nie zmieniaj liczb sam.
- Pancerz nigdy nie daje zera obrażeń.

Wykonaj blok ZAKOŃCZENIE KROKU.
```

## Krok 2.2: Obrona planety i rozpoczęcie bitew

```
Zrealizuj krok 2.2 z `docs/plan-budowy.md`.

Zakres (sekcja 11.3, 15):
- Tarcza planetarna z regeneracją, budynki obronne, garnizon z hangarów, milicja.
- Bitwa uruchamiana zdarzeniem przylotu wrogiej floty, także gdy obrońca jest offline.
- Misje: atak, nalot (po łup), desant (przygotowanie), bombardowanie (przygotowanie).
- Ochrona początkowa 48 h, blokada ataku na sojusznika.

Testy: kolejność warstw obrony; regeneracja tarczy (Forteca ×2); jednostki poza planetą nie bronią; ochrona 48 h kończy się po własnym ataku.

Wykonaj blok ZAKOŃCZENIE KROKU.
```

## Krok 2.3: Grabież, desant, bombardowanie, śmierć gracza

```
Zrealizuj krok 2.3 z `docs/plan-budowy.md`.

Zakres (sekcje 11.4–11.6, 15):
- Grabież wg ładowności i priorytetów, ochrona rdzenia i schronu, łup leci z flotą.
- Status „bezbronna” i fala transportowców bez eskorty.
- Bombardowanie obniżające poziomy budynków.
- Desant: walka lądowa tym samym silnikiem, zdobycie planety ze skutkami (utrata poziomów, połowa populacji, rdzeń przechodzi na zdobywcę), zasada stolicy.
- Śmierć gracza i odrodzenie z ochroną.

Testy: każdy punkt z sekcji 11.4–11.6 osobno; scenariusz pełny: zniszczenie obrony, fala transportowców, desant, zdobycie.

Wykonaj blok ZAKOŃCZENIE KROKU.
```

## Krok 2.4: Klient: walka, raporty, ostrzeżenia

```
Zrealizuj krok 2.4 z `docs/plan-budowy.md`.

Zakres:
- Wysyłanie misji bojowych z interfejsu, ustawianie priorytetów łupu.
- Raport z bitwy (czytelna tabela strat po rundach, łup).
- Ostrzeżenie o nadlatującej flocie (pulsujący znacznik w kolorze magenta, licznik czasu).
- Dziennik zdarzeń i podsumowanie „co się stało od ostatniego wejścia”.
- Prosta wizualizacja bitwy na orbicie (linie strzałów, bez cząsteczek).

Wykonaj blok ZAKOŃCZENIE KROKU.
```

**Teraz użyj promptu przeglądowego dla Fazy 2.**

---

# FAZA 3: AI i gra jednoosobowa

## Krok 3.1: AI, warstwa operacyjna

```
Zrealizuj krok 3.1 z `docs/plan-budowy.md`.

Zakres (sekcja 23.3–23.4):
- Rozbuduj bota z kroku 1.13 do architektury trzech warstw (strategia, operacje, taktyka) z interfejsem `decide(widokGracza, czasGry) => komendy`. AI nie ma dostępu do pełnego stanu.
- Warstwa operacyjna: plany rozwoju dla każdej rasy, kolejka budowy, logistyka i trasy cykliczne, stocznia, badania.
- Harmonogram decyzji: strategia co kilka godzin gry, operacje co kilkanaście minut, taktyka przy zdarzeniach.

Testy: AI każdej rasy w 14 dni gry osiąga progi rozwoju (zapisz progi w konfiguracji testów); AI nigdy nie wysyła komendy, która nie przechodzi walidacji więcej niż X razy (wykrywanie „głupich” pętli).

Wykonaj blok ZAKOŃCZENIE KROKU.
```

## Krok 3.2: AI, strategia, zwiad, osobowości

```
Zrealizuj krok 3.2 z `docs/plan-budowy.md`.

Zakres (23.4, 23.5): ocena użyteczności celów; stały zwiad sondami i odświeżanie skanów; dobór floty pod wykrytego przeciwnika według tabeli kontr; 5 osobowości jako zestawy wag w konfiguracji.

Testy: przy wykrytym zagrożeniu AI przechodzi w zbrojenie lub obronę; flota budowana przeciw wykrytym krążownikom zawiera głównie bombowce; różne osobowości dają mierzalnie różne zachowanie (np. liczba ataków w 14 dni).

Wykonaj blok ZAKOŃCZENIE KROKU.
```

## Krok 3.3: AI, taktyka i walka

```
Zrealizuj krok 3.3 z `docs/plan-budowy.md`.

Zakres (23.4 warstwa 3): przewidywanie wyniku bitwy silnikiem walki na danych ze skanu (z niepewnością dla starych skanów); wybór celu wg łupu, odległości, paliwa i ryzyka; obrona zagrożonych planet; wycofanie; ataki wielu flot na poziomie trudnym.

Testy: AI nie atakuje celu, z którym przewiduje porażkę; broni planety, gdy wykryje atak i ma flotę w zasięgu; mecz AI przeciw AI przez 30 dni gry kończy się bez błędów i z co najmniej kilkoma bitwami.

Wykonaj blok ZAKOŃCZENIE KROKU.
```

## Krok 3.4: Tryb jednoosobowy

```
Zrealizuj krok 3.4 z `docs/plan-budowy.md`.

Zakres (23.1, 23.2, 23.6):
- Ekran nowej gry: rasa, liczba i trudność przeciwników, osobowości (losowe lub wybrane), rozmiar galaktyki, seed.
- Poziomy trudności z sekcji 23.6 jako konfiguracja.
- Zapis i wczytanie gry (IndexedDB), eksport i import do pliku. Zapis zawiera seed, stan i wersję formatu.
- Warunki końca: zwycięstwo (np. kontrola X% galaktyki lub eliminacja AI, do ustalenia w ustawieniach) i porażka.
- Menu główne.

Testy: zapis i wczytanie daje identyczny stan; gra wczytana i kontynuowana jest deterministyczna.

Wykonaj blok ZAKOŃCZENIE KROKU.
```

**Do sprawdzenia przez Ciebie:** to pierwsza grywalna wersja. Zagraj kilka gier na różnych poziomach trudności i różnymi rasami. Zapisz, co jest za łatwe, za trudne, nudne lub niezrozumiałe.

## Krok 3.5: Turniej AI i raport balansu

```
Zrealizuj krok 3.5 z `docs/plan-budowy.md`.

Zakres (23.10): CLI `pnpm tournament --games 100 --days 30` rozgrywające gry AI przeciw AI bez grafiki, równolegle; raport CSV i podsumowanie: zwycięstwa ras, najczęściej budowane jednostki, czas do pierwszej utraconej planety, przebieg ekonomii, technologie.

Testy: turniej z tym samym seedem daje ten sam raport.

Wykonaj blok ZAKOŃCZENIE KROKU.
```

**Teraz użyj promptu przeglądowego dla Fazy 3.** Po nim przejrzyj raport balansu. Ewentualne zmiany liczb wprowadzaj w konfiguracji i zapisuj w specyfikacji.

---

# FAZA 4: Serwer i gra z ludźmi

## Krok 4.1: Serwer autorytatywny

```
Zrealizuj krok 4.1 z `docs/plan-budowy.md`.

Zakres:
- `packages/server` (Node + TypeScript). Uzasadnij wybór: Colyseus albo czysty WebSocket (`ws`).
- Ta sama symulacja z `shared`, zegar gry z mnożnikiem ustawianym przy tworzeniu świata (bez zmian w trakcie).
- Klient wysyła komendy, serwer waliduje i odsyła każdemu graczowi tylko zmiany w jego `getPlayerView`.
- Trwałość: SQLite na start (migracja do Postgresa możliwa później): migawki stanu plus dziennik komend, odtwarzanie po restarcie.
- Klient potrafi działać w dwóch trybach: lokalnym (Web Worker) i sieciowym.

Testy: restart serwera w trakcie gry nie traci stanu; dwóch klientów widzi tylko swoje dane; komenda niepoprawna jest odrzucana po stronie serwera, nawet jeśli klient ją przepuścił.

Wykonaj blok ZAKOŃCZENIE KROKU.
```

## Krok 4.2: Konta, świat, dołączanie, AI na serwerze

```
Zrealizuj krok 4.2 z `docs/plan-budowy.md`.

Zakres: proste konta z zaproszeniami (link od administratora), wybór rasy, dołączanie do świata z progiem 70% (15), pozycje startowe, odrodzenie, frakcje AI na serwerze (23.9), tryb kooperacji przeciw AI (23.7).

Testy: przekroczenie progu blokuje dołączanie; odrodzenie; AI liczy się do progu.

Wykonaj blok ZAKOŃCZENIE KROKU.
```

## Krok 4.3: Panel administratora

```
Zrealizuj krok 4.3 z `docs/plan-budowy.md`.

Zakres: reset świata, nowy seed, konta i zaproszenia, podgląd całego stanu, ręczne dodawanie zasobów, dodawanie i usuwanie AI, kopia zapasowa na żądanie. Dostęp tylko dla administratora.

Wykonaj blok ZAKOŃCZENIE KROKU.
```

## Krok 4.4: Powiadomienia

```
Zrealizuj krok 4.4 z `docs/plan-budowy.md`.

Zakres (17): klient jako PWA, powiadomienia push w przeglądarce i na telefonie (Web Push), e-mail dla zdarzeń krytycznych (wybierz dostawcę i opisz konfigurację), ustawienia powiadomień gracza.

Wykonaj blok ZAKOŃCZENIE KROKU.
```

## Krok 4.5: Wdrożenie na jeden serwer

```
Zrealizuj krok 4.5 z `docs/plan-budowy.md`.

Zakres: Dockerfile i docker-compose, HTTPS (np. Caddy), automatyczne kopie zapasowe bazy, instrukcja krok po kroku po polsku w `docs/WDROZENIE.md` dla osoby, która stawia serwer pierwszy raz (np. tani VPS).

Wykonaj blok ZAKOŃCZENIE KROKU.
```

**Do sprawdzenia przez Ciebie:** zaproś 2–3 znajomych na test z mnożnikiem czasu ×4, żeby szybciej zobaczyć przebieg gry.

---

# FAZA 5: Mechaniki zaawansowane

## Krok 5.1: Blokady i przechwytywanie — USUNIĘTY (decyzja właściciela 3.11.2026)

Nie ma tras ani blokad (pytanie 32 w `docs/PYTANIA.md`). Krok pozostaje tylko jako zapis historii; nie realizujemy go.

```
Zrealizuj krok 5.1 z `docs/plan-budowy.md`.

Zakres (12.3): tryb blokady floty w układzie, przechwytywanie przelotów na podstawie czasów przelotu zapisanych w kroku 1.9, przejęcie ładunku, eskorty, stacja orbitalna (blokada stała). Wsparcie AI dla blokad na trudnym poziomie.

Testy: flota przelatująca przez zablokowany układ walczy w poprawnym momencie; ładunek przechodzi na zwycięzcę.

Wykonaj blok ZAKOŃCZENIE KROKU.
```

## Krok 5.2: Kontrola układów i zasięg administracji

```
Zrealizuj krok 5.2 z `docs/plan-budowy.md`.

Zakres (2.4, 14): kontrola 50% i 100% (także dla sojuszu), bonusy produkcji, darmowy transport wewnątrz układu, zasięg administracji w LY, centrum administracyjne. Podłącz do modułu modyfikatorów i do AI.

Wykonaj blok ZAKOŃCZENIE KROKU.
```

## Krok 5.3: Rynek i giełda handlowa

```
Zrealizuj krok 5.3 z `docs/plan-budowy.md`.

Zakres (12.4): budynek giełdy i jego poziomy, oferty wymiany zasobu na zasób, rezerwacja towaru, opłaty, wygasanie, wymiana przy przylocie transportu kupującego, ryzyko przechwycenia, bonus Kupców, interfejs rynku z kosztem paliwa. AI potrafi sprzedawać nadwyżki.

Testy: rezerwacja chroni przed grabieżą; zniszczenie giełdy zamyka oferty; pełny cykl wymiany.

Wykonaj blok ZAKOŃCZENIE KROKU.
```

## Krok 5.4: Obrona przed inwazją

```
Zrealizuj krok 5.4 z `docs/plan-budowy.md`.

Zakres (23.8): frakcja Najeźdźców, fale rosnące o 15%, zmienny skład fal, wejście od krawędzi galaktyki, wraki do zebrania, warunki końca trybu.

Wykonaj blok ZAKOŃCZENIE KROKU.
```

**Teraz użyj promptu przeglądowego dla Fazy 5.**

---

# FAZA 6: Balans i skalowanie

## Krok 6.1: Telemetria

```
Zrealizuj krok 6.1 z `docs/plan-budowy.md`.
Zakres: zbieranie anonimowych statystyk z gier (bitwy, budowane jednostki, tempo rozwoju) na serwerze i w turniejach AI, panel z wykresami w panelu administratora.
Wykonaj blok ZAKOŃCZENIE KROKU.
```

## Krok 6.2: Testy obciążeniowe

```
Zrealizuj krok 6.2 z `docs/plan-budowy.md`.
Zakres: serwer z 200 frakcjami AI i większą galaktyką, pomiar CPU, pamięci i opóźnień, profilowanie i optymalizacja wąskich gardeł. Raport w `docs/WYDAJNOSC.md`.
Wykonaj blok ZAKOŃCZENIE KROKU.
```

## Krok 6.3: Strojenie liczb

```
Zrealizuj krok 6.3 z `docs/plan-budowy.md`.
Zakres: na podstawie raportów turniejów i telemetrii zaproponuj zmiany wartości oznaczonych [TEST] w specyfikacji. NIE wprowadzaj ich od razu. Przedstaw listę zmian z uzasadnieniem i przewidywanym efektem, poczekaj na moją zgodę, potem zmień konfigurację i specyfikację razem.
Wykonaj blok ZAKOŃCZENIE KROKU.
```

---

# Prompty pomocnicze

## Prompt przeglądowy (po każdej fazie)

```
Faza [NUMER] jest zakończona. Zrób przegląd, ale niczego jeszcze nie zmieniaj w logice gry:

1. Porównaj kod ze specyfikacją `docs/specyfikacja.md` dla wszystkich sekcji tej fazy. Wypisz każdą rozbieżność.
2. Sprawdź zasady z `CLAUDE.md`: czyste funkcje w `shared`, brak zegara systemowego i Math.random, liczby tylko w konfiguracji, jeden moduł modyfikatorów, AI tylko przez `getPlayerView`.
3. Znajdź brakujące testy dla reguł gry.
4. Wskaż miejsca kodu trudne do rozbudowy w kolejnych fazach.
5. Uruchom `pnpm check` i (od kroku 1.13) `pnpm sim --days 14`.
6. Przedstaw raport z listą proponowanych poprawek, podzieloną na: błędy, dług techniczny, braki testów.

Poczekaj na moją decyzję, które poprawki wprowadzić.
```

## Prompt naprawczy (gdy coś nie działa)

```
Mam problem: [OPIS: co robiłem, co się stało, czego oczekiwałem, ewentualny komunikat błędu].

1. Najpierw napisz test, który odtwarza ten błąd i nie przechodzi.
2. Znajdź przyczynę i wyjaśnij ją po polsku w 2–3 zdaniach.
3. Napraw ją możliwie najmniejszą zmianą. Nie przebudowuj niezwiązanego kodu.
4. Uruchom `pnpm check`.
5. Dopisz notatkę do `docs/PROGRESS.md` i zrób commit „fix: ...”.
```

## Prompt zmiany zasad gry

```
Chcę zmienić zasadę gry: [OPIS ZMIANY].

1. Pokaż, których sekcji specyfikacji i których plików kodu oraz konfiguracji to dotyczy.
2. Opisz skutki uboczne dla balansu i innych mechanik (np. AI, walka, ekonomia).
3. Poczekaj na moją zgodę.
4. Po zgodzie zaktualizuj RAZEM: specyfikację (z wpisem w sekcji 0 „Zmiany”), konfigurację, logikę, testy i AI.
```

## Prompt kontynuacji (nowa sesja)

```
Wracamy do pracy nad Galactic Empire. Przeczytaj `CLAUDE.md`, `docs/PROGRESS.md` i `docs/PYTANIA.md`. Powiedz w 3–5 punktach, gdzie jesteśmy, jaki jest następny krok z `docs/plan-budowy.md` i czy są otwarte pytania, które blokują pracę. Nie zaczynaj pracy, dopóki nie potwierdzę.
```

---

## Dobre praktyki dla Ciebie

- **Jedna sesja Claude Code na jeden krok** (albo `/clear` między krokami). Długie sesje gubią kontekst. Ciągłość zapewniają `CLAUDE.md` i `docs/PROGRESS.md`.
- **Commit po każdym kroku.** Jeśli krok pójdzie źle, wracasz do ostatniego dobrego stanu (`git reset --hard`, po upewnieniu się, że nic nie tracisz).
- **Zmiany liczb rób w konfiguracji i w specyfikacji jednocześnie** (prompt zmiany zasad gry).
- **Nie pomijaj „Do sprawdzenia przez Ciebie”.** Testy sprawdzają, czy kod robi to, co napisano. Tylko Ty sprawdzisz, czy gra jest fajna.
- Jeśli krok wydaje się za duży (Claude Code pracuje bardzo długo albo robi błędy), poproś: „Podziel krok X na mniejsze części i zrealizuj tylko pierwszą”.
