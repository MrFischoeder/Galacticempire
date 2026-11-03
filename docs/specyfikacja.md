# Galactic Empire: kompletny dokument projektu 2.7

Status: wersja zbalansowana, uzupełniona o rdzeń planety, magazyny energii i żywności, nowy model układów, grabież i rynek dostępny przez Giełdę handlową. Wartości oznaczone **[TEST]** zostały policzone i zasymulowane, ale wymagają potwierdzenia w prototypie.

Ten dokument zastępuje wszystkie poprzednie pliki (specyfikacje v1–v6, wytyczne graficzne, dokument 1.0). Wrzuć go do `docs/specyfikacja.md` jako jedyne źródło prawdy.

---

## 0. Zmiany

### Wersja 2.8 (w przygotowaniu, decyzje właściciela z 3.11.2026)
Zapisane w `docs/PYTANIA.md`; liczby zostaną wpisane do sekcji 2–9 po kroku 1.2b (balans ekonomii).
- **Złoża:** każda planeta ma surowce podstawowe (do budowy podstawowej floty) i specjalizuje się w jednym dodatkowym surowcu albo jest bogata w jeden z podstawowych. Lepsze surowce zdobywa się podbojem. Złoża są skończone i widoczne (ile zostało, tempo wydobycia). Zastępuje „jedno złoże główne” z sekcji 2.3.
- **Biomasa** wraca jako nazwa zasobu żywności: farma wytwarza biomasę, populacja ją zjada (sekcje 4.2, 6).
- **Start:** pusty magazyn i 16 pustych pól na planecie startowej; rdzeń powoli zbiera surowce i gracz sam wybiera pierwsze budynki. Zastępuje gotową planetę startową i zasoby startowe z sekcji 7.
- **Koszty, czasy i wydajności budynków** zostaną przeliczone i zbalansowane (krok 1.2b).
- **Surowce specjalne (zaakceptowane 3.11.2026):** materiał rozpadowy (atak i energia), krystalit (obrona i przemysł), hel-3 (logistyka i fuzja), egzotyczna materia (szczyt rozwoju). Budynki do poz. 4, badania do poz. 4 i stocznia 1–3 wymagają tylko surowców podstawowych (metal, lód, tytan, krzem, biomasa). Pełny opis: `docs/SUROWCE.md`; liczby do przeliczenia w kroku 1.2b.
- **Rdzeń planety dodaje się do magazynów** (decyzja 3.11.2026): pojemność = rdzeń (150 każdego zasobu, 100 energii, 100 biomasy) + magazyny, akumulatory, silosy.
- **Balans ekonomii (krok 1.2b, `docs/BALANS.md`, zaakceptowany 3.11.2026):** koszt poziomu 1 ok. 60 wartości, koszt ×1,6 i czas ×1,8 na poziom, czas poziomu 1 osobno dla każdego budynku; rdzeń daje schronienie 10 osobom i zbiera awaryjnie 20/h każdego minerału podstawowego (tylko bez kopalni tego minerału), 5 biomasy/h, 5 energii/h; elektrownia odnawialna 25/h ×1,3 na poziom; przetwórstwo i farma ×1,25 na poziom. Zastępuje liczby z sekcji 7, 8.1 i 9 tam, gdzie się różnią.
- **Tempo przy wielu planetach** (uwaga właściciela 3.11.2026): kolejne planety rozwijają się szybciej dzięki dowozowi z dojrzałych planet (pierwsza ok. 9 dni do maksimum bez surowców specjalnych, kolonia wspierana przez 4 planety ok. 2,7 dnia); dolną granicę wyznacza jedna budowa naraz na planetę. Analiza w `docs/BALANS.md`.
- **Wielkość galaktyki** (decyzja 3.11.2026): domyślnie 60 układów (ok. 10 graczy przy 60 LY odstępu startów); większa gra dostaje większą galaktykę o tej samej gęstości: max(60, 7 × liczba graczy) układów, np. 84 dla 12 graczy.
- **Badania** (decyzja 3.11.2026): płaci magazyn planety z laboratorium (zasoby trzeba tam dowozić; planety mogą się specjalizować). Uruchomione badanie od razu zabiera dostępne zasoby na swój koszt i dobiera resztę, gdy się pojawi; zabranych nie da się odzyskać. Badanie kończy się, gdy minie czas i koszt jest zapłacony w całości. Gracz nie może anulować badania; przerywa je tylko zniszczenie laboratorium (zapłacone zasoby przepadają). Zastępuje „płatność rozłożoną w czasie” i „wstrzymanie przy braku zasobów” z sekcji 9.3.3.
- **Loty bezpośrednie, bez tras** (decyzja 3.11.2026): nie ma tras hiperprzestrzennych ani węzłów. Flota leci w linii prostej z dowolnego układu do dowolnego innego, płacąc czasem i paliwem za odległość w LY. Dotyczy sekcji 2.1 (trasy, graf, węzły: usunięte), 12.1 (odległość = linia prosta; czas = odległość w linii prostej / prędkość najwolniejszej jednostki + 3 min na wejście w nadprzestrzeń, raz na lot międzygwiezdny (lot wewnątrz układu bez tej dopłaty; decyzja 3.11.2026); tabele 12.1.3 i 12.1.4 do przeliczenia), 12.3 (**blokady i przechwytywanie usunięte**, decyzja 3.11.2026: floty walczą tylko w miejscu przylotu; nie ma eskort przeciw blokadom, przejmowania ładunku w drodze ani ryzyka przechwycenia handlu z 11.5 i 12.4; blokada stała z 2.4 i rola stacji orbitalnej do decyzji, pytanie 33), 14 (zasięg administracji w linii prostej), 15 (odstęp startowy 60 LY w linii prostej). Wielkość galaktyki: 60 układów mieści co najmniej 8 graczy; większa gra dostaje max(60, 8 × gracze) układów (np. 96 dla 12).
- **Stacja orbitalna** (decyzja 3.11.2026): najsilniejsza obrona układu; broni każdej planety właściciela w układzie, gdy któraś zostanie zaatakowana. W układzie współdzielonym stację stawia gracz kontrolujący ≥ 50% planet (z sojusznikami); broni tylko planet swojego właściciela i sojuszników; bez kontroli przestaje działać.
- **Układy współdzielone i pakt o nieagresji** (decyzja 3.11.2026): gracze mogą zajmować różne planety jednego układu bez sojuszu; walka tylko po ataku. Nowy pakt o nieagresji (lżejszy od sojuszu): zakaz wzajemnych ataków, bez wspólnej mapy i transportów, zerwanie działa po 12 h. W układzie kontrolowanym przez innego gracza wolną planetę można skolonizować bez walki tylko przy pakcie albo sojuszu (inaczej zasada 10.5).
- Pomysły na przyszłe rasy: roboty (bez biomasy, dużo energii), rasa statków organicznych (biomasa jako materiał, mało energii).

### Wersja 2.7
- **Tryby gry:** jednoosobowy (w przeglądarce, bez serwera, z przyspieszeniem czasu i pauzą), kooperacja przeciw AI, wieloosobowy z opcjonalnym AI oraz obrona przed inwazją (sekcja 23).
- **Przeciwnicy komputerowi:** AI w trzech warstwach (strategia, operacje, taktyka), grające według tych samych reguł co człowiek, z mgłą wojny, 5 osobowościami i 4 poziomami trudności.
- **Zegar gry** zamiast zegara systemowego, obowiązkowy od Fazy 1.
- **Nowa kolejność faz:** walka i AI z trybem jednoosobowym przed serwerem (sekcja 20).

### Wersja 2.6
- **Badania technologii:** 13 technologii ulepszających broń, pancerz, tarcze okrętowe i planetarne, wojska lądowe, artylerię naziemną, obronę, napędy, ładownie, czujniki, wydobycie i stocznie. Nowy budynek: laboratorium badawcze (sekcja 9.3).
- Koszty rosną ×1,7 na poziom i są pobierane w trakcie badania. Siła ulepszeń sprawdzona symulacją, żeby technologia nie odwracała kontr (sekcja 9.3.4).
- Mechanizm doganiania dla nowych graczy i rabaty badań dla ras.

### Wersja 2.5
- **Więcej jednostek:** 7 statków bojowych (przechwytywacz, myśliwiec, fregata, bombowiec, niszczyciel, krążownik, pancernik), 5 pomocniczych (sonda, transportowiec, ciężki transportowiec, kolonizator, okręt naprawczy), 4 lądowe (piechota, szturmowcy, artyleria polowa, czołg) i 3 budynki obronne (działko przeciwlotnicze, wyrzutnia torped, działo obronne). Liczba ras bez zmian (sekcja 10).
- **Koszt proporcjonalny do mocy bojowej** (wytrzymałość × obrażenia), dostrojony turniejem symulacji. Żadna jednostka nie jest najlepsza do wszystkiego (sekcja 10.0 i 10.6).
- **Utrzymanie jednostek w żywności** (ok. 2% wartości dziennie), z karą za głód (sekcja 10.4).
- **Kolonizacja wolnych planet** kolonizatorem, której wcześniej brakowało (sekcja 10.5).
- Miejsca w hangarze zależą od klasy rozmiaru.

### Wersja 2.4
- **Koszt lotu zależy od rzeczywistej odległości** w latach świetlnych (LY), a nie od liczby skoków. Symulacja 20 galaktyk pokazała, że jeden skok może mieć od 8 do 61 LY, więc stała opłata za skok była błędna nawet sześciokrotnie (sekcja 12.1).
- Każda jednostka ma **prędkość (LY/h)** i **zużycie paliwa (na LY)** zamiast kosztu za skok (sekcja 10.1).
- Paliwo na **lot w obie strony** pobierane przy starcie, żeby flota nigdy nie utknęła bez paliwa.
- **Loty wewnątrz układu** między planetami: krótkie i tanie.
- Zasięg skanerów, zasięg administracji i odstęp startowy liczone w LY.
- Tabele kosztów handlu i opłacalności nalotów dla różnych odległości (sekcje 11.5.1 i 12.1.4).

### Wersja 2.3
- **Giełda handlowa:** rynek jest dostępny dopiero po wybudowaniu tego budynku. Jego poziom określa liczbę aktywnych ofert i opłatę (sekcja 12.4).

### Wersja 2.2
- **Ładowność wszystkich statków:** także myśliwce mogą wywozić łup, żeby nalot zwracał koszt paliwa (sekcje 10.1 i 11.5).
- **Grabież bez limitu procentowego:** zwycięska flota zabiera wszystko, co zmieści, poza rdzeniem i schronem.
- **Fala transportowców:** po zniszczeniu obrony planeta jest bezbronna i transportowce mogą ją oczyścić bez eskorty (sekcja 11.5.2).
- **Rynek graczy:** wymiana zasobu na zasób z fizycznym transportem, rezerwacją towaru i kosztem paliwa po stronie kupującego (sekcja 12.4).

### Wersja 2.1
- **Rdzeń planety:** każda posiadana planeta ma niezniszczalny magazyn podstawowy, który sam zbiera minimalne ilości zasobów. Nawet po zniszczeniu całej infrastruktury gracz może się odbudować (sekcja 8.1).
- **Energia i żywność magazynowane:** nowe budynki **Akumulator** (energia) i **Silos** (żywność). Ich rozbudowa to jeden z pierwszych kroków rozwoju (sekcja 7.1).
- **Bombardowanie infrastruktury:** bombowce mogą niszczyć poziomy budynków bez desantu (sekcja 11.6).
- **Układ jako cel podboju:** każdy układ zawiera planety różnych typów, więc daje dostęp do kilku surowców naraz. Zamiast bonusu do jednego zasobu jest bonus kontroli dla wszystkich planet układu (sekcje 2.2 i 2.4).

### Wersja 2.0 względem 1.0

**Uproszczenia (stabilizacja):**
- **Biomasa** nie jest już magazynowanym surowcem, tylko cechą planety (**żyzność**). Usuwa to sprzeczność „farma bez wyczerpania, ale ze złoża”.
- **Energia** nie jest magazynowana. To bilans: produkcja minus zużycie, liczony na bieżąco.
- **Logistyka** wewnątrz planety została zastąpiona **kosmoportem**. Zamiast sztucznego limitu przepustowości określa, ile flot może jednocześnie startować i jak szybko ładują się transporty.
- Liczba magazynowanych zasobów spadła z 11 do 9.

**Poprawki balansu:**
- Jednostki dostały **strukturę (punkty życia)** i **klasę rozmiaru**. Wcześniej pancerz 80 przy ataku 10 dawał zero obrażeń, przez co Rój nie mógł wygrać z Kolosami.
- Nowy wzór obrażeń nigdy nie daje zera, a trójkąt kontr (myśliwce > bombowce > krążowniki > myśliwce) został sprawdzony symulacją.
- Magazyn rośnie ×1,3 za poziom (wcześniej +180). Czas zapełnienia zostaje w przedziale 6,7–9,5 h na każdym poziomie, więc późna gra nie zmusza do logowania co 4 godziny.
- Paliwo liczone od odległości (od wersji 2.4 w LY, sekcja 12.1).
- Zdefiniowano zużycie energii przez wszystkie budynki, potrzebnych robotników i zużycie żywności. Planeta startowa jest policzona tak, żeby działała od pierwszej minuty.

**Nowe mechaniki (ciekawsza rozgrywka):**
- **Blokady i przechwytywanie:** flota ustawiona w układzie zatrzymuje przelatujących wrogów. Trasy handlowe trzeba eskortować i kontrolować.
- **Kontrola układu:** bonus produkcji działa tylko, gdy gracz lub sojusz kontroluje większość planet układu.
- **Grabież i schron:** zwycięski atak zabiera część magazynu. Schron chroni część zasobów.
- **Ochrona początkowa:** 48 h nietykalności dla nowych graczy i po odrodzeniu.
- **Zasięg administracji:** planety daleko od stolicy produkują mniej. Hamuje to efekt kuli śnieżnej przy wielu graczach.
- **Trasy cykliczne:** automatyczne, powtarzalne transporty. Gra działa, gdy gracz śpi.
- **Konkretne mechaniki ras** z liczbami zamiast ogólnych opisów.
- **Naprawy, zdobywanie planet i desant** opisane krok po kroku.

---

## 1. Idea
Przeglądarkowa, ciągła gra strategiczna w czasie rzeczywistym. Gracze startują w układach gwiezdnych rozrzuconych po galaktyce, rozbudowują planety, zdobywają kolejne układy, prowadzą handel i walczą. Nie ma rund. Świat trwa cały czas, także gdy gracz jest offline.

**Pętla rozgrywki:**
1. Rozbuduj gospodarkę planety (wydobycie, przetwórstwo, energia, populacja).
2. Wyślij sondy i odkryj okolicę.
3. Zajmij kolejne planety i przejmij kontrolę nad układami.
4. Połącz planety trasami handlowymi i chroń je.
5. Buduj flotę pod konkretnego przeciwnika (trójkąt kontr) i atakuj albo broń się.
6. Wracaj co kilka godzin: magazyny się zapełniają, ulepszenia się kończą, ktoś może lecieć w Twoją stronę.

- **Etap 1:** jeden serwer, dla właściciela i znajomych.
- **Docelowo:** dziesiątki, potem setki graczy.

## 2. Świat

### 2.1 Galaktyka
- Losowe rozmieszczenie układów gwiezdnych (domyślnie 60 przy etapie 1) w dysku o promieniu 100 LY, z minimalnym odstępem 8 LY między układami. Generacja deterministyczna (seed).
- **Trasy hiperprzestrzenne** generowane jako graf Gabriela (łączy sąsiadów, którzy nie mają innego układu „pomiędzy”), potem obcięty do maks. 5 połączeń na układ. Układ z tylko jednym połączeniem dostaje drugie, do najbliższego niepołączonego sąsiada.
- **Skala (sprawdzona symulacją 20 galaktyk):** trasa ma od 8 do ok. 60 LY, średnio ok. 22 LY. Średnia odległość między dwoma układami po trasach to ok. 100 LY (ok. 5 skoków), najdłuższa ok. 240 LY.
- **Długość każdej trasy jest widoczna na mapie** (w LY i w czasie lotu wybranej floty).
- Każdy układ ma 2–5 połączeń. Układy z wieloma połączeniami to **węzły**: cenne strategicznie, bo przechodzi przez nie dużo ruchu.
- Ruch odbywa się wyłącznie po trasach. Lot z A do C przez B oznacza przelot przez układ B (ważne dla blokad, sekcja 12).

### 2.2 Układ gwiezdny
- Gwiazda i 3–7 planet różnych typów.
- **Różnorodność:** generator gwarantuje, że każdy układ ma planety dające co najmniej 3 różne surowce. Układ to „paczka” zasobów: kto go zdobędzie, ma dostęp do kilku minerałów naraz.
- **Specjalizują się planety, nie układy.** Każda planeta ma swoje złoże główne (sekcja 2.3), a układ jako całość jest kolejnym miejscem do podboju.
- Planety jednego układu mogą należeć do różnych graczy. Rywalizacja o pozostałe planety układu to naturalne źródło konfliktów.
- Część układów jest **bogata** (5–7 planet, w tym rzadkie typy: radioaktywna, wulkaniczna). Są wartościowe, ale zwykle leżą dalej od pozycji startowych.

### 2.3 Planety
| Typ planety | Złoże główne | Dodatkowo |
|---|---|---|
| Skalista | Ruda metalu | Czasem słaba żyzność |
| Wulkaniczna | Ruda tytanu | Często energia geotermalna (jak słoneczna) |
| Lodowa | Lód deuterowy | — |
| Gazowy gigant | Lód deuterowy (bogaty) | Nie da się na nim budować mieszkań, tylko wydobycie i kosmoport |
| Pustynna | Krzem | Często energia słoneczna |
| Radioaktywna | Materiał rozpadowy | Żyzność zerowa |
| Oceaniczna | — | Wysoka żyzność |
| Zielona | Ruda metalu (uboga) | Wysoka żyzność, energia wiatrowa |

**Liczba miejsc budowy:** każda planeta ma 8–14 pól pod budynki (zależnie od wielkości). To główne ograniczenie rozbudowy pionowej i powód do zdobywania kolejnych planet.

### 2.4 Kontrola układu
- **Kontrola:** gracz (lub sojusz łącznie) ma co najmniej 50% planet układu.
- **Efekt:** +15% do całej produkcji planet kontrolującego gracza w tym układzie oraz widoczność całego układu.
- **Pełna kontrola (100%):** +25% produkcji, transport między planetami układu bez zużycia paliwa i możliwość postawienia **blokady stałej** (sekcja 12) za pomocą stacji orbitalnej.

## 3. Rasy
Cztery rasy, każda ma rolę, liczbowe modyfikatory i jedną mechanikę unikalną. Rasa jest zapisana w danych, a nie w kodzie.

| Rasa | Rola | Modyfikatory | Mechanika unikalna |
|---|---|---|---|
| **Kupcy** | Gospodarka i handel | Wydobycie +15%. Transportowce +25% ładowności i −25% paliwa. Jednostki bojowe −10% ataku | **Kontrakty:** dostawa zasobów do sojusznika dociera z bonusem +10% |
| **Rój** | Ofensywa ilością | Jednostki −30% kosztu i −30% czasu budowy, ale −20% struktury. Populacja zużywa +25% żywności | **Fala:** kolejne floty Roju, które dotrą do tego samego celu w ciągu 10 min, walczą razem i dostają +10% ataku za każdą dodatkową falę (maks. +30%) |
| **Kolosy** | Ofensywa jakością | Jednostki +30% struktury i pancerza, ale +30% kosztu i +30% czasu budowy. Koszt jednostek zawiera +25% tytanu | **Flagowiec:** jedna jednostka w każdej flocie ma +50% struktury i ataku. Jeśli zginie, reszta floty traci 15% ataku do końca bitwy |
| **Forteca** | Utrzymywanie planet | Budynki obronne −30% kosztu. Regeneracja tarczy ×2. Statki −15% ataku | **Bastion:** działa obronne strzelają w pierwszej rundzie przed atakującym |

**Zasada balansu ras:** każda rasa ma wyraźną przewagę w jednej dziedzinie i wyraźny koszt w innej. Suma bonusów i kar powinna być podobna.

## 4. Zasoby

### 4.1 Surowce wydobywane ze złóż (magazynowane)
| Surowiec | Złoże | Zastosowanie |
|---|---|---|
| **Lód deuterowy** | Lodowe, gazowe giganty | Paliwo. Najważniejszy zasób |
| **Ruda metalu** | Skaliste, zielone (uboga) | Stopy, budynki |
| **Ruda tytanu** | Wulkaniczne | Stopy, pancerze |
| **Krzem** | Pustynne | Komponenty |
| **Materiał rozpadowy** | Radioaktywne | Paliwo dla reaktora |

### 4.2 Produkty przetworzone (magazynowane)
| Produkt | Przepis | Budynek | Wydajność poz. 1 |
|---|---|---|---|
| **Paliwo** | 2 lodu → 1 paliwa | Rafineria | 30/h (zużywa 60 lodu/h) |
| **Stopy** | 2 metalu + 1 tytanu → 1 stopu | Huta | 30/h (zużywa 60 metalu i 30 tytanu/h) |
| **Komponenty** | 2 krzemu + 1 stopu → 1 komponentu | Warsztat | 15/h (zużywa 30 krzemu i 15 stopów/h) |
| **Żywność** | Żyzność planety (bez surowca) | Farma | 30/h × żyzność |

Przepisy są dobrane tak, że **jedna kopalnia zasila jeden zakład przetwórczy tego samego poziomu**. Gracz od razu widzi, co musi zbudować w parach.

### 4.3 Cechy planety (niemagazynowane)
- **Żyzność:** 0 (brak), 0,5 (słaba), 1,0 (średnia), 1,5 (wysoka). Mnożnik produkcji farmy.
- **Energia odnawialna:** słoneczna, wiatrowa lub geotermalna. Dostępna tylko na części planet.

### 4.4 Złoża
- Złoża są **skończone**: pula 50 000–500 000 jednostek **[TEST]**.
- Klasa bogactwa: uboga ×0,7, średnia ×1,0, bogata ×1,4 do wydajności kopalni.
- Przy wydobyciu 60/h złoże 50 000 wystarcza na ok. 35 dni, a 500 000 na wiele miesięcy nawet przy wysokim poziomie kopalni. Wyczerpanie zmusza do ekspansji, ale nie w pierwszych tygodniach.

### 4.5 Wartość zasobów (do balansu)
Do porównywania kosztów: 1 komponent ≈ 3 stopy, 1 stop ≈ 3 surowce, 1 paliwo ≈ 2 lody.

## 5. Energia
- Energia to przede wszystkim **bilans**: produkcja minus zużycie, liczone na bieżąco.
- **Nadwyżka** ładuje **akumulatory** (pojemność 200 energii na poziom 1, ×1,3 za poziom) i rdzeń planety (100 energii).
- **Niedobór** najpierw rozładowuje akumulatory. Dopiero gdy są puste, produkcja zwalnia.
- Dzięki temu krótki brak paliwa w reaktorze albo zniszczony reaktor nie zatrzymuje od razu całej planety.
- **Reaktor:** 100 energii/h na poziom, zużywa 10 materiału rozpadowego/h na poziom.
- **Energia odnawialna** (słoneczna, wiatrowa, geotermalna): 15 energii/h na budynek, maksymalnie 3 takie budynki na planecie, tylko gdzie planeta na to pozwala.
- **Niedobór przy pustych akumulatorach:** wszystkie budynki działają z wydajnością = produkcja / zużycie.

### 5.1 Zużycie energii przez budynki (na poziom 1, rośnie ×1,15 za poziom)
| Budynek | Energia/h |
|---|---|
| Kopalnia | 10 |
| Rafineria | 15 |
| Huta | 20 |
| Warsztat | 20 |
| Farma | 5 |
| Mieszkanie | 2 |
| Magazyn | 2 |
| Akumulator | 1 |
| Silos | 1 |
| Schron | 2 |
| Hangar | 5 |
| Kosmoport | 10 |
| Skaner | 15 |
| Działo obronne | 20 |
| Generator tarczy | 30 |
| Stocznia | 15 |
| Laboratorium badawcze | 20 |

## 6. Populacja
- **Mieszkanie:** 20 mieszkańców na poziom.
- **Robotnicy:** po 5 robotników potrzebują: kopalnie, zakłady przetwórcze (rafineria, huta, warsztat), farma, reaktor, kosmoport, stocznia i skaner. Pozostałe budynki (magazyn, schron, mieszkanie, hangar, energia odnawialna, działa, tarcza) działają bez obsługi.
- **Żywność:** 0,5 żywności/h na mieszkańca (Rój: 0,625). Jedno mieszkanie zużywa 10/h, farma poz. 1 o średniej żyzności daje 30/h.
- **Zapasy żywności:** nadwyżka trafia do **silosu** (pojemność 300 na poziom 1, ×1,3 za poziom) i rdzenia planety (100). Przy niedoborze populacja najpierw zjada zapasy.
- **Brak żywności przy pustych zapasach:** populacja spada o 5% na godzinę, a budynki bez robotników przestają działać.
- **Wzrost:** populacja rośnie do pojemności mieszkań o 10% na godzinę, jeśli jest nadwyżka żywności.

## 7. Planeta startowa (bilans sprawdzony)
| Budynek | Liczba |
|---|---|
| Kopalnia metalu, kopalnia lodu, kopalnia tytanu | po 1 |
| Rafineria, huta | po 1 |
| Farma | 1 (poziom 2) |
| Mieszkanie | 3 |
| Magazyn, hangar, kosmoport, stocznia | po 1 |
| Reaktor | 1 |
| Panel słoneczny | 1 |

- **Energia:** zużycie ok. 109/h, reaktor 100/h + panel 15/h → nadwyżka ok. 6.
- **Robotnicy:** potrzeba 45 (9 budynków), mieszkania dają 60. Wolne 15 osób wystarcza na 3 kolejne budynki.
- **Żywność:** zużycie 30/h, farma poziomu 2 daje 37,5/h. Nadwyżka pozwala populacji rosnąć.
- **Materiał rozpadowy na start:** reaktor startowy ma załadowany rdzeń z 2 000 jednostek (poza magazynem), czyli ok. 8 dni pracy. Pierwszy cel strategiczny: znaleźć i zająć planetę radioaktywną w ciągu tygodnia.
- **Zasoby startowe:** 400 każdego surowca, 200 paliwa, 100 stopów, 2 sondy, 1 transportowiec.
- **Planeta startowa** zawsze ma żyzność co najmniej 1,0, energię odnawialną i co najmniej jedną planetę lodową lub gazowego giganta w tym samym układzie.
- Nadwyżka energii jest celowo mała. Każdy nowy budynek wymaga najpierw myślenia o energii, a pierwszy duży krok to drugi reaktor albo planeta radioaktywna.
- Planeta startowa **nie ma** akumulatora ani silosu. Ma tylko rdzeń (100 energii, 100 żywności).

### 7.1 Zalecana kolejność rozwoju (pierwsze godziny)
1. **Akumulator i silos:** zabezpieczają planetę przed wahaniami energii i żywności. Bez nich jedna awaria zatrzymuje produkcję.
2. **Magazyn:** żeby zbierać zasoby na ulepszenia i statki, zamiast tracić je przy pełnym magazynie.
3. **Kopalnie i huta poziom 2–3:** stały dopływ stopów.
4. **Statki:** sondy do zwiadu, potem transportowiec i pierwsze myśliwce.

Gra nie wymusza tej kolejności, ale samouczek i podpowiedzi w interfejsie ją sugerują. Gracz, który od razu buduje flotę, zostaje z kruchą gospodarką.

## 8. Produkcja, magazyny i schron
- Produkcja jest **ciągła**, liczona przez serwer z timestampów.
- **Kopalnia:** 60/h na poziom 1, ×1,25 za poziom, maks. poziom 10.
- **Magazyn:** 400 na każdy zasób na poziom 1, ×1,3 za poziom, maks. poziom 10.
- Produkcja zatrzymuje się, gdy magazyn danego zasobu jest pełny.
- **Schron:** chroni przed grabieżą 100 jednostek każdego zasobu na poziom 1, ×1,3 za poziom.

### 8.1 Rdzeń planety (magazyn podstawowy)
Każda posiadana planeta ma **rdzeń**: wbudowany, niezniszczalny magazyn minimalny.
- **Pojemność:** 150 każdego surowca i produktu, 100 energii, 100 żywności.
- **Nie można go zniszczyć ani ograbić.** Bombardowanie, grabież i zniszczenie budynków go nie dotyczą.
- **Zbiór awaryjny:** rdzeń sam zbiera minimalne ilości, nawet gdy na planecie nie stoi żaden budynek:
  - 5/h złoża głównego planety,
  - 5/h żywności, jeśli planeta ma żyzność większą od zera,
  - 5/h energii, jeśli planeta ma energię odnawialną.
- **Cel:** po zniszczeniu infrastruktury gracz zawsze ma z czego odbudować pierwszą kopalnię, farmę lub akumulator. 150 jednostek to dokładnie tyle, ile kosztuje najtańszy budynek poziomu 1, więc odbudowa zaczyna się po ok. 30 h zbioru awaryjnego albo szybciej z pomocą transportu.
- **Przy zdobyciu planety** rdzeń przechodzi na nowego właściciela razem z zawartością.

**Czas zapełnienia magazynu** (kopalnia i magazyn na tym samym poziomie):
| Poziom | Wydobycie/h | Magazyn | Pełny po |
|---|---|---|---|
| 1 | 60 | 400 | 6,7 h |
| 3 | 94 | 676 | 7,2 h |
| 5 | 146 | 1 142 | 7,8 h |
| 7 | 229 | 1 931 | 8,4 h |
| 10 | 447 | 4 242 | 9,5 h |

Gracz, który loguje się rano i wieczorem, nie traci produkcji. Kto loguje się częściej, może ją lepiej wykorzystać. Powiadomienie push przy zapełnieniu magazynu.

## 9. Budynki i ulepszenia
- **Czas ulepszenia:** 5 min na poziom 1→2, ×1,8 za każdy kolejny. Poziom 5 to ok. 52 min, poziom 10 to ok. 16,5 h.
- **Koszt ulepszenia:** 100 jednostek na poziom 1→2 (różne zasoby zależnie od budynku), ×1,6 za poziom.
- **Kolejka:** jedna budowa naraz na planetę **[TEST]**.
- **Zwrot z ulepszenia kopalni:** 6,7 h na poziomie 1, 18 h na poziomie 5, 61 h na poziomie 10. Rozbudowa pionowa staje się coraz mniej opłacalna, więc od pewnego momentu lepiej zdobywać nowe planety.
- **Wymóg magazynu:** koszt ulepszenia musi zmieścić się w magazynie. Dla wysokich poziomów oznacza to rozbudowę magazynu przed kopalnią.

### 9.1 Lista budynków
| Budynek | Funkcja |
|---|---|
| Kopalnia | Wydobycie surowca ze złoża |
| Rafineria, huta, warsztat | Przetwórstwo (sekcja 4.2) |
| Farma | Żywność zależna od żyzności |
| Reaktor | Energia z materiału rozpadowego |
| Panel słoneczny / turbina / geotermia | Energia odnawialna |
| Mieszkanie | Populacja |
| Magazyn | Pojemność surowców i produktów |
| Akumulator | Magazyn energii |
| Silos | Magazyn żywności |
| Schron | Ochrona zasobów przed grabieżą |
| Hangar | Miejsca dla jednostek (10 na poziom) |
| Stocznia | Budowa jednostek. Poziom stoczni określa, które jednostki są dostępne |
| Kosmoport | Liczba flot startujących naraz (1 na poziom), czas załadunku transportu |
| Skaner | Zasięg wykrywania: 25 LY na poziom 1, +10 LY za poziom (maks. 115 LY na poziomie 10) |
| Działo obronne | Obrona automatyczna |
| Generator tarczy | Tarcza planetarna |
| Stacja orbitalna | Blokada stała, tylko przy pełnej kontroli układu |
| Centrum administracyjne | Druga stolica dla zasięgu administracji (sekcja 14) |
| Giełda handlowa | Dostęp do rynku graczy, liczba aktywnych ofert (sekcja 12.4) |
| Laboratorium badawcze | Badania technologii (sekcja 9.3) |

### 9.2 Odblokowanie jednostek w stoczni
| Poziom stoczni | Jednostki i budynki obronne |
|---|---|
| 1 | Sonda, transportowiec, przechwytywacz, myśliwiec, piechota |
| 2 | Kolonizator, fregata, działko przeciwlotnicze |
| 3 | Bombowiec, szturmowcy, działo obronne |
| 4 | Niszczyciel, okręt naprawczy, czołg, wyrzutnia torped |
| 5 | Krążownik, ciężki transportowiec, artyleria polowa |
| 7 | Pancernik |

Budynki obronne wymagają stoczni na tej samej planecie tylko do odblokowania. Budowane są w zwykłej kolejce budynków.

### 9.3 Badania (ulepszenia technologii)
Badania ulepszają **wszystkie jednostki lub budynki danej kategorii** u gracza, także te zbudowane w przyszłości. To drugi, obok budowy floty, główny sposób wydawania zasobów: gracz nie kończy na jednym statku, tylko stale wybiera między „więcej jednostek” a „lepsze jednostki”.

#### 9.3.1 Laboratorium badawcze
- Budynek wymagany do badań. Wymaga stoczni poziom 2 na tej samej planecie.
- **Poziom laboratorium ogranicza poziom technologii:** maks. poziom badania = 2 × poziom laboratorium (np. laboratorium 3 pozwala badać do poziomu 6).
- Każdy poziom laboratorium skraca czas badań o 5%.
- **Jedno badanie naraz** na gracza. Drugie równoległe badanie od laboratorium poziomu 5.
- Zużycie: 20 energii/h, 5 robotników.

#### 9.3.2 Lista technologii
Maks. poziom każdej technologii: 10.

| Technologia | Efekt na poziom | Maks. (poz. 10) | Dotyczy | Koszt poziomu 1 |
|---|---|---|---|---|
| **Broń lekka** | +3% ataku | +30% | przechwytywacz, myśliwiec, fregata, działko przeciwlotnicze | 120 stopów, 27 komponentów |
| **Broń ciężka** | +3% ataku | +30% | bombowiec, niszczyciel, krążownik, pancernik, wyrzutnia torped, działo obronne | 180 stopów, 40 komponentów |
| **Pancerz kadłuba** | +3% pancerza | +30% | wszystkie statki | 180 stopów, 40 komponentów |
| **Tarcze okrętowe** | +2% struktury (pole siłowe pochłaniające pierwsze trafienia) | +20% | wszystkie statki | 180 stopów, 40 komponentów |
| **Wojska lądowe** | +3% ataku i +2% struktury | +30% / +20% | piechota, szturmowcy, czołg, milicja | 100 stopów, 22 komponenty |
| **Artyleria naziemna** | +3% ataku, +1 cel na strzał na poziomach 5 i 10 | +30%, +2 cele | artyleria polowa | 100 stopów, 22 komponenty |
| **Obrona planetarna** | +3% ataku i +3% pancerza | +30% / +30% | działa, wyrzutnie torped, działka przeciwlotnicze, stacja orbitalna | 120 stopów, 27 komponentów |
| **Tarcze planetarne** | +15% pojemności i +10% regeneracji tarczy planety | +150% / +100% | generator tarczy | 120 stopów, 27 komponentów |
| **Napędy** | +4% prędkości i −2% zużycia paliwa | +40% / −20% | wszystkie statki | 140 stopów, 30 komponentów |
| **Ładownie** | +5% ładowności | +50% | wszystkie statki z ładownią | 80 stopów, 18 komponentów |
| **Czujniki** | +10% zasięgu skanerów, skan dezaktualizuje się o 30 min później | +100%, +5 h | skanery, sondy | 100 stopów, 22 komponenty |
| **Technologie wydobycia** | +3% wydobycia | +30% | wszystkie kopalnie | 160 stopów, 36 komponentów |
| **Inżynieria stoczniowa** | −4% czasu budowy jednostek | −40% | stocznie | 160 stopów, 36 komponentów |

#### 9.3.3 Koszt i czas kolejnych poziomów
- **Koszt:** poziom 1 według tabeli, każdy kolejny ×1,7. Poziom 10 kosztuje ok. 119 razy więcej niż poziom 1.
- **Czas:** 30 min dla poziomu 1, każdy kolejny ×1,6 (przed skróceniem przez laboratorium).
- **Płatność w trakcie badania:** koszt nie jest pobierany od razu, tylko rozłożony równomiernie na czas badania i pobierany z magazynu planety z laboratorium. Dzięki temu wysokie poziomy (np. 14 000 stopów) nie wymagają magazynu, który by je pomieścił naraz. Jeśli zasobów zabraknie, badanie się wstrzymuje i wraca po dostawie (transport z innych planet albo od sojuszników).

Przykład dla technologii z kosztem poziomu 1 = 120 stopów i 27 komponentów:
| Poziom | Stopy | Komponenty | Czas (laboratorium poz. 1) |
|---|---|---|---|
| 1 | 120 | 27 | 30 min |
| 3 | 347 | 78 | 1,3 h |
| 5 | 1 002 | 226 | 3,3 h |
| 7 | 2 897 | 652 | 8,4 h |
| 10 | 14 231 | 3 202 | 34 h |

#### 9.3.4 Balans badań (sprawdzony symulacją)
Wartości procentowe są celowo umiarkowane: technologia ma znaczyć dużo, ale nie może odwracać kontr ani dawać nowicjuszom zerowych szans. Symulacja z jednoczesnym ulepszeniem broni, pancerza i tarcz (równe budżety flot):
| Starcie | Bez badań | Przewaga 3 poziomów | Przewaga 5 poziomów | 10 vs 0 | 10 vs 5 |
|---|---|---|---|---|---|
| Krążownik vs krążownik (ta sama jednostka) | 0,00 | +0,21 | +0,48 | +0,95 | — |
| Myśliwiec vs krążownik (zła kontra) | −1,00 | −0,70 | −0,28 | +0,30 | −0,16 |
| Krążownik vs bombowiec (zła kontra) | −0,51 | −0,39 | −0,39 | +0,92 | −0,39 |
| Pancernik vs bombowiec (zła kontra) | −0,92 | −0,92 | −0,92 | −0,87 | −0,92 |

**Wnioski:**
- Przy tej samej jednostce 3 poziomy przewagi dają wyraźną przewagę, a 5 poziomów dużą.
- Dobór floty pod przeciwnika nadal jest ważniejszy niż technologia. Przewaga 5 poziomów nie odwraca kontr. Odwraca je dopiero pełne maksimum przeciw przeciwnikowi bez badań.
- Wcześniejsza wersja z +5% na poziom odwracała kontry już przy 5 poziomach, dlatego wartości zmniejszono do +3% (broń, pancerz) i +2% (tarcze).

#### 9.3.5 Doganianie (ochrona nowych graczy)
- Jeśli poziom technologii gracza jest niższy niż średni poziom tej technologii wśród aktywnych graczy serwera, badanie kosztuje 30% mniej i trwa 30% krócej. Przy różnicy 3 lub więcej poziomów: 50% mniej.
- Nowicjusz i gracz po odrodzeniu szybko nadrabia podstawowe poziomy, a liderzy płacą pełną cenę za wysokie.

#### 9.3.6 Badania a rasy
| Rasa | Tańsze o 20% |
|---|---|
| Kupcy | Ładownie, technologie wydobycia, napędy |
| Rój | Broń lekka, inżynieria stoczniowa |
| Kolosy | Broń ciężka, pancerz kadłuba, tarcze okrętowe |
| Forteca | Obrona planetarna, tarcze planetarne, artyleria naziemna |

#### 9.3.7 Utrata i przejęcie
- Technologie należą do gracza, nie do planety. Nie można ich ukraść ani stracić przy utracie planety.
- Zdobycie planety z laboratorium daje zdobywcy budynek laboratorium (z obniżonym poziomem), ale nie technologie poprzedniego właściciela.
- Po śmierci gracz traci technologie i zaczyna od zera, ale z doganianiem (sekcja 9.3.5).

## 10. Jednostki

### 10.0 Zasady balansu (jak liczone są koszty)
- **Klasy rozmiaru:** mała, średnia, duża, ogromna. Klasa decyduje o mnożnikach obrażeń (sekcja 11.1) i o miejscach w hangarze (mała 1, średnia 2, duża 4, ogromna 10).
- **Wartość zasobów:** 1 surowiec = 1, 1 stop = 3, 1 komponent = 9, 1 paliwo = 2, 1 żywność = 1. Koszty jednostek podano w tej wartości, żeby dało się je porównywać.
- **Moc bojowa** = √(wytrzymałość efektywna × obrażenia efektywne). Wytrzymałość efektywna to struktura powiększona przez pancerz, a obrażenia efektywne to atak × liczba celów, uśrednione na typowy skład przeciwnika.
- **Koszt jest proporcjonalny do mocy bojowej.** Według prawa kwadratowego Lanchestera siła floty o stałym budżecie rośnie z (moc / koszt)², więc tylko taka proporcja daje równe szanse tanim i drogim jednostkom.
- **Korekta symulacją:** koszty i statystyki zostały dostrojone turniejem: każda czysta flota przeciw każdej innej, budżet 30 000 wartości, 20–60 bitew na parę. Średni wynik każdej jednostki mieści się w przedziale od −0,18 do +0,14 (skala od −1 do +1), więc **żadna jednostka nie jest najlepsza do wszystkiego**, ale każda wyraźnie wygrywa ze swoimi celami.
- **Utrzymanie** to ok. 2% wartości jednostki dziennie, płacone w żywności (sekcja 10.4).

### 10.1 Statki bojowe
| Jednostka | Klasa | Koszt | Wartość | Struktura | Atak | Pancerz | Cele na strzał | Mnożniki | Prędkość | Paliwo: start + na LY | Ładowność | Utrzymanie (żywność/h) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Przechwytywacz** | mała | 35 stopów, 3 komponenty | 132 | 25 | 10 | 1 | 1 | ×2,0 vs mała | 100 LY/h | 0,5 + 0,08/LY | 15 | 0,1 |
| **Myśliwiec** | mała | 55 stopów, 6 komponentów | 219 | 30 | 14 | 2 | 1 | ×1,5 vs średnia, ×1,2 vs duża | 80 LY/h | 1 + 0,1/LY | 30 | 0,2 |
| **Fregata** | średnia | 190 stopów, 20 komponentów | 750 | 130 | 10 | 10 | 3 | ×1,8 vs mała | 60 LY/h | 2 + 0,25/LY | 80 | 0,6 |
| **Bombowiec** | średnia | 200 stopów, 35 komponentów | 915 | 90 | 60 | 8 | 1 | ×0,5 vs mała, ×0,8 vs średnia, ×1,1 vs duża, ×1,5 vs ogromna i planeta | 50 LY/h | 2 + 0,3/LY | 60 | 0,8 |
| **Niszczyciel** | duża | 450 stopów, 80 komponentów | 2 070 | 320 | 35 | 18 | 2 | ×2,0 vs średnia, ×0,6 vs mała | 45 LY/h | 3 + 0,6/LY | 120 | 1,7 |
| **Krążownik** | duża | 700 stopów, 115 komponentów | 3 135 | 500 | 40 | 25 | 2 | ×1,3 vs mała | 30 LY/h | 5 + 1,0/LY | 200 | 2,6 |
| **Pancernik** | ogromna | 2 800 stopów, 590 komponentów | 13 710 | 1 600 | 70 | 40 | 4 | ×1,6 vs duża | 20 LY/h | 12 + 2,5/LY | 400 | 11,4 |

### 10.2 Statki pomocnicze
| Jednostka | Klasa | Koszt | Wartość | Struktura | Pancerz | Prędkość | Paliwo: start + na LY | Ładowność | Utrzymanie | Funkcja |
|---|---|---|---|---|---|---|---|---|---|---|
| **Sonda** | mała | 30 stopów, 10 komponentów | 180 | 5 | 0 | 120 LY/h | 0,5 + 0,05/LY | 0 | 0,1 | Zwiad i skanowanie (sekcja 13) |
| **Transportowiec** | średnia | 150 stopów | 450 | 120 | 10 | 40 LY/h | 2 + 0,5/LY | 500 (Kupcy 625) albo 4 miejsca dla jednostek lądowych | 0,4 | Handel, grabież, desant |
| **Ciężki transportowiec** | duża | 400 stopów, 40 komponentów | 1 560 | 400 | 20 | 30 LY/h | 4 + 1,2/LY | 2 000 albo 16 miejsc dla jednostek lądowych | 1,3 | Tańszy transport na dużą skalę: zużywa ok. 40% mniej paliwa na jednostkę ładunku, ale jest wolny |
| **Kolonizator** | średnia | 300 stopów, 50 komponentów, 200 żywności | 1 550 | 100 | 5 | 40 LY/h | 2 + 0,5/LY | 0 | 1,3 | Zajmuje wolną planetę (sekcja 10.5). Zużywa się przy lądowaniu |
| **Okręt naprawczy** | średnia | 250 stopów, 40 komponentów | 1 110 | 150 | 10 | 50 LY/h | 2 + 0,3/LY | 0 | 0,9 | Po bitwie naprawia 25% utraconej struktury ocalałych jednostek floty. W locie naprawia flotę o 10% na godzinę |

Statki pomocnicze nie strzelają, ale biorą udział w bitwie jako cele.

### 10.3 Jednostki lądowe
| Jednostka | Klasa | Koszt | Wartość | Struktura | Atak | Pancerz | Cele na strzał | Mnożniki | Miejsca w transporcie | Utrzymanie |
|---|---|---|---|---|---|---|---|---|---|---|
| **Piechota** (oddział) | mała | 17 stopów | 51 | 20 | 4 | 1 | 1 | — | 1 | 0,05 |
| **Szturmowcy** | mała | 35 stopów, 6 komponentów | 159 | 35 | 9 | 4 | 1 | ×1,5 vs duża | 1 | 0,15 |
| **Artyleria polowa** | średnia | 120 stopów, 18 komponentów | 522 | 80 | 10 | 5 | 3 | ×1,6 vs mała, ×0,6 vs duża | 2 | 0,4 |
| **Czołg** | duża | 200 stopów, 42 komponenty | 978 | 200 | 25 | 30 | 1 | ×0,7 vs mała | 2 | 0,8 |

**Kontry lądowe (sprawdzone turniejem):** artyleria > piechota i szturmowcy, czołg > artyleria, szturmowcy > czołg. Piechota to tani wypełniacz i milicja.

### 10.4 Utrzymanie
- Każda jednostka zużywa żywność (załoga) według tabel. To ok. 2% jej wartości dziennie.
- Żywność pobierana jest z planety macierzystej jednostki (tej, do której jest przypisana), także gdy jednostka jest w locie albo stacjonuje u sojusznika.
- **Głód:** gdy na planecie macierzystej zabraknie żywności, jej jednostki mają −25% ataku i nie są naprawiane. Populacja planety ma pierwszeństwo do żywności.
- Rój płaci +25% utrzymania (większy apetyt), ale jednostki są tańsze w budowie (sekcja 3).
- Przykład skali: 20 myśliwców zjada ok. 4 żywności/h, krążownik ok. 2,6/h, pancernik ok. 11/h (ponad jedna trzecia farmy poziomu 1). Duża flota wymaga rozbudowanych farm i silosów.

### 10.5 Kolonizacja wolnych planet
- Wolną (niczyją) planetę zajmuje się kolonizatorem. Po wylądowaniu planeta dostaje rdzeń (sekcja 8.1), 10 mieszkańców i jedno mieszkanie poziomu 1. Kolonizator znika.
- Na wolnych planetach nie ma obrony, ale wolne planety w układzie kontrolowanym przez innego gracza można kolonizować tylko po wygraniu bitwy z jego flotą lub stacją orbitalną w tym układzie.
- Zajęte planety innych graczy zdobywa się desantem (sekcja 11.4), nie kolonizatorem.

### 10.6 Kontry statków (sprawdzone turniejem)
| Jednostka | Wygrywa z | Przegrywa z |
|---|---|---|
| Przechwytywacz | myśliwiec, bombowiec, niszczyciel | fregata, krążownik |
| Myśliwiec | bombowiec, niszczyciel | przechwytywacz, fregata, krążownik |
| Fregata | myśliwiec, przechwytywacz | niszczyciel, krążownik, bombowiec |
| Bombowiec | krążownik, pancernik, fregata | myśliwiec, przechwytywacz, niszczyciel |
| Niszczyciel | fregata, bombowiec | przechwytywacz, myśliwiec, pancernik |
| Krążownik | myśliwiec, przechwytywacz, fregata | bombowiec, pancernik |
| Pancernik | niszczyciel, krążownik | bombowiec |

Wynik turnieju (bilans od −1 do +1, gdzie +1 oznacza zwycięstwo bez strat; wiersz przeciw kolumnie, równe budżety):
| | Przech. | Myśl. | Freg. | Bomb. | Niszcz. | Krąż. | Panc. | Średnio |
|---|---|---|---|---|---|---|---|---|
| Przechwytywacz | — | +0,74 | −0,94 | +0,57 | +0,74 | −0,71 | +0,08 | +0,08 |
| Myśliwiec | −0,74 | — | −0,74 | +0,92 | +0,63 | −1,00 | −0,12 | −0,18 |
| Fregata | +0,94 | +0,74 | — | −0,36 | −1,03 | −0,50 | −0,12 | −0,05 |
| Bombowiec | −0,57 | −0,92 | +0,36 | — | −0,80 | +0,52 | +0,92 | −0,08 |
| Niszczyciel | −0,74 | −0,63 | +1,03 | +0,80 | — | −0,04 | −0,72 | −0,05 |
| Krążownik | +0,71 | +1,00 | +0,50 | −0,52 | +0,04 | — | −0,87 | +0,14 |
| Pancernik | −0,08 | +0,12 | +0,12 | −0,92 | +0,72 | +0,87 | — | +0,14 |

**Wnioski:**
- Każda jednostka ma co najmniej dwóch wyraźnych przeciwników, więc czysta flota jednego typu jest ryzykowna.
- Flota mieszana nie jest automatycznie bezpieczna: w teście przegrała z czystymi przechwytywaczami i krążownikami, a wygrała z bombowcami, niszczycielami i pancernikami. **O wyniku decyduje zwiad** i dobór floty pod przeciwnika.
- Pancernik to najdroższa jednostka (ok. 23 h budowy), ale nie wygrywa wszystkiego: tania grupa bombowców niszczy go z zyskiem.

### 10.7 Inne zasady
- **Flota leci z prędkością najwolniejszej jednostki.**
- **Czas budowy:** 1 minuta na każde 10 jednostek wartości **[TEST]**. Przechwytywacz ok. 13 min, myśliwiec ok. 22 min, krążownik ok. 5 h, pancernik ok. 23 h.
- **Hangary:** jednostki stacjonujące zajmują miejsca według klasy. Jednostki w drodze nie zajmują miejsc, ale muszą mieć wolne miejsce przy powrocie, inaczej krążą na orbicie i nie bronią planety.
- **Naprawa:** uszkodzone jednostki w hangarze odzyskują 10% struktury na godzinę (okręt naprawczy działa także poza hangarem).
- **Ładowność statków bojowych** jest celowo mała: wystarcza, żeby nalot się zwracał, ale do wywiezienia większości łupu potrzebne są transportowce.

### 10.8 Preferencje ras
- **Rój:** przechwytywacze, myśliwce, piechota. Tanie i szybkie w budowie.
- **Kolosy:** niszczyciele, krążowniki, pancerniki, czołgi. Flagowiec wzmacnia największą jednostkę floty.
- **Forteca:** fregaty, okręty naprawcze i budynki obronne.
- **Kupcy:** transportowce, ciężkie transportowce, kolonizatory.
Każda rasa może budować wszystkie jednostki. Preferencje wynikają z modyfikatorów ras (sekcja 3), a nie z blokad.

## 11. Walka

### 11.1 Wzór obrażeń
**obrażenia = A × A / (A + P) × mnożnik klasy**

- A to atak (po mnożniku klasy), P to pancerz celu.
- Obrażenia nigdy nie spadają do zera, ale pancerz wyraźnie je zmniejsza.
- **Mnożniki klas** są podane w tabelach jednostek i budynków obronnych. Brak mnożnika oznacza ×1,0.
- Planeta (tarcza, budynki przy bombardowaniu) liczy się jak cel klasy ogromnej.

### 11.2 Przebieg bitwy
1. Bitwa trwa maksymalnie **8 rund**.
2. W każdej rundzie każda jednostka strzela do tylu losowych celów przeciwnika, ile ma „celów na strzał”.
3. Nadmiarowe obrażenia przepadają. Dlatego wiele małych jednostek „pochłania” silne pojedyncze strzały (słabość niszczyciela i bombowca), a wiele celów na strzał (fregata, krążownik, pancernik) jest kontrą na rój.
4. Obie strony strzelają jednocześnie, poza Bastionem Fortecy (budynki obronne strzelają pierwsze).
5. Po 8 rundach bez rozstrzygnięcia atakujący wycofuje się, a ocalałe jednostki wracają.
6. Losowość z seedem bitwy, żeby wynik był odtwarzalny w testach.
7. Raport z bitwy trafia do obu stron i zawiera straty, zdobycze oraz informację o składzie przeciwnika.

### 11.3 Obrona planety
Warstwy obrony, w kolejności:
1. **Tarcza planetarna:** pula punktów pochłaniająca obrażenia przed budynkami obronnymi i jednostkami. 500 punktów na poziom 1 (×1,3 za poziom), regeneracja 50 pkt/h (Forteca 100 pkt/h).
2. **Budynki obronne** (koszt liczony tą samą metodą co jednostki, z rabatem 20%, bo nie mogą latać; bez utrzymania w żywności, zużywają energię):

| Budynek | Koszt | Wartość | Struktura | Atak | Pancerz | Cele na strzał | Mnożniki | Energia/h |
|---|---|---|---|---|---|---|---|---|
| **Działko przeciwlotnicze** | 240 stopów, 35 komponentów | 1 035 | 200 | 12 | 15 | 4 | ×1,8 vs mała | 10 |
| **Wyrzutnia torped** | 350 stopów, 56 komponentów | 1 554 | 250 | 90 | 20 | 1 | ×0,4 vs mała, ×1,4 vs duża, ×1,6 vs ogromna | 15 |
| **Działo obronne** | 450 stopów, 65 komponentów | 1 935 | 300 | 45 | 30 | 2 | — | 20 |

   Budynki obronne też mają kontry: działka przeciwlotnicze nie zatrzymają krążowników, a wyrzutnie torped przegrywają z rojem myśliwców. Dobra obrona łączy wszystkie trzy.
3. **Jednostki w hangarach:** bronią planety automatycznie. Jednostki, które wyleciały do ataku, przestają jej bronić.

Obrona działa automatycznie, także gdy właściciel jest offline.

### 11.4 Desant i zdobywanie planety
1. Flota musi wygrać bitwę w kosmosie i zniszczyć tarczę oraz działa.
2. Transportowce z jednostkami lądowymi lądują i walczą z garnizonem (tym samym wzorem).
3. **Garnizon:** jednostki lądowe w hangarach plus **milicja**: 1 darmowy oddział piechoty na każde mieszkanie.
4. **Po zdobyciu:** każdy budynek traci 1 poziom (minimum 1), działa i tarcza są zniszczone, populacja spada o połowę, zasoby w magazynie przechodzą na zdobywcę (poza zawartością schronu, która przepada).
5. **Stolica** nie może zostać zdobyta, dopóki gracz ma inne planety. Gdy zostaje mu tylko stolica, można ją zdobyć, a gracz ginie (sekcja 15).

### 11.5 Grabież
- **Każdy statek ma ładowność** (tabela w sekcji 10.1), także myśliwce. Zwycięska flota zabiera zasoby z magazynów, ile zmieści.
- **Bez limitu procentowego:** można wywieźć wszystko, co nie jest chronione. Ogranicza to tylko ładowność floty.
- **Chronione zawsze:** rdzeń planety (sekcja 8.1) i zawartość schronu.
- **Wybór ładunku:** gracz ustawia przed wylotem priorytety (np. najpierw paliwo, potem stopy). Bez ustawień flota zabiera zasoby proporcjonalnie.
- **Zwrot kosztów:** ładowność jest dobrana tak, żeby udany nalot co najmniej zwracał paliwo zużyte na lot (sekcja 11.5.1).
- Zrabowane zasoby lecą z flotą do domu. Jeśli flota zostanie przechwycona po drodze (blokada, sekcja 12.3), zwycięzca tej bitwy przejmuje ładunek.

#### 11.5.1 Opłacalność nalotu (sprawdzone wyliczenie)
Przykład: 10 myśliwców leci do celu oddalonego o 40 LY (ok. 2 skoki) i wraca.
- Paliwo: 10 × (1 + 0,1 × 40) × 2 kierunki = 100 paliwa, czyli ok. 200 lodu.
- Ładowność: 10 × 30 = 300 jednostek łupu (średnio ok. 450 wartości).
- Udany nalot daje ponad dwa razy więcej, niż kosztował.

**Próg opłacalności** (lot w obie strony, pełna ładowność, łup średnio 1,5 wartości za jednostkę):
| Jednostka | Nalot się zwraca do odległości |
|---|---|
| Myśliwiec | ok. 100 LY |
| Bombowiec | ok. 70 LY |
| Krążownik | ok. 70 LY |
| Transportowiec | ok. 370 LY (zawsze, w całej galaktyce) |

Wniosek: myśliwce opłaca się wysyłać po łup do ok. 5 skoków. Ciężkie statki bojowe walczą, a łup na dalekich wyprawach wywożą transportowce.

Nieudany nalot (cel bez łupu albo silna obrona) oznacza stratę paliwa, więc **zwiad przed atakiem się opłaca**.

#### 11.5.2 Fala transportowców (oczyszczanie planety)
- Gdy obrona planety zostanie zniszczona (tarcza na zero, brak dział i jednostek w hangarach), planeta ma status **bezbronna**.
- Do bezbronnej planety transportowce mogą lecieć **same, bez eskorty**, i wywieźć resztę zasobów bez walki.
- Status **bezbronna** kończy się, gdy właściciel odbuduje działo, tarcza zregeneruje się powyżej zera albo wrócą jego jednostki. Wtedy transportowce bez eskorty zostaną zaatakowane jak zwykła flota.
- Typowy schemat: flota bojowa niszczy obronę i zabiera, ile może, a za nią leci fala transportowców (500 ładowności każdy), która wywozi resztę. Łup idzie do hut i stoczni, z niego powstają kolejne statki.
- **Obrona przed tym:** schron, szybka odbudowa tarczy (Forteca), wspólna obrona sojuszników i ostrzeżenie ze skanera.

### 11.6 Bombardowanie infrastruktury
- Flota, która wygrała z obroną, może zamiast desantu lub grabieży **bombardować** planetę.
- Każde 200 punktów obrażeń zadanych planecie po zniszczeniu obrony obniża o 1 poziom losowy budynek. Budynek na poziomie 1 zostaje zburzony **[TEST]**.
- Bombowce zadają planecie obrażenia ×1,5 (sekcja 11.1), więc są główną jednostką do bombardowania.
- Rdzeń planety jest odporny. Właściciel zawsze zachowuje planetę i zbiór awaryjny, a odbudowę może przyspieszyć transportami z innych planet lub od sojuszników.
- Bombardowanie to sposób na osłabienie rywala bez zajmowania jego planety: tańszy niż desant. Flota bombardująca może jednocześnie zabrać łup w granicach swojej ładowności.

## 12. Ruch, handel, blokady i przechwytywanie

### 12.1 Ruch
- Ruch wyłącznie po trasach hiperprzestrzennych.
- **Odległość:** suma długości tras (w LY) na wybranej drodze. Gracz wybiera trasę ręcznie albo serwer wylicza najkrótszą (algorytm Dijkstry po LY, nie po liczbie skoków).

#### 12.1.1 Czas lotu
**czas = odległość / prędkość najwolniejszej jednostki + 3 min za każdy skok**
- 3 minuty to wejście w hiperprzestrzeń w każdym układzie po drodze. Dzięki temu droga przez wiele małych skoków jest trochę wolniejsza niż przez jeden długi.
- Flota przelatuje przez układy pośrednie w wyliczonych momentach. Ma to znaczenie dla blokad (sekcja 12.3).

#### 12.1.2 Paliwo
**paliwo jednostki = koszt startu + zużycie na LY × odległość**
- Paliwo floty to suma paliwa wszystkich jednostek.
- **Atak, nalot, transport w obie strony:** przy starcie pobierane jest paliwo na lot w obie strony. Flota nigdy nie utknie bez paliwa.
- **Przelot jednokierunkowy** (przeniesienie floty, stacjonowanie u sojusznika): pobierane tylko na jeden kierunek.
- Jeśli flota zginie, paliwo na powrót przepada.
- Jeśli flota wraca wcześniej (odwołanie, wycofanie z bitwy), niewykorzystane paliwo wraca do magazynu.
- Bez paliwa flota nie wystartuje. Interfejs pokazuje koszt i czas przed wysłaniem.
- Rasa Kupców: transportowce −25% paliwa (sekcja 3).

#### 12.1.3 Przykłady (wartości sprawdzone skryptem)
| Jednostka | 20 LY (1 skok) | 100 LY (5 skoków) | 200 LY (9 skoków) |
|---|---|---|---|
| Sonda | 13 min, 1,5 paliwa | 65 min, 5,5 | 2 h 7 min, 10,5 |
| Myśliwiec | 18 min, 3 | 1 h 30 min, 11 | 2 h 57 min, 21 |
| Bombowiec | 27 min, 8 | 2 h 15 min, 32 | 4 h 27 min, 62 |
| Transportowiec | 33 min, 12 | 2 h 45 min, 52 | 5 h 27 min, 102 |
| Krążownik | 43 min, 25 | 3 h 35 min, 105 | 7 h 7 min, 205 |

Wartości dotyczą jednej jednostki i jednego kierunku. Pozostałe jednostki liczy się tymi samymi wzorami z tabel w sekcjach 10.1 i 10.2.

#### 12.1.4 Koszt transportu zasobów (handel, rynek, trasy cykliczne)
Jeden transportowiec (500 jednostek, ok. 750 wartości), lot w obie strony:
| Odległość | Paliwo | Koszt jako % ładunku | Czas w obie strony |
|---|---|---|---|
| 10 LY | 14 | ok. 4% | 30 min |
| 30 LY | 34 | ok. 9% | 1,5 h |
| 60 LY | 64 | ok. 17% | 3 h |
| 100 LY | 104 | ok. 28% | 5 h |
| 170 LY | 174 | ok. 46% | 8,5 h |
| 240 LY | 244 | ok. 65% | 12 h |

Wniosek: handel z bliskimi sąsiadami jest prawie darmowy, a z drugim końcem galaktyki pochłania większość ładunku. Lokalizacja ma znaczenie, a węzły blisko wielu graczy stają się naturalnymi centrami handlu.

#### 12.1.5 Loty wewnątrz układu
- Planety jednego układu dzieli 1–5 LY (orbity).
- Lot liczy się tym samym wzorem, ale bez 3 min za skok. Np. transportowiec na 2 LY: 3 min i 3 paliwa.
- Przy pełnej kontroli układu loty wewnątrz niego nie zużywają paliwa (sekcja 2.4).
- **Kosmoport** ogranicza liczbę flot startujących jednocześnie z planety.

### 12.2 Handel i trasy cykliczne
- **Transport jednorazowy:** transportowiec zabiera zasoby z planety A i dostarcza na planetę B (własną lub sojusznika). Lot w obie strony zajmuje czas i zużywa paliwo.
- **Trasa cykliczna:** gracz ustawia stałe zlecenie (np. „co 4 h zabierz 500 tytanu z planety A do huty na planecie B”). Transporty kursują automatycznie, także gdy gracz jest offline.
- Przy pełnym magazynie odbiorcy transport czeka na orbicie, a gracz dostaje powiadomienie.
- **Między sojusznikami:** brak administracyjnego limitu. Ograniczają go transportowce i paliwo.

### 12.3 Blokady i przechwytywanie
- **Blokada:** flota bojowa ustawiona w trybie blokady w układzie zatrzymuje każdą wrogą flotę, która przelatuje przez ten układ. Dochodzi do bitwy.
- Transporty i floty, które przelatują przez zablokowany układ, muszą walczyć albo szukać innej drogi.
- **Eskorta:** transport może lecieć razem z flotą bojową.
- **Stacja orbitalna:** przy pełnej kontroli układu daje blokadę stałą bez floty (struktura 800, atak 30, pancerz 20, 2 cele na strzał) **[TEST]**.
- Dzięki temu **trasy handlowe mają znaczenie strategiczne**: trzeba je chronić, a węzły galaktyki są kluczowe.

### 12.4 Rynek (giełda graczy)
Rynek pozwala wymieniać zasoby między wszystkimi graczami, nie tylko w sojuszu. Towar zawsze trzeba fizycznie przewieźć, więc rynek nie omija mechaniki paliwa, odległości i blokad.

**Dostęp: budynek Giełda handlowa.** Rynek jest niedostępny, dopóki gracz nie wybuduje Giełdy handlowej na co najmniej jednej planecie.
- **Wymagania:** kosmoport poziom 3 na tej samej planecie **[TEST]**.
- **Koszt poziomu 1:** 400 stopów, 100 komponentów **[TEST]**. Czas budowy według zwykłego wzoru ulepszeń.
- **Zużycie:** 15 energii/h, 5 robotników.
- **Poziomy giełdy (maks. 5):**
  | Poziom | Aktywne oferty naraz | Opłata za wystawienie |
  |---|---|---|
  | 1 | 2 | 2% |
  | 2 | 4 | 1,75% |
  | 3 | 6 | 1,5% |
  | 4 | 8 | 1,25% |
  | 5 | 10 | 1% |
- Oferty można wystawiać i przyjmować **tylko z planet, na których stoi giełda**. Zakupiony towar też przylatuje na planetę z giełdą.
- **Zniszczenie giełdy** (bombardowanie lub zdobycie planety) zamyka aktywne oferty z tej planety. Zarezerwowany towar wraca do magazynu, więc może zostać ograbiony.
- Przy zdobyciu planety giełda przechodzi na nowego właściciela (z obniżonym poziomem, jak każdy budynek).
- Kolejność rozwoju sprawia, że rynek pojawia się zwykle po kilku dniach gry, gdy gracz ma już nadwyżki do handlu.

**Waluta:** brak osobnej waluty. Handel to wymiana zasobu na zasób, np. „sprzedam 1 000 tytanu za 600 paliwa”. Nie trzeba dodawać pieniędzy do ekonomii, a ceny same pokazują, czego w galaktyce brakuje.

**Wystawianie oferty:**
- Sprzedający wybiera planetę, zasób, ilość i cenę w innym zasobie.
- Wystawiony towar zostaje **zarezerwowany** w magazynie tej planety. Nie można go zużyć ani ograbić, dopóki oferta wisi. Wycofanie oferty zwalnia rezerwację.
- Opłata za wystawienie: od 2% do 1% wartości oferty (zależnie od poziomu giełdy), płacona w zasobie oferty **[TEST]**. Zniechęca do zaśmiecania rynku.
- Oferta wygasa po 48 h.

**Kupno i transport:**
- Kupujący akceptuje ofertę i wysyła transportowce z zapłatą do planety sprzedającego. **Paliwo płaci kupujący**, więc oferty z daleka są w praktyce droższe. Interfejs pokazuje cenę razem z kosztem paliwa.
- Po przylocie transportowców następuje wymiana: zapłata trafia do magazynu sprzedającego, towar ładuje się na transportowce i wraca do kupującego.
- **Ryzyko po drodze:** transport z zapłatą albo z towarem może zostać przechwycony przez blokadę. Wtedy przewożone zasoby przepadają albo przejmuje je zwycięzca. Eskorta ma sens także w handlu.
- Jeśli sprzedający straci planetę albo zostanie ograbiony przed przylotem, rezerwacja chroni towar i wymiana dochodzi do skutku.

**Rasa Kupców:** zerowa opłata za wystawienie i widzą oferty, zanim pojawią się dla innych (15 min wcześniej) **[TEST]**.

**Do decyzji później:** czy dodać neutralne stacje handlowe w wybranych układach, które skracają drogę i przejmują część transportu za opłatą.

## 13. Mgła wojny, skanowanie i ostrzeżenia
- Gracz widzi: swoje planety i układy, odkryte części galaktyki, obszary w zasięgu skanerów.
- **Sonda** odkrywa układ i skanuje planety: typ, złoża, budynki, obronę, jednostki w hangarach.
- **Wiek skanu:** dane skanu są widoczne z oznaczeniem wieku. Po 6 h są oznaczone jako nieaktualne.
- **Ostrzeżenie o ataku:** wroga flota zostaje wykryta, gdy wejdzie w zasięg skanera planety. Czas ostrzeżenia zależy od zasięgu skanera i prędkości floty (np. skaner poziom 3 = 45 LY: myśliwce wykryte ok. 34 min przed przylotem, krążowniki ok. 90 min).
- Serwer wysyła klientowi tylko dane widoczne dla niego.

## 14. Zasięg administracji (anty-kula śnieżna)
- Planeta oddalona od stolicy (lub centrum administracyjnego) o więcej niż 80 LY (po trasach) produkuje o 5% mniej za każde dodatkowe 20 LY, maks. −30%.
- **Centrum administracyjne:** budynek, który działa jak druga stolica. Jedno na każde 8 posiadanych planet **[TEST]**.
- Hamuje to ekspansję bez planu i nagradza zwarte imperia oraz współpracę w sojuszach.

## 15. Gracze, dołączanie, śmierć i ochrona
- **Próg zajętości mapy: 70%.** Po jego przekroczeniu nowi gracze nie mogą dołączyć.
- **Start:** nowy gracz dostaje planetę startową w wolnym układzie, w odległości co najmniej 60 LY (po trasach) od innych graczy.
- **Ochrona początkowa:** 48 h nietykalności. Kończy się wcześniej, jeśli gracz sam zaatakuje kogoś.
- **Śmierć:** gracz traci wszystkie planety i jednostki. Może zacząć od razu, z nową planetą startową i ponowną ochroną 48 h.
- **Odrodzenie po przekroczeniu 70%:** propozycja: gracz, który zginął, ma pierwszeństwo przed nowymi graczami i może się odrodzić, jeśli istnieje jakikolwiek wolny układ z planetą startową **[DO DECYZJI]**.
- **Ranking:** liczba kontrolowanych układów, planet i siła floty. Gra nie ma końca, ale ranking pokazuje, kto prowadzi.

## 16. Sojusze
- Tworzenie: zaproszenie, przyjęcie, opuszczenie. Maks. 6 członków na etapie 1 **[TEST]**.
- **Widoczność:** planety wszystkich członków są automatycznie widoczne dla pozostałych, łącznie z budynkami i obroną. Sojusznik nie może ukryć planety.
- Sojusznicy współdzielą odkrytą mapę galaktyki i ostrzeżenia o atakach.
- **Planet nie można dzielić ani łączyć zasobów.** Każdy gracz zarządza własnymi planetami.
- **Transport między sojusznikami:** bez limitu, ograniczony transportowcami i paliwem.
- **Wspólna obrona:** gracz może wysłać flotę do planety sojusznika, gdzie stacjonuje i broni jej (zajmuje miejsca w hangarach sojusznika).
- **Kontrola układu** liczona dla sojuszu łącznie (sekcja 2.4).
- Sojusznicy mogą wspólnie atakować. Atak na sojusznika jest zablokowany.
- **Opuszczenie sojuszu:** gracz traci widoczność planet pozostałych członków. Odkryta mapa zostaje. Jego floty stacjonujące u byłych sojuszników wracają do domu.

## 17. Powiadomienia
- **Krytyczne (push i e-mail):** wykryty atak na planetę, przegrana bitwa, utrata planety.
- **Zwykłe (push):** zapełnienie magazynu, koniec ulepszenia, powrót floty, transport czeka na orbicie, kończy się materiał rozpadowy.
- **Dziennik zdarzeń w grze** i podsumowanie przy powrocie: co wyprodukowano, co się wydarzyło.
- Gracz może wyłączyć wybrane rodzaje powiadomień.

## 18. Styl graficzny: proste 3D
- **Ogólnie:** prosta grafika 3D w stylu filmów science fiction z lat 80., uproszczona. Modele low-poly, płaskie cieniowanie, bez tekstur.
- **Akcenty:** neonowe linie wireframe na krawędziach modeli, siatki perspektywiczne, poświata na gwiazdach i ważnych znacznikach.
- **Mapa galaktyki:** scena 3D z układami jako świecącymi punktami i trasami jako liniami. Węzły wyróżnione grubszymi liniami.
- **Planety:** kule z pierścieniem albo siatką południków. Kolor zależny od typu planety.
- **Statki i jednostki:** proste bryły, kilkanaście wielokątów każda. Kształt odróżnia rolę.
- **Interfejs:** 2D nad sceną 3D. Panele jak ekran terminala, cienkie ramki, czcionka monospace.
- **Animacje:** smugi ruchu, pulsujące okręgi (zasięg skanerów, tarcze, blokady), miganie ostrzeżeń. Bez cząsteczek.

**Paleta:**
| Element | Kolor |
|---|---|
| Tło | Granat lub czerń |
| Akcent podstawowy | Cyjan |
| Ostrzeżenia, wrogowie | Magenta |
| Zasoby i uwagi | Żółty |
| Stan poprawny | Zielony fosforowy |
| Kupcy | Złoty |
| Rój | Pomarańczowy lub czerwony |
| Kolosy | Stalowy niebieski |
| Forteca | Zielony |

Kolor rasy jest spójny na mapie, w układzie i w interfejsie. Maksymalnie trzy akcenty naraz.

**Technika:** Three.js z prostymi materiałami (`MeshBasicMaterial`, `MeshLambertMaterial` z `flatShading`, `LineBasicMaterial`) i geometriami generowanymi kodem. Interfejs w HTML/CSS nad canvasem.

## 19. Architektura techniczna
- **Monorepo (pnpm workspaces):** `packages/shared` (logika, bez DOM), `packages/ai` (przeciwnicy komputerowi, korzystają tylko z publicznych komend i widoku gracza), `packages/client` (Three.js i interfejs), `packages/server` (od Fazy 4).
- **Symulacja:** czyste funkcje `(stan, komenda, czas) => nowy stan`, stały tick (np. 10/s), deterministyczna generacja z seedem.
- **Leniwe przeliczanie:** produkcja planety nie musi być liczona co tick. Wystarczy przeliczać ją od ostatniego znacznika czasu przy każdym odczycie lub zdarzeniu. To pozwoli później obsłużyć setki graczy.
- **Kolejka zdarzeń:** przyloty flot, końce budów i bitwy jako zdarzenia z czasem wykonania.
- **Autorytet serwera:** klient wysyła komendy, serwer je waliduje i rozsyła zmiany.
- **Dane w konfiguracji:** wszystkie liczby z tego dokumentu w `packages/shared/src/config/`, nie w kodzie.
- **Zegar gry:** symulacja używa czasu gry z mnożnikiem i pauzą, nigdy zegara systemowego (sekcja 23.2).
- **Jedna symulacja, dwa miejsca:** tryb jednoosobowy uruchamia `shared` i `ai` w przeglądarce (np. w Web Workerze), tryb sieciowy na serwerze. Kod gry jest ten sam.

## 20. Fazy
- **Faza 1:** prototyp lokalny: galaktyka, planety, produkcja, magazyny, energia, populacja, budynki, badania, ruch i paliwo, transporty i trasy cykliczne, mgła wojny, model sojuszy, dane jednostek. Zegar gry z mnożnikiem i pauzą (sekcja 23.2). Bez walki. Prosty bot ekonomiczny do testów rozwoju.
- **Faza 2:** walka, obrona, tarcze, desant, grabież, bombardowanie.
- **Faza 3:** AI przeciwników (strategia, operacje, taktyka) i **pełny tryb jednoosobowy** w przeglądarce z zapisem gry. Pierwsza grywalna wersja.
- **Faza 4:** serwer, sieć, konta, zapis do bazy, powiadomienia, panel administratora. Kooperacja przeciw AI i gra wieloosobowa.
- **Faza 5:** blokady, przechwytywanie, kontrola układów, zasięg administracji, rynek, obrona przed inwazją.
- **Faza 6:** balans przez turnieje AI przeciw AI i testy na prawdziwych graczach, testy obciążeniowe.
- **Faza 7:** mechy (rozbudowa po stabilnej grze).

**Dlaczego tryb jednoosobowy przed serwerem:** cała gra da się wtedy przetestować bez sieci, przyspieszona ×20 lub ×60, z przeciwnikami. Błędy w ekonomii i walce wychodzą szybciej niż przy grze w czasie rzeczywistym z kolegami.

## 21. Poza zakresem
- Mechy i ich modułowe wyposażenie (Faza 7).
- Walka w czasie rzeczywistym.
- Rundy i sezony.
- Publiczna rejestracja i skalowanie do setek graczy na etapie 1.

## 22. Otwarte sprawy
1. Odrodzenie gracza po przekroczeniu progu 70% (propozycja w sekcji 15).
2. Wartości oznaczone **[TEST]** do potwierdzenia w prototypie.

## 23. Tryby gry i przeciwnicy komputerowi (AI)

### 23.1 Tryby gry
| Tryb | Gracze | Gdzie działa | Czas | Zapis |
|---|---|---|---|---|
| **Jednoosobowy** | 1 gracz i 1–11 przeciwników AI | W przeglądarce, bez serwera | Przyspieszany i z pauzą | Zapis i wczytanie stanu w przeglądarce oraz eksport do pliku |
| **Kooperacja przeciw AI** | 2–6 graczy w jednym sojuszu przeciw frakcjom AI | Na serwerze | Rzeczywisty albo stały mnożnik ustawiony przy tworzeniu świata | Na serwerze |
| **Wieloosobowy** | Ludzie, opcjonalnie uzupełnieni AI | Na serwerze | Rzeczywisty | Na serwerze |
| **Obrona przed inwazją** (wariant kooperacji) | 1–6 graczy | Serwer lub przeglądarka | Jak wyżej | Jak wyżej |

**Tryb jednoosobowy działa bez serwera.** Logika gry w `packages/shared` to czyste funkcje bez zależności od przeglądarki (sekcja 19), więc ta sama symulacja może działać w kliencie. Serwer jest potrzebny dopiero przy grze z innymi ludźmi.

### 23.2 Czas w trybie jednoosobowym
- Gra w czasie rzeczywistym, gdzie ulepszenia trwają godzinami, w pojedynkę byłaby nudna. Dlatego tryb jednoosobowy ma **mnożnik czasu**: ×1, ×5, ×20, ×60 oraz **pauzę**.
- Przy ×20 ulepszenie trwające 5 h kończy się w 15 min, a lot przez 100 LY trwa kilka minut.
- **Wymóg techniczny:** symulacja korzysta z **zegara gry**, nie z zegara systemowego. Wszystkie znaczniki czasu (produkcja, loty, budowy, badania) liczone są w czasie gry. Dzięki temu przyspieszenie i pauza działają bez zmian w logice. Ten wymóg obowiązuje od Fazy 1.
- Mnożnik czasu ustawiony przy tworzeniu świata jest dostępny także na serwerze (np. ×4 dla szybszej gry kooperacyjnej ze znajomymi). Na serwerze nie można go zmieniać w trakcie.
- Po zamknięciu karty w trybie jednoosobowym gra stoi. Nie ma produkcji offline, bo nie ma serwera, który by ją liczył.

### 23.3 Zasada uczciwości AI
- **AI gra według tych samych reguł co człowiek.** Wysyła te same komendy (`SendFleet`, `StartUpgrade` itd.) przez to samo API i przechodzi tę samą walidację. Nie ma osobnej ścieżki kodu, która mogłaby dać AI ukryte przewagi.
- **AI podlega mgle wojny.** Widzi tylko to, co odkryło i zeskanowało. Musi wysyłać sondy jak gracz.
- Na najwyższym poziomie trudności AI dostaje jawny bonus ekonomiczny, opisany w ustawieniach gry, zamiast oszukiwania z mgłą wojny.

### 23.4 Budowa AI (warstwy)
AI to algorytm oparty na regułach i ocenie użyteczności, bez uczenia maszynowego. Jest przewidywalny w testach, tani obliczeniowo i łatwy do strojenia. Działa w trzech warstwach:

**1. Strategia (co kilka godzin czasu gry)**
Wybiera jeden z celów na podstawie oceny sytuacji:
| Cel | Kiedy |
|---|---|
| Rozwój gospodarki | Brak energii, żywności, pełne magazyny lub mało kopalni |
| Ekspansja | Są wolne planety w zasięgu i jest kolonizator lub zasoby na niego |
| Zbrojenie | Wykryte zagrożenie albo flota słabsza niż sąsiadów |
| Atak | Własna flota wyraźnie silniejsza od wykrytej obrony celu |
| Badania | Gospodarka stabilna i brak zagrożenia |
| Obrona | Wykryta wroga flota w zasięgu skanera |

Każdy cel dostaje wynik użyteczności, a AI realizuje cel z najwyższym wynikiem. Osobowość (sekcja 23.5) zmienia wagi.

**2. Operacje (co kilkanaście minut czasu gry)**
- **Kolejka budowy:** gotowe „plany rozwoju” dla każdej rasy, np. akumulator, silos, magazyn, kopalnie, huta (zgodnie z kolejnością z sekcji 7.1). AI pilnuje bilansu energii, żywności i robotników przed każdą budową.
- **Skład floty:** AI dobiera jednostki do tego, co wykryło u przeciwnika, korzystając z tabeli kontr (sekcja 10.6). Bez zwiadu buduje skład mieszany.
- **Zwiad:** stale utrzymuje sondy i odświeża skany sąsiadów, gdy skan jest starszy niż 6 h.
- **Logistyka:** ustawia trasy cykliczne między planetami i dba, żeby rafinerie i huty miały surowce.

**3. Taktyka (przy każdej decyzji o walce)**
- **AI symuluje bitwę przed atakiem.** Używa tego samego silnika walki z danymi ze swojego skanu i atakuje tylko wtedy, gdy przewidywany wynik jest korzystny (próg zależy od trudności i osobowości).
- Wybiera cele według opłacalności: łup, odległość, koszt paliwa (sekcja 12.1) i ryzyko.
- Wycofuje flotę, gdy wykryje silniejszego przeciwnika w drodze, i broni planet, do których leci wróg.
- Na poziomie trudnym używa blokad na węzłach i eskortuje transporty.

**Wydajność:** AI nie liczy nic co tick. Strategię przelicza co kilka godzin czasu gry, operacje co kilkanaście minut, taktykę tylko przy zdarzeniach (wykryty wróg, powrót floty, koniec budowy). Dzięki temu nawet kilkadziesiąt AI na serwerze nie obciąża go znacząco.

### 23.5 Osobowości AI
Każda frakcja AI dostaje rasę i osobowość, które zmieniają wagi celów:
| Osobowość | Zachowanie | Pasuje do rasy |
|---|---|---|
| **Kupiec** | Rozwija gospodarkę i handel, rzadko atakuje, chętnie tworzy sojusze z innymi AI | Kupcy |
| **Najeźdźca** | Częste naloty po łup na słabsze cele, mało obrony | Rój |
| **Zdobywca** | Powolne zbrojenie, potem duże ataki na całe układy | Kolosy |
| **Żółw** | Silna obrona, ekspansja tylko na bezpieczne planety, kontratakuje po ataku | Forteca |
| **Oportunista** | Atakuje tego, kto właśnie stracił flotę albo walczy z kimś innym | Dowolna |

Rasa i osobowość są losowane albo wybierane przy tworzeniu gry.

### 23.6 Poziomy trudności
| Poziom | Czas reakcji | Zwiad i kontry | Próg ataku (przewidywana przewaga) | Bonus |
|---|---|---|---|---|
| **Łatwy** | Decyzje co 2× dłużej | Nie buduje kontr, mało zwiadu | Atakuje tylko przy 2× przewadze | −20% produkcji |
| **Normalny** | Standardowy | Buduje kontry na wykryte floty | 1,5× | Brak |
| **Trudny** | Szybszy | Stały zwiad, blokady, eskorty, ataki kilku flot naraz | 1,2× | Brak |
| **Bardzo trudny** | Szybszy | Jak trudny | 1,2× | +25% produkcji i −15% czasu badań (jawnie pokazane w ustawieniach) |

### 23.7 Kooperacja przeciw AI
- Gracze tworzą jeden sojusz. Frakcje AI mogą zawierać sojusze między sobą (osobowość Kupca i Żółwia robią to najchętniej).
- Liczba i trudność AI ustawiana przy tworzeniu świata. Zalecane: tyle frakcji AI co graczy, plus jedna.
- Wszystkie mechaniki sojuszu działają normalnie: wspólna mapa, transporty, wspólna obrona.
- **Skalowanie:** gdy gracze prowadzą wyraźnie, AI przechodzi częściej w osobowość Oportunisty i łączy siły przeciw liderowi.

### 23.8 Obrona przed inwazją (wariant PvE)
- Poza zwykłymi frakcjami AI pojawia się neutralna frakcja **Najeźdźców** spoza galaktyki. Nie ma planet ani gospodarki.
- Atakuje falami co określony czas, z rosnącą siłą: każda fala jest o 15% silniejsza od poprzedniej **[TEST]**. Skład fal zmienia się tak, żeby wymuszać różne kontry.
- Fale wchodzą od krawędzi galaktyki. Skanery dają ostrzeżenie zgodnie z sekcją 13.
- Pokonane fale zostawiają **wraki** z zasobami do zebrania transportowcami.
- Gra kończy się, gdy gracze przetrwają ustaloną liczbę fal albo stracą wszystkie stolice.
- Najeźdźców można włączyć także w zwykłej grze wieloosobowej jako wspólne zagrożenie, które zmusza ludzi do współpracy.

### 23.9 AI w grze wieloosobowej
- **Uzupełnienie:** administrator może dodać frakcje AI, gdy jest za mało ludzi. AI liczy się do progu zajętości mapy (70%).
- **Gracze nieaktywni:** AI nie przejmuje kont ludzi. Nieaktywny gracz pozostaje zwykłym celem, a jego planety bronią się automatycznie jak zawsze.
- AI jest oznaczone na mapie i w rankingu, żeby było jasne, z kim się gra.

### 23.10 AI jako narzędzie balansu
- **Turnieje AI przeciw AI:** te same frakcje AI rozgrywają setki przyspieszonych gier bez grafiki. Pozwala to sprawdzić balans ras, jednostek i badań na pełnej rozgrywce, a nie tylko w pojedynczych bitwach.
- **Testy obciążeniowe:** wiele AI na serwerze symuluje dużą liczbę graczy (Faza 6).
- **Zbieranie statystyk:** które rasy wygrywają, które jednostki są najczęściej budowane, po jakim czasie pada pierwsza planeta. To główne źródło danych do strojenia wartości **[TEST]**.
