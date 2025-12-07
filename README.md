# 🎲 ZRZUTKA - Teamplayowy Hazard

> **Wyzwanie:** Gaming: Los decyduje (Totalizator Sportowy)  
> **Kategoria:** F2P / Social Gambling / Skill-based RNG

# 🎥 [KLIKNIJ, ABY ZOBACZYĆ WIDEO PREZENTACJĘ (YouTube)](https://www.youtube.com/watch?v=7L8bn5eIWyo)

## 📖 O projekcie: Hazard jako Sport Zespołowy

**ZRZUTKA** to nie jest zwykła gra losowa. To **"Teamfight Tactics" w świecie hazardu**. 

Większość gier losowych to samotne doświadczenie. My zmieniamy to w sport drużynowy. Wyobraź sobie ten moment w meczu, gdy zawodnik oddaje strzał z połowy boiska. Strategicznie? To głupota. Statystycznie? Nie ma szans. Ale jeśli trafi – to jest **GOL SEZONU**, a trybuny szaleją. 

W **ZRZUTCE** dajemy graczom właśnie to narzędzie: możliwość irracjonalnego, ryzykownego wpłynięcia na wynik za wspólną kasę. Jeśli się uda – jesteś bohaterem ("Clutch"). Jeśli nie – zrujnowałeś budżet drużyny i czeka Cię lincz ("Troll").

---

## 💣 Dlaczego to lepsze niż Lootboxy? (The CS:GO Factor)

Mentorzy i rynek wskazują, że gracze kochają dreszczyk emocji przy otwieraniu skrzynek w CS:GO. My wzięliśmy ten mechanizm i naprawiliśmy jego największą wadę: bierność.

| Otwieranie skrzynek (CS:GO) | ZRZUTKA (Nasz Projekt) |
| :--- | :--- |
| **Samotność / Streaming** | **Pełna Kooperacja** |
| Oglądasz, jak koledze wypada nóż (lub śmieć). Możesz tylko krzyczeć "WOW". | Grasz razem z kolegami. Twój ruch może uratować ich zakład. |
| **Brak wpływu** | **Interwencja (Skill)** |
| Klikasz i czekasz. Los decyduje w 100%. | Widzisz, że wynik jest słaby? Wtrącasz się! Masz wpływ na "los". |
| **Emocje** | **Emocje + Odpowiedzialność** |
| "Szkoda, że ci nie wypadło". | "Dlaczego tego nie podbiłeś?! Mogliśmy wygrać!" – element **obwiniania się i wspólnej euforii**. |

Budujemy na "ziomkowstwie". To cyfrowy odpowiednik wspólnego darcia się na sędziego lub rzucania się sobie w ramiona po wygranym meczu.

---

## ⚙️ Główne mechaniki

### 1. Wspólny Portfel (One Team, One Dream)
* **Budżet:** Drużyna gra jako jedność przeciwko systemowi.
* **Dynamika:** Host ustawia podział wkładu, ale odpowiedzialność jest zbiorowa. Porażka jednego gracza boli wszystkich (dosłownie, bo znika wspólna kasa).

### 2. Decyzja Właściciela i Rzut
* W każdej rundzie rzuca tylko jeden gracz (właściciel kostki).
* **Wybór Zakładu:** To właściciel decyduje o ryzyku. Wybiera opcję bezpieczniejszą (**Parzyste/Nieparzyste**) lub ryzykuje celując w konkretną liczbę (**1, 2, 3, 4, 5 lub 6**) dla znacznie wyższego mnożnika.
* Reszta drużyny obserwuje ten wybór ("Co on robi?!") i przygotowuje się do ewentualnej interwencji.

### 3. System Interwencji (Mechanika "Clutch or Kick")
To nasz "Game Changer". Podczas gdy wirtualna kostka się obraca:
* Każdy z sojuszników może wydać wspólną kasę, by zmienić wynik (+/- 1 oczko).
* **Rosnące Napięcie i Poczucie "Skilla":** Im później interweniujesz (tym bardziej skuteczna interwencja), tym droższa jest ta akcja.
* **Dylemat:** Czy warto wydać 50% budżetu, by uratować zakład za 10% budżetu, ale utrzymać serię zwycięstw? Logika mówi "nie", emocje mówią "TAK".

### 4. Ranking "Bohaterów i Trolli"
* Gra śledzi interwencje. System nagradza udane ratunki i piętnuje nieudane próby pomocy.
* To buduje narrację wewnątrz grupy: *"Nie dajcie mu klikać, ostatnio nas zrujnował!"*.

### 5. Bailout & Checkout (Safety Net)
* **Druga Szansa:** Jeśli drużyna straci np. 100 jednostek, aktywuje się mechanika "rzutu ostatniej szansy" (50% szans na odzyskanie części strat). To moment "być albo nie być".
* **Lead Generation:** Przy wypłacie wygranej (podział łupów), wymagamy adresu e-mail.

---

## 🎯 Realizacja celów wyzwania (HackNation)

| Wymaganie | Nasze Rozwiązanie |
| :--- | :--- |
| **Losowość jako motor emocji** | Losowość jest tu początkiem, a nie końcem. Emocje generuje walka z tą losowością. |
| **Near-win experience** | Mechanika interwencji to dosłowne zmaterializowanie "Near-win". Było blisko? Mogłeś to zmienić, ale stchórzyłeś! |
| **Aspekt społecznościowy** | Przeniesienie doświadczenia "LAN party" do hazardu online. |
| **Lead Generation** | Naturalny checkout po emocjonującej rozgrywce. |

---

## 🎲 Proceduralna Animacja Rzutu (Reverse Time Simulation)

W przeciwieństwie do typowych gier hazardowych, gdzie rzut kostką jest odtwarzanym plikiem wideo, w **ZRZUTCE** każda trajektoria jest unikalna i generowana matematycznie w czasie rzeczywistym.

Zastosowaliśmy zaawansowane podejście **Symulacji Wstecznej (Reverse Time Generation)**. Zamiast symulować rzut "w przód" i mieć nadzieję, że kostka upadnie na właściwą ściankę, zaczynamy od stanu końcowego (wylosowana ścianka leży płasko) i generujemy jej ruch wstecz w czasie, dodając stochastyczne zaburzenia.

**Algorytm generowania ruchu:**

1.  **Cel (Target):** Serwer ustala wynik (np. ścianka "6").
2.  **Proces Stochastyczny:** Generujemy losowy proces Wienera dla logarytmu zmiany prędkości kątowej w osiach X i Y. Modelujemy to zależnością: $\log(dx(t)/t)$.
3.  **Dyskretyzacja:** Otrzymujemy losowe funkcje $x(t)$ na zdyskretyzowanej przestrzeni czasu z krokiem $dt = 0.016$ s (częstotliwość 80Hz), co zapewnia idealną płynność animacji.
4.  **Wizualizacja (Reverse Time):** Odwracamy wektor czasu. Matematyczne "rozhuśtanie się" kostki od spoczynku, wizualnie staje się naturalnym rzutem, który wytraca energię i **zawsze** idealnie ląduje na zadanym wyniku.

Dzięki temu uzyskujemy efekt, w którym fizyka rzutu wygląda naturalnie i chaotycznie, ale wynik jest deterministyczny i zgodny z logiką gry.

---

## 🔮 Roadmap: Synchronizacja Trajektorii (Seed-based Sync)

Obecnie, ze względu na architekturę "Client-Side Calculation", mimo że wynik końcowy jest ten sam dla wszystkich (synchronizowany przez Firebase), każdy gracz widzi inną, unikalną trajektorię lotu kostki (inny przebieg procesu Wienera na lokalnej maszynie).

**Planowane rozwiązanie (Deterministic RNG):**
Aby wprowadzić pełną synchronizację wizualną ("Widzę dokładnie ten sam obrót w powietrzu co Ty"), planujemy wdrożyć mechanizm oparty o **Seed Sharing**:

1.  Host losuje `seed` (ziarno losowości) dla danej rundy.
2.  `Seed` jest wysyłany do wszystkich graczy wraz z wynikiem rzutu przez WebSocket/Firebase.
3.  Algorytm procesu Wienera na każdym urządzeniu klienckim, zasilony tym samym ziarnem, wygeneruje **identyczną trajektorię** ruchu $x(t)$.

To pozwoli zachować lekkość obliczeń po stronie klienta (brak przesyłania ciężkich danych o pozycji klatka po klatce) przy jednoczesnym zapewnieniu identycznego doświadczenia wizualnego dla całej drużyny.

---

## 🛠️ Technologie i Architektura

Zdecydowaliśmy się na sprawdzony, lekki stack technologiczny ("Vanilla Web"). Dzięki temu aplikacja jest łatwo przenośna i działa natychmiastowo na dowolnym komputerze z przeglądarką, bez skomplikowanej konfiguracji środowiska.

* **Backend & Synchronizacja: Firebase Realtime Database**
    * Serce systemu. Odpowiada za błyskawiczną synchronizację stanu gry między różnymi maszynami. Dzięki temu gra działa płynnie, niezależnie od tego, na jakim komputerze jest uruchomiona.
    
* **Logika Gry: JavaScript (ES6+)**
    * Czysty kod bez ciężkich frameworków. Zapewnia pełną kontrolę nad logiką i łatwość w przenoszeniu projektu między stanowiskami (Portability).
---

## 💿 Jak uruchomić projekt

Aplikacja jest zaprojektowana tak, aby działała natychmiastowo ("Plug & Play"). Nie wymaga instalowania serwerów, Node.js ani Python.

### Instrukcja:
1.  Pobierz folder z projektem.
2.  Otwórz plik `index.html` w dowolnej nowoczesnej przeglądarce (Chrome, Firefox, Edge).
3.  Gotowe!

⚠️ **Ważna uwaga:**
Gra wymaga **aktywnego połączenia z Internetem**. 
Wykorzystujemy **Firebase Realtime Database** do synchronizacji graczy. Bez dostępu do sieci gra nie połączy się z lobby.

---
*Projekt stworzony na HACKNATION 2025.*
