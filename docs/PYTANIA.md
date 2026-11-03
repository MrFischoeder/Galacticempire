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

### 21. 🟡 Z której planety płacimy za badania i który poziom laboratorium się liczy
Gracz może mieć laboratoria na kilku planetach.
**Propozycja:** badanie uruchamia się na wybranej planecie z laboratorium; płaci jej magazyn, a limit i skrócenie czasu wynikają z jej laboratorium. Drugi slot (laboratorium 5) też liczy się na tej planecie.

### 22. 🟡 Doganianie: średnia „aktywnych graczy” w grze jednoosobowej
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
