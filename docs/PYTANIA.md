# Pytania do specyfikacji

Lista sprzeczności, braków i niejasności znalezionych w `docs/specyfikacja.md` (wersja 2.7). Każde pytanie ma **propozycję**: jeśli się zgadzasz, wystarczy napisać „przyjmuję propozycje” (całość albo numery). Odpowiedzi wpisujemy pod pytaniem jako **Odpowiedź**, a zmiany zasad trafiają też do specyfikacji.

Oznaczenia: 🔴 blokuje najbliższe kroki (1.2–1.5), 🟡 potrzebne później, 🟢 drobne.

Co się zgadza (przeliczone): wartości wszystkich jednostek i budynków obronnych (koszt × wartości zasobów z 10.0), utrzymanie ≈ 2% wartości dziennie, czasy budowy jednostek, tabela lotów 12.1.3, przykład nalotu 11.5.1, koszty i czasy badań 9.3.3, zwrot z ulepszenia kopalni, zużycie energii planety startowej (108,75/h przy 115/h produkcji), robotnicy 45/60, żywność 30/h, czas pracy reaktora (2 000 / 10 = 8,3 dnia), zasięg skanera i czasy ostrzeżeń w sekcji 13, odbudowa z rdzenia po 30 h.

---

## Ekonomia planety i budynki

### 1. 🔴 Planeta startowa ma trzy kopalnie różnych surowców, a planeta ma jedno złoże
Sekcja 2.3: każda planeta ma jedno złoże główne. Sekcja 7: planeta startowa ma kopalnie metalu, lodu i tytanu. Skąd biorą się trzy surowce na jednej planecie?
**Propozycja:** planeta startowa to wyjątek: ma złoże główne (metal) i dwa złoża poboczne (lód, tytan) o klasie „uboga”/„średnia”. Ogólnie: planeta może mieć 0–2 złoża poboczne mniejsze od głównego; kopalnia jest zawsze przypisana do jednego złoża. (Alternatywa: kopalnie lodu i tytanu planety startowej wydobywają z innych planet tego układu, ale to komplikuje model.)

**Odpowiedź (3.11.2026):** każda planeta ma złoża trzech surowców (oraz biomasę, która wraca jako kolejny, wytwarzany zasób). Planeta przoduje w jednym z nich: tego jest więcej i wydobycie jest wydajniejsze. Pytanie uzupełniające 1a niżej.

### 2. 🔴 Koszty budowy poszczególnych budynków
Sekcja 9 podaje tylko „100 jednostek na poziom 1→2 (różne zasoby zależnie od budynku), ×1,6 za poziom”. Brakuje: kosztu postawienia budynku (poziom 0→1), podziału na zasoby dla każdego budynku i czasu budowy poziomu 1. Sekcja 8.1 mówi z kolei, że najtańszy budynek poziomu 1 kosztuje 150.
**Propozycja:** postawienie budynku (poziom 1) kosztuje 150 jednostek i trwa 5 min; ulepszenie do poziomu L ≥ 2 kosztuje 100 × 1,6^(L−2) (do poz. 2: 100, zgodnie z sekcją 9). Podział zasobów — tabela, którą przygotuję w kroku 1.2 do Twojej akceptacji (np. kopalnia: 2/3 metalu + 1/3 krzemu; huta: metal + tytan; budynki wojskowe ze stopami). Ważniejsze budynki (stocznia, laboratorium, generator tarczy, giełda) mają mnożnik kosztu poziomu 1 (giełda ma już podane 400 stopów + 100 komponentów).

**Odpowiedź (3.11.2026):** zadanie dla Claude: przeliczyć koszty wszystkich budynków tak, żeby koszt i czas rosły stopniowo i gra była zbalansowana (gracz nie może wydać wszystkiego naraz, musi planować). Robimy to w kroku 1.2b (narzędzie liczące i tabela do akceptacji).

### 3. 🔴 Numeracja poziomów w czasach ulepszeń
„Poziom 5 to ok. 52 min, poziom 10 to ok. 16,5 h” zgadza się z wzorem 5 × 1,8^(N−1) tylko wtedy, gdy „poziom N” oznacza ulepszenie N→N+1. Wtedy 16,5 h to ulepszenie 10→11, a maksymalny poziom to 10. Przy liczeniu „ulepszenie na poziom N” czasy to 29 min (→5) i 9,2 h (→10).
**Propozycja:** czas ulepszenia do poziomu L = 5 min × 1,8^(L−2) (do poz. 2: 5 min, do 5: 29 min, do 10: 9,2 h); tekst w specyfikacji poprawić. Analogicznie zwrot z kopalni „6,7 h na poziomie 1” zostaje (ulepszenie 1→2).

**Odpowiedź:** w ramach balansu z pytania 2 (krok 1.2b). Wzory w specyfikacji zostaną ujednolicone tak, żeby poziomy liczyły się jednoznacznie.

### 4. 🔴 Wzrost wydajności z poziomem dla innych budynków niż kopalnia
Podano: kopalnia ×1,25, magazyn/akumulator/silos/schron/tarcza ×1,3, mieszkanie +20, hangar +10, reaktor +100, skaner +10 LY. Brakuje dla: rafinerii, huty, warsztatu, farmy (z przykładu „farma poz. 2 = 37,5/h” wynika ×1,25), energii odnawialnej (15/h stałe czy rośnie?), kosmoportu (czas załadunku), stoczni (czy wyższy poziom przyspiesza budowę?), laboratorium (−5% czasu badań za poziom jest).
**Propozycja:** przetwórstwo i farma ×1,25 za poziom (zgodnie z zasadą „jedna kopalnia = jeden zakład tego samego poziomu”); energia odnawialna 15/h × 1,25 za poziom; stocznia: −5% czasu budowy jednostek za poziom ponad wymagany; reaktor zużywa 10 materiału na każde 100 energii (liniowo, jak w tabeli).

**Odpowiedź (3.11.2026):** zadanie dla Claude: zbalansować wzrost wydajności rafinerii, huty, warsztatu, farmy i energii odnawialnej (krok 1.2b), tak żeby rozbudowa wymagała nadzoru i planowania.

### 5. 🔴 Pojemność rdzenia a magazyn i zasoby startowe
(a) Czy rdzeń (150) dodaje się do magazynu (400 → razem 550), czy jest osobnym „schowkiem”, z którego korzysta się tylko gdy magazyn jest pusty/zniszczony? Tabela „pełny po 6,7 h” zakłada 400.
(b) Zasoby startowe to 400 każdego surowca, czyli pełny magazyn poziomu 1: kopalnie od pierwszej minuty stoją.
**Propozycja:** (a) pojemność = magazyn + rdzeń (rdzeń to pierwsze 150 każdego zasobu, chronione przed grabieżą); tabela 8 dotyczy samego magazynu. (b) start bez zmian: 400 surowców wystarcza akurat na akumulator, silos i magazyn (kolejność 7.1), więc magazyn szybko się zwalnia — to dobry samouczek. Daj znać, jeśli wolisz np. 250 na start.

**Odpowiedź (3.11.2026):** gracze NIE startują z 400 surowców. Magazyn startowy jest pusty, kopalnie muszą najpierw nakopać surowce. Pytanie uzupełniające 5a niżej.

**Odpowiedź (a), 3.11.2026:** pojemność rdzenia **dodaje się** do magazynu (i do silosów i akumulatorów): pojemność = rdzeń + budynki. Zawartość rdzenia jest chroniona przed grabieżą.

### 6. 🔴 Ile budynków jednego typu na planecie i ile pól zajmują
Czy na planecie może stać kilka kopalni tego samego złoża, kilka hut, kilka mieszkań (planeta startowa ma 3 mieszkania), kilka magazynów? Czy każdy budynek zajmuje 1 pole? Planeta startowa ma 16 budynków, a planeta ma 8–14 pól.
**Propozycja:** każdy budynek zajmuje 1 pole, poza: mieszkanie, magazyn, akumulator, silos, schron, kopalnia, farma, energia odnawialna mogą stać wielokrotnie; stocznia, kosmoport, laboratorium, skaner, generator tarczy, giełda, centrum administracyjne raz na planetę. Planeta startowa ma 16 budynków, więc przy 8–14 polach się nie zmieści. Proponuję: **planeta startowa ma 20 pól** (4 wolne na akumulator, silos, magazyn i jeszcze jeden budynek), pozostałe planety 8–14. Alternatywa: kosmoport i hangar są orbitalne i nie zajmują pól (wtedy startowa potrzebuje 14 + wolne).

**Odpowiedź (3.11.2026):** planeta startowa ma 16 pól (slotów) i gracz sam wybiera, co na nich buduje. Pytanie uzupełniające 6a niżej.

### 7. 🟡 Populacja: wzrost, przydział robotników, częściowa obsada
„Rośnie o 10% na godzinę” — 10% obecnej populacji czy pojemności? Gdy robotników jest za mało, które budynki stają? Czy budynek z 3 z 5 robotników działa na 60%?
**Propozycja:** +10% obecnej populacji na godzinę (min. +1); obsada częściowa daje wydajność proporcjonalną; robotnicy przydzielani według priorytetu: farma, reaktor, kopalnie, przetwórstwo, kosmoport, stocznia, skaner, laboratorium, giełda (gracz może później zmienić kolejność).

### 8. 🟡 Gazowy gigant: robotnicy bez mieszkań
Na gazowym gigancie nie da się budować mieszkań, a kopalnia potrzebuje 5 robotników.
**Propozycja:** kolonizacja gazowego giganta daje 10 mieszkańców w stacji orbitalnej rdzenia (bez wzrostu), więc 2 budynki z obsługą; więcej robotników nie ma. Albo: budynki na gazowym gigancie nie potrzebują robotników (automaty). Proponuję drugie — prostsze.

### 9. 🟡 Kopalnia materiału rozpadowego i krzemu na planecie startowej
Startowy reaktor ma 2 000 materiału „poza magazynem”. Czy później reaktor ładuje się z magazynu (wtedy 10/h × poziom pobierane jak każdy surowiec)?
**Propozycja:** tak: najpierw zużywa wkład startowy, potem materiał z magazynu planety.

### 10. 🟢 Energia: czy reaktor i energia odnawialna zużywają energię i robotników
Tabela 5.1 nie zawiera reaktora ani paneli. Rachunek planety startowej (108,75/h) zgadza się tylko bez nich, więc przyjmuję: nie zużywają energii; reaktor ma 5 robotników (sekcja 6), panele 0. Do potwierdzenia.

## Jednostki i walka

### 11. 🔴 (dla kroku 2.1) Mnożnik klasy liczony dwa razy?
Sekcja 11.1: „obrażenia = A × A / (A + P) × mnożnik klasy”, „A to atak (po mnożniku klasy)”. Jeśli A już zawiera mnożnik, to mnożymy go drugi raz.
**Propozycja:** A = atak bazowy (z badaniami i rasą), mnożnik klasy raz na końcu. W kroku 2.1 i tak sprawdzimy obie wersje turniejem z tabeli 10.6 i wybierzemy tę, która odtwarza wyniki.

**Odpowiedź (3.11.2026):** do rozważenia. Zostaje otwarte do kroku 2.1, gdzie turniej z tabeli 10.6 pokaże, która wersja wzoru odtwarza wyniki.

### 12. 🟡 Kolosy: „+25% tytanu” a jednostki nie kosztują tytanu
Koszty jednostek to stopy i komponenty.
**Propozycja:** Kolosy płacą +30% kosztu, a dodatkowo 25% wartości kosztu zamieniane jest na tytan (np. krążownik: 700 stopów → 700 stopów + ok. 260 tytanu). Albo usunąć zapis. Do decyzji.

### 13. 🟡 Rój: −20% struktury a mniej wartości
Bez pytania, tylko notatka: sprawdzimy turniejem w kroku 2.1, czy Rój ma podobną siłę na budżet jak inne rasy.

### 14. 🟡 Tarcze okrętowe: „+2% struktury (pole siłowe pochłaniające pierwsze trafienia)”
To po prostu +2% struktury, czy osobna pula odnawiana co bitwę?
**Propozycja:** po prostu +2% struktury (prościej, zgodnie z symulacją 9.3.4).

### 15. 🟡 Ładowność a miejsca dla jednostek lądowych
Transportowiec: 500 ładowności **albo** 4 miejsca. Czy można mieszać (np. 2 miejsca + 250)?
**Propozycja:** proporcjonalnie: 1 miejsce = 125 ładowności.

## Ruch, skanery, mapa

### 16. 🟡 Zasięg skanera: w linii prostej czy po trasach?
Floty lecą po trasach, a skaner ma zasięg w LY.
**Propozycja:** w linii prostej w przestrzeni (prościej i bardziej intuicyjnie na mapie); flota w locie ma pozycję interpolowaną na trasie.

### 17. 🟢 Tabela 12.1.4 pomija 3 min za skok
Czas w obie strony dla 10 LY to 30 min wg tabeli, a ze wzoru 36 min (2 × (15 + 3)). Pozostałe wiersze też bez skoków.
**Propozycja:** wzór z 12.1.1 jest nadrzędny, tabelę poprawię w specyfikacji (czasy wzrosną o kilka-kilkanaście minut). Dodatkowo nie zdefiniowano czasu załadunku w kosmoporcie — proponuję 10 min na poziomie 1, −10% za poziom.

### 18. 🟢 Graf tras: maks. 5 połączeń vs dodawanie brakujących
Obcinanie grafu Gabriela do 5 połączeń może rozspójnić graf, a dodanie drugiego połączenia może dać komuś 6.
**Propozycja:** obcinaj najdłuższe krawędzie tylko jeśli nie rozspójniają grafu; uzupełniając do 2, wybieraj sąsiada mającego < 5 połączeń. Test na 50 seedach.

### 19. 🟢 „Stały tick 10/s” w sekcji 19 a leniwe liczenie
Plan budowy mówi o kolejce zdarzeń i leniwym przeliczaniu (bez ticków).
**Propozycja:** symulacja bez ticków (zdarzenia + leniwe przeliczanie); klient odświeża widok np. 10 razy na sekundę. Zapis „stały tick” usunąć ze specyfikacji.

### 20. 🟢 Odległość planet w układzie a mapa
Planety jednego układu dzielą 1–5 LY, a minimalny odstęp układów to 8 LY. Orbity mogą wyglądać na prawie tak duże jak odstęp do sąsiada. Na mapie galaktyki układ to punkt; w widoku układu orbity skalujemy osobno. Bez decyzji, tylko notatka.

## Badania

### 21. 🟡 Z której planety płacimy za badania i który poziom laboratorium się liczy (rozstrzygnięte w 31)
Gracz może mieć laboratoria na kilku planetach.
**Propozycja:** badanie uruchamia się na wybranej planecie z laboratorium; płaci jej magazyn, a limit i skrócenie czasu wynikają z jej laboratorium. Drugi slot (laboratorium 5) też liczy się na tej planecie.

### 22. 🟡 Doganianie: średnia „aktywnych graczy” w grze jednoosobowej (rozstrzygnięte w 31)
**Propozycja:** w grze jednoosobowej średnia liczy się ze wszystkich frakcji (gracz + AI).

## Gracze, sojusze, tryby

### 23. 🟡 Odrodzenie po przekroczeniu 70% (sekcja 15, [DO DECYZJI])
**Propozycja:** jak w specyfikacji: zmarły gracz ma pierwszeństwo i odradza się, jeśli istnieje wolny układ spełniający warunki startu.

### 24. 🟡 Warunki zwycięstwa w grze jednoosobowej (krok 3.4)
Specyfikacja mówi „gra nie ma końca”, plan budowy wymaga zwycięstwa.
**Propozycja:** do wyboru przy nowej grze: kontrola 50% układów, eliminacja wszystkich AI albo bez końca.

### 25. 🟢 Utrzymanie jednostek: co z głodem populacji
„Populacja planety ma pierwszeństwo do żywności” — czyli jednostki głodują, zanim populacja zacznie spadać. Przyjmuję tak, notatka.

### 26. 🟢 Ochrona 48 h a gra jednoosobowa
**Propozycja:** w grze jednoosobowej ochrona dotyczy też AI (AI nie atakuje przez pierwsze 48 h gry), ustawialna przy nowej grze.

### 27. 🟢 Nazewnictwo w kodzie
Proponuję angielskie identyfikatory: rasy `merchants`, `swarm`, `colossi`, `fortress`; zasoby `deuterium`, `metal`, `titanium`, `silicon`, `fissile`, `fuel`, `alloy`, `components`, `food`, `energy`. Teksty w interfejsie po polsku.

### 28. 🟢 Wersje gry i gałęzie
Zgodnie z Twoją prośbą: każdy krok trafia na nową gałąź (`v0.1.0-szkielet` itd., szczegóły w `CLAUDE.md`). Czy `main` ma być co jakiś czas aktualizowany (scalam ostatnią sprawdzoną wersję), czy zostawiamy go z samym README?
**Propozycja:** po Twoim sprawdzeniu wersji scalam ją do `main`, więc `main` = ostatnia zaakceptowana wersja.

---

## Pytania uzupełniające (po odpowiedziach z 3.11.2026)

### 1a. 🔴 Które trzy surowce ma każda planeta i czym jest biomasa
(a) Czy „te trzy” to metal, lód deuterowy i tytan (kopalnie z planety startowej)? Co wtedy z krzemem (komponenty) i materiałem rozpadowym (reaktor): zostają tylko na planetach pustynnych i radioaktywnych jako ich złoże wiodące?
**Propozycja:** każda planeta ma złoża metalu, lodu i tytanu; typ planety wyznacza złoże wiodące (bogate, ×1,4 i duża pula), pozostałe dwa są ubogie (×0,7, mała pula). Krzem i materiał rozpadowy występują tylko jako złoża wiodące planet pustynnych i radioaktywnych (cel ekspansji). Gazowy gigant: wiodący lód, oceaniczna i zielona: wiodąca biomasa.
(b) Biomasa: specyfikacja 2.0 zamieniła ją na żyzność. Czy biomasa ma być magazynowanym surowcem produkowanym przez farmę (z żyzności), z którego potem powstaje żywność (np. w przetwórni) i może coś jeszcze (np. paliwo bio, plastik)? Czy po prostu tak nazywamy żywność?
**Propozycja:** farma produkuje biomasę (z żyzności), przetwórnia żywności zamienia 2 biomasy → 1 żywność; biomasa może też zasilać reaktor biomasowy na planetach bez materiału rozpadowego. Do decyzji.

**Odpowiedź (3.11.2026):**
- Każda planeta ma surowce podstawowe, wystarczające do zbudowania podstawowej floty. Planeta specjalizuje się w jednym dodatkowym surowcu (albo jest bogata w któryś z podstawowych, to inny przypadek).
- Do dalszej rozbudowy trzeba podbijać planety z lepszymi surowcami. Złoża się wyczerpują; gracz widzi, ile zostało i jak szybko można je wydobyć.
- Biomasa = zasób żywności. Farma wytwarza biomasę (na bieżąco, podobnie jak energię), z niej żyje populacja. W kodzie: zasób `biomass` zamiast osobnej „żywności”.
- Pomysły na przyszłe rasy (nie teraz, do rozwinięcia): rasa robotów bez potrzeby biomasy, za to z dużym zużyciem energii; rasa budująca statki organiczne, dla której biomasa jest podstawowym materiałem, a energii potrzebuje mało. Dlatego koszty i utrzymanie w konfiguracji mają być ogólne (dowolny zasób), nie na sztywno „żywność”.

**Pytanie 1b (🟡, do kroku 1.2a):** które surowce są podstawowe? Podstawowa flota (przechwytywacz, myśliwiec) kosztuje stopy (metal + tytan) i komponenty (krzem + stop), a lot wymaga paliwa (lód).
**Propozycja:** podstawowe na każdej planecie (ubogie złoża): metal, lód, tytan, krzem. Specjalizacja to jedno bogate złoże: albo któryś z podstawowych (skalista = metal, lodowa/gazowy gigant = lód, wulkaniczna = tytan, pustynna = krzem), albo surowiec specjalny dostępny tylko przez specjalizację: materiał rozpadowy (radioaktywna) i 1–2 nowe surowce rzadkie (do ustalenia, np. kryształy dla tarcz i pancerników, egzotyczna materia dla wysokich technologii). Wysokie poziomy budynków i najcięższe jednostki wymagają surowców specjalnych → trzeba podbijać.

**Stan (3.11.2026):** właściciel poprosił o propozycję surowców specjalnych; jest w `docs/SUROWCE.md` (do akceptacji).

### 5a. 🔴 Czym gracz startuje
Skoro magazyn jest pusty: czy zostają startowe 200 paliwa, 100 stopów, 2 sondy i 1 transportowiec? Czy rdzeń ma na starcie zapas (np. po 150 w rdzeniu), żeby pierwsza budowa nie czekała kilku godzin?
**Propozycja:** start: pusty magazyn, pełny rdzeń (po 150 surowców, 100 energii, 100 żywności), 2 sondy, bez transportowca i paliwa. Pierwszy budynek da się postawić od razu z rdzenia, kolejne po ok. 1–2 h wydobycia.

**Odpowiedź (3.11.2026):** magazyn pusty. Rdzeń planety powoli zbiera surowce („coś kropi”), aż uzbiera się na pierwszy budynek. Czy coś daje się na start (sondy), ustalimy w balansie (krok 1.2b).

### 6a. 🔴 Co stoi na planecie startowej na początku
Czy gracz zaczyna z pustymi 16 polami (wtedy działa tylko zbiór awaryjny rdzenia, 5/h) czy z zestawem startowym, który może potem przebudować?
**Propozycja:** gracz zaczyna z małym zestawem zajmującym 7 z 16 pól: kopalnia wiodącego surowca, kopalnia lodu, farma, mieszkanie, reaktor, panel słoneczny, magazyn (wszystko poziom 1). Pozostałe 9 pól (huta, rafineria, stocznia, kosmoport, hangar, akumulator, silos...) gracz wybiera sam. Budynki można burzyć, żeby zwolnić pole.

**Odpowiedź (3.11.2026):** na starcie 16 pustych pól. Gracz od początku sam decyduje, co zbudować pierwsze: kopalnię, magazyn, farmę biomasy... Rdzeń zbiera minimalne ilości także bez budynków.
Uwaga do balansu (krok 1.2b): przy obecnym zbiorze rdzenia (5/h) i najtańszym budynku 150 pierwsza budowa zajęłaby 30 h gry. Dobiorę tempo zbioru rdzenia stolicy i koszt pierwszych budynków tak, żeby pierwszy budynek był po kilkudziesięciu minutach, a kolejne coraz szybciej dzięki kopalniom.

### 29. 🟡 12 graczy w galaktyce 60 układów
Plan budowy (krok 1.3) wymaga 12 pozycji startowych co najmniej 60 LY od siebie (spec 15), a specyfikacja (2.1) daje 60 układów. Symulacja na 50 ziarnach: 60 układów mieści zwykle 10–11 takich pozycji (najlepszy znaleziony układ, czasem 9).
**Rozwiązanie przyjęte w kroku 1.3 (do potwierdzenia):** domyślnie 60 układów (do ok. 10 graczy); większa gra dostaje większą galaktykę o tej samej gęstości: `systemsFor(gracze)` = max(60, 7 × gracze), np. 84 układy dla 12 graczy (zawsze 12 pozycji). Alternatywy: zmniejszyć odstęp startowy do ok. 50 LY albo zwiększyć gęstość układów.

**Odpowiedź (3.11.2026):** zaakceptowane: 60 układów domyślnie, większa galaktyka o tej samej gęstości dla większej liczby graczy.

**Zmiana po decyzji o lotach bezpośrednich (pytanie 32):** odległości w linii prostej są krótsze niż po trasach, więc 60 układów mieści co najmniej 8 graczy; przelicznik to teraz 8 układów na gracza (96 dla 12).

### 30. 🟢 Zwrot przy anulowaniu budowy (krok 1.5)
Plan budowy każe ustalić zwrot części kosztu przy anulowaniu.
**Decyzja przyjęta w kroku 1.5 (do potwierdzenia):** anulowanie zwraca 75% zapłaconego kosztu, niezależnie od tego, jak długo trwała budowa (to, co nie zmieści się w magazynie, przepada). Liczba w `CANCEL_REFUND` (`config/buildings.ts`).

### 31. 🟢 Badania: zasady przyjęte w kroku 1.6 (do potwierdzenia)
- Badanie biegnie w laboratorium wybranej planety i płaci z jej magazynu (propozycja z pytania 21); limit poziomu i skrócenie czasu liczy się od tego laboratorium; drugie miejsce na badanie, gdy gracz ma gdziekolwiek laboratorium poziomu 5.
- Skrócenie czasu: 5% za każdy poziom laboratorium powyżej 1 (tabela 9.3.3 podaje czasy dla laboratorium poz. 1 bez skrócenia).
- Brak zasobów: badanie zwalnia do tempa, w jakim dopływają zasoby (przy zupełnym braku stoi), i samo rusza po dostawie.
- Anulowanie: zapłacona część przepada, postęp znika.
- Doganianie: średnia ze wszystkich graczy w świecie (w grze jednoosobowej także AI, pytanie 22); rabat obejmuje koszt (także surowce specjalne) i czas.

**Odpowiedź (3.11.2026):**
- Badania płacą z magazynu planety z laboratorium: potwierdzone. Dlatego zasoby trzeba wozić między planetami, a planety mogą się specjalizować (np. jedna buduje statki obronne, inna atakujące).
- Skracanie czasu od poziomu laboratorium: potwierdzone. Lepsze rzeczy i tak kosztują więcej i trwają dłużej.
- Brak zasobów: badanie się nie zatrzymuje. Uruchomione badanie od razu zabiera wszystkie dostępne zasoby potrzebne na swój koszt (i dobiera resztę, gdy tylko pojawi się w magazynie); zabranych zasobów nie da się już odzyskać, badanie trwa. Kończy się, gdy minie jego czas i cały koszt jest zapłacony.
- Nie ma anulowania badania przez gracza. Badanie przerywa tylko zniszczenie laboratorium (np. w ataku): wtedy zapłacone zasoby przepadają.
- Doganianie liczy wszystkich graczy, w grze jednoosobowej także komputerowych: potwierdzone.

### 32. 🟡 Loty bezpośrednie: co z blokadami i „skokami” (decyzja 3.11.2026)
**Decyzja właściciela:** nie ma tras; gracz leci prosto do wybranej planety, poświęcając czas i paliwo zależne od odległości. Trasy i węzły usunięte z gry (wersja 0.1.9a).
Skutki, które trzeba rozstrzygnąć (nic z tego jeszcze nie jest zbudowane, dotyczy kroków 1.9 i 5.1):
1. **Czas lotu:** specyfikacja dodawała 3 min za każdy skok. **Propozycja:** 3 min raz na lot (wejście w nadprzestrzeń); lot wewnątrz układu bez tej dopłaty.
2. **Blokady (12.3):** wcześniej flota zatrzymywała wrogów przelatujących przez zablokowany układ. Bez tras nikt „nie przelatuje przez układ”. **Propozycja:** flota w trybie blokady pilnuje strefy wokół układu (np. promień 10 LY + czujniki); każda wroga flota, której prosta linia lotu przecina tę strefę, zostaje zatrzymana i walczy. Stacja orbitalna daje taką strefę na stałe. Dzięki temu blokady nadal mają sens: osłaniają skupiska układów, a omijanie ich kosztuje dłuższy lot i więcej paliwa.
3. **Strategiczne miejsca:** węzły znikają; ich rolę przejmują bogate układy, anomalie i gęste skupiska układów (krótkie loty).
4. **Ostrzeżenia (13):** skaner wykrywa flotę, gdy ta wleci w jego zasięg w linii prostej — bez zmian.

**Odpowiedź (3.11.2026):**
- Czas lotu: przyjęta propozycja: 3 min raz na lot międzygwiezdny (wejście w nadprzestrzeń), lot wewnątrz układu bez dopłaty.
- Blokady: **bez trybu blokady**. Floty nie zatrzymują przelatujących wrogów; walka toczy się tylko w miejscu przylotu (atak, obrona planety). Skutki zapisane w specyfikacji (sekcja 0) i w planie budowy (krok 5.1 usunięty).

### 33. 🟡 Stacja orbitalna bez blokad
Stacja orbitalna służyła tylko do blokady stałej przy pełnej kontroli układu (spec 2.4, 12.3). Po usunięciu blokad nie ma zadania.
**Propozycja:** stacja orbitalna staje się najsilniejszą obroną planety (dostępną tylko przy pełnej kontroli układu), która broni każdej Twojej planety w tym układzie (nie tylko tej, przy której stoi). Alternatywa: usunąć ją z gry. Do decyzji przed fazą 2 (walka).

**Odpowiedź (3.11.2026):** stacja orbitalna = najsilniejsza obrona całego układu: gdy którakolwiek planeta właściciela w układzie jest atakowana, stacja jej broni. Do rozstrzygnięcia: warunek budowy przy układach współdzielonych (pytanie 34).

### 34. 🟡 Układy współdzielone przez graczy, którzy nie są sojusznikami
Właściciel pyta: czy dwie osoby mogą zajmować różne planety tego samego układu i żyć obok siebie, nie będąc sojusznikami?
Stan specyfikacji: tak, planety jednego układu mogą należeć do różnych graczy (2.2); kontrola układu od 50% planet daje +15% produkcji, 100% daje +25% (2.4); wolne planety w układzie kontrolowanym przez kogoś innego można kolonizować dopiero po wygraniu bitwy z jego flotą lub stacją (10.5); między nie-sojusznikami nie ma żadnej umowy, każdy może zaatakować każdego.
**Propozycja:**
1. **Współżycie domyślnie pokojowe w praktyce:** nikt nie walczy sam z siebie; bitwa jest tylko wtedy, gdy ktoś wyśle flotę na atak. Sąsiedzi w jednym układzie widzą się nawzajem (ten sam układ) i mają do siebie bardzo blisko (1–5 LY, lot w kilka minut), więc ostrzeżenia przed atakiem są krótkie: to naturalne napięcie.
2. **Pakt o nieagresji** (nowy, lżejszy od sojuszu): dwóch graczy zawiera go w kilka sekund; daje tylko zakaz atakowania się nawzajem (walidacja komend), bez wspólnej mapy i transportów. Zerwanie paktu działa z opóźnieniem (np. 12 h), żeby nikt nie zerwał go tuż przed atakiem.
3. **Stacja orbitalna w układzie współdzielonym:** może ją postawić gracz, który kontroluje układ (≥ 50% planet, liczone razem z sojusznikami); broni tylko planet swojego właściciela (i sojuszników), nigdy cudzych. Przy 100% kontroli dalej działa jak w odpowiedzi do pytania 33. Jeżeli właściciel straci kontrolę (np. ktoś skolonizuje kolejne planety), stacja zostaje, ale przestaje działać, dopóki kontrola nie wróci.
4. **Kolonizacja wolnych planet przy sąsiedzie:** zostaje zasada 10.5 (nie da się kolonizować w układzie kontrolowanym przez innego gracza bez wygranej bitwy), chyba że gracze mają pakt o nieagresji albo sojusz: wtedy kolonizacja jest dozwolona bez walki.

**Odpowiedź (3.11.2026):** propozycja przyjęta w całości (pokój do pierwszego ataku, pakt o nieagresji z 12 h opóźnieniem zerwania, stacja dla kontrolującego ≥ 50% broniąca tylko swoich i sojuszników, kolonizacja przy sąsiedzie bez walki tylko przy pakcie lub sojuszu). Do zbudowania w fazach 1.12 (pakt obok sojuszy) i 2 (walka).

### 35. 🟡 Kosmoport, hangary i odwołanie floty: zasady przyjęte w kroku 1.9 (do potwierdzenia)
Specyfikacja mówi tylko „kosmoport ogranicza liczbę flot startujących naraz (1 na poziom)”. Przyjąłem (wartości tymczasowe, łatwe do zmiany w `config/fleets.ts`):
1. **Okno startu:** każdy start zajmuje jedno miejsce startowe kosmoportu przez **3 min**; potem miejsce jest wolne. Kosmoport poz. 3 = 3 floty w ciągu 3 min.
2. **Bez kosmoportu flota nie wystartuje** z planety (planeta startowa musi go zbudować). Na razie liczy się sam poziom, nie obsada (5 robotników).
3. **Hangary:** jednostki trafiają do hangaru według klasy (mała 1, średnia 2, duża 4, ogromna 10 miejsc); reszta krąży na orbicie. Nowy hangar od razu przyjmuje jednostki z orbity.
4. **Odwołanie:** tylko flota w drodze „tam”. Wraca w tym samym czasie, w jakim leciała; zużywa paliwo na drogę przebytą tam i z powrotem, reszta wraca do magazynu przy lądowaniu. Flota w locie jednokierunkowym po przebyciu ponad połowy drogi nie ma paliwa na powrót, więc nie da się jej odwołać.
5. **Misje:** przelot (do własnej planety), stacjonowanie (przy cudzej lub wolnej planecie, jednokierunkowo), tam i z powrotem (paliwo na obie strony; na miejscu na razie nic się nie dzieje, atak i transport przyjdą w kolejnych krokach). Flota stacjonująca przy cudzej planecie nie ma paliwa na powrót: do czasu transportów (krok 1.10) zostaje tam.
6. **Tabela 12.1.3 przeliczona** dla jednego wejścia w nadprzestrzeń na lot (paliwo bez zmian):

| Jednostka | 20 LY | 100 LY | 200 LY |
|---|---|---|---|
| Sonda | 13 min, 1,5 | 53 min, 5,5 | 1 h 43 min, 10,5 |
| Myśliwiec | 18 min, 3 | 1 h 18 min, 11 | 2 h 33 min, 21 |
| Bombowiec | 27 min, 8 | 2 h 3 min, 32 | 4 h 3 min, 62 |
| Transportowiec | 33 min, 12 | 2 h 33 min, 52 | 5 h 3 min, 102 |
| Krążownik | 43 min, 25 | 3 h 23 min, 105 | 6 h 43 min, 205 |

**Odpowiedź (3.11.2026):**
- **Nie ma stacjonowania floty przy cudzej planecie.** Flota leci do własnej planety albo wylatuje, działa na miejscu (przylot, atak, ewentualna grabież: faza 2) i wraca. Całe paliwo misji jest liczone i pobierane na starcie, więc flocie nigdy nie zabraknie paliwa w drodze. Odwołanie jest zawsze możliwe; niewykorzystane paliwo wraca do magazynu (lot jednokierunkowy odwołany po połowie drogi nic nie zwraca, ale też niczego nie brakuje).
- **Kosmoport nie jest potrzebny do startu floty** i nie ogranicza liczby startów (zostaje mu czas załadunku transportów, krok 1.10).
- **Hangar albo orbita:** flota stoi w hangarach (ukryta, zabezpieczona przed atakiem z góry) albo na orbicie (obrona planety). Przejście między nimi nie kosztuje paliwa.
- **Loty wewnątrz układu nie kosztują paliwa** (niezależnie od kontroli układu).
Wprowadzone w wersji 0.1.12a. Rola hangaru i orbity w walce: faza 2.

### 36. 🔴 Energia, populacja i jednostki (uwaga właściciela 4.11.2026, propozycja do akceptacji)
**Właściciel:** energia ma być potrzebna tylko do utrzymania fabryk i do budowania nowych rzeczy; lepiej rozwinięta energia pozwala ulepszonym fabrykom (stoczni) budować większe i lepsze statki. Żeby budować więcej myśliwców, trzeba mieć większą populację; większa populacja wymaga więcej domów, a domy muszą być zaopatrywane przez farmy (biomasa).

**Propozycja:**
A. Energia
1. Energię zużywają tylko budynki, które pracują: kopalnie, rafineria, huta, warsztat, farma, stocznia, kosmoport, laboratorium, skaner, działa, tarcza (liczby z 5.1). Budynki bierne (mieszkanie, magazyn, silos, akumulator, schron, hangar) nie zużywają energii.
2. Budowa i ulepszanie budynku pobiera energię: plac budowy zużywa tyle, ile budynek na nowym poziomie. Przy niedoborze energii budowa trwa dłużej (tempo = wydajność energii).
3. Stocznia buduje jednostki tylko z energią i załogą: tempo budowy = wydajność energii × obsada stoczni. Wyższy poziom stoczni (więcej energii) odblokowuje większe statki, jak dotąd (9.2).
B. Załogi z populacji
4. Każda jednostka potrzebuje załogi z mieszkańców planety, na której powstaje: mała 1 (sonda, przechwytywacz, myśliwiec, piechota, szturmowcy), średnia 3 (fregata, bombowiec, transportowiec, okręt naprawczy, artyleria), kolonizator 10 (to 10 osadników nowej kolonii, 10.5), duża 10 (niszczyciel, krążownik, ciężki transportowiec, czołg 3), ogromna 30 (pancernik).
5. Załoga zajmuje miejsce w mieszkaniach planety macierzystej: mieszkańcy + załogi ≤ pojemność mieszkań. Więcej statków = więcej domów, a domy = więcej biomasy z farm. Załogi nie pracują w budynkach; jedzą tak jak dziś (utrzymanie z tabel 10.x).
6. Bez wolnych mieszkańców (populacja minus potrzebni robotnicy) stocznia nie przyjmie zamówienia. Zniszczona jednostka traci załogę; jednostka, która przeniesie się na inną planetę, przenosi tam załogę (zajmuje tam mieszkania).
To zmienia balans ekonomii (`docs/BALANS.md`) i wymaga ponownego przeliczenia.

**Odpowiedź (4.11.2026):** propozycja przyjęta; farma też zużywa energię. Liczebności załóg pasują (mogą się jeszcze zmienić). Wdrożone w wersji 0.1.13a, przed transportami.

### 37. 🟡 Co z flotą, gdy bombardowanie zniszczy domy i farmy? (uwaga właściciela 4.11.2026)
**Problem:** załogi mieszkają w domach planety macierzystej i jedzą jej biomasę. Gdy wróg zniszczy domy i farmy, statki nie powinny nagle „przestać działać w powietrzu”.
**Stan dziś (0.1.13a):** statki działają dalej; przy braku miejsca wyprowadzają się mieszkańcy, nie załogi; przy braku jedzenia mieszkańcy jedzą pierwsi, a głodne jednostki mają −25% ataku i brak napraw.
**Propozycja (do wyboru, można łączyć):**
A. **Załoga to koszt werbunku, nie stałe miejsce w domu** (zalecane): budowa jednostki zabiera ludzi z populacji (więc więcej statków = więcej domów i farm, jak chce właściciel), ale potem załoga mieszka na pokładzie i nie zajmuje mieszkań. Zniszczone domy nie ruszają floty; ograniczają tylko werbunek nowych załóg.
B. **Zapasy na pokładzie:** każdy statek ma prowiant na 3 dni (uzupełniany w hangarze/na orbicie planety, która ma biomasę). Gdy planeta macierzysta nie może karmić, flota je zapasy; po ich wyczerpaniu kary rosną stopniowo: −25% ataku i brak napraw, potem dezercja (1% załogi na godzinę, osłabiona jednostka walczy słabiej), nigdy nagłe zatrzymanie.
C. **Zmiana bazy:** gracz może przypisać flotę do innej swojej planety (która ją wyżywi); przelot już to robi automatycznie.
D. **Koszary orbitalne / kwatery w hangarze:** załogi mieszkają w hangarach (chronionych jak jednostki w nich), osobno od cywilów; bombardowanie domów uderza w gospodarkę, nie we flotę.

**Odpowiedź (4.11.2026):** załoga to niezbędna część kosztu produkcji statku: po zbudowaniu ci ludzie znikają z populacji i nie zajmują mieszkań. Jedzenie to zwykły koszt utrzymania (trzeba mieć odpowiednio duże farmy). Zniszczony statek = zginęła załoga. Gracz może przepisać flotę do innej planety (wyżywienie). Kwatery w hangarach niepotrzebne. Wdrożone w wersji 0.1.13b.

### 38. 🟡 Transporty i kolonizacja: zasady przyjęte w kroku 1.10b (do potwierdzenia)
1. **Załadunek:** transport ładuje się przed startem; czas = czas załadunku kosmoportu planety (10 min na poz. 1, ×0,9 za poziom, spec 9.1), a bez kosmoportu **20 min** (wartość tymczasowa). Rozładunek bez dodatkowego czasu.
2. **Pełny magazyn odbiorcy:** transport rozładowuje, ile się zmieści, resztę trzyma na orbicie i próbuje co **30 min**; gracz może go odwołać (wraca z resztą ładunku). Ładunek, który po powrocie nie zmieści się w magazynie planety macierzystej, przepada (wpis w dzienniku).
3. **Transport:** tylko do własnej planety (do sojusznika od kroku 1.12). Ładunek mogą wieźć wszystkie statki z ładownością (transportowiec 500, Kupcy 625, okręty bojowe mało).
4. **Trasa cykliczna:** co N godzin (min. 1 h, do 10 tras na gracza) wysyła podane jednostki z planety A do B; zabiera tyle zamówionych zasobów, ile jest (paliwo do przewozu najwyżej połowa zapasu, reszta na lot). Gdy jednostek nie ma (poprzedni kurs jeszcze w drodze), braknie paliwa albo zasobów, kurs przepada, a trasa zapisuje powód i próbuje przy następnym terminie.
5. **Kolonizacja:** kolonizator (z innymi jednostkami albo sam) leci do wolnej planety; nie można kolonizować w układzie kontrolowanym (≥ 50% planet) przez innego gracza (z paktem lub sojuszem: krok 1.12). Po przylocie: rdzeń, 10 mieszkańców (załoga kolonizatora), mieszkanie poz. 1; kolonizator znika, pozostałe jednostki lądują w nowej kolonii. Jeśli planeta zostanie zajęta w trakcie lotu, flota leci do najbliższej Twojej planety. Zasięg administracji (sekcja 14) dojdzie później.

### 39. 🟡 Mgła wojny: zasady przyjęte w kroku 1.11 (do potwierdzenia)
1. **Mapa nieba:** gracz widzi położenie wszystkich gwiazd (niebo jest widoczne), ale nazwy, planety i ich właścicieli tylko w odkrytych układach. Nieodkryte gwiazdy są przygaszone i podpisane „?”.
2. **Odkrycie układu:** własna planeta w układzie, sonda albo zasięg własnego skanera (układy w zasięgu są znane, dopóki skaner działa).
3. **Sonda:** misja „Scan” (sonda tam i z powrotem); po przylocie odkrywa układ i skanuje wszystkie jego planety (właściciel, złoża, budynki, jednostki w hangarach i na orbicie). Skan jest widoczny z wiekiem; po 6 h (+30 min za poziom badania czujników) oznaczony jako nieaktualny.
4. **Właściciele planet** w odkrytych układach są widoczni bez skanu (wiadomo, kto tam mieszka); szczegóły tylko ze skanu.
5. **Floty innych graczy** widać, gdy są w zasięgu któregoś z naszych skanerów (pozycja, skład, ślad); cel znamy tylko, gdy to nasza planeta. **Ostrzeżenie** (wpis w dzienniku i lista „INCOMING”) przychodzi w chwili, gdy flota lecąca do naszej planety wejdzie w zasięg naszego skanera; liczone przy starcie floty (skaner zbudowany później nie przyspieszy ostrzeżenia o flocie już w drodze).
6. **Dziennik:** każdy gracz widzi tylko swoje wpisy.
