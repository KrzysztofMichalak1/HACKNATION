# 🎲 [ZRZUTKA] - Teamplayowy Hazard

> **Wyzwanie:** Gaming: Los decyduje (Totalizator Sportowy)  
> **Kategoria:** F2P / Social Gambling / Skill-based RNG

## 📖 O projekcie

**[NAZWA_PROJEKTU]** to innowacyjna gra przeglądarkowa, która redefiniuje pojęcie hazardu online, wprowadzając do niego **kooperację (teamplay)** i elementy zręcznościowe. 

Zamiast samotnej walki z "systemem", gracze łączą siły w lobby, operując **wspólnym budżetem**. Gra wykorzystuje mechanikę **interwencji**, która pozwala członkom drużyny wpływać na wynik rzutu w czasie rzeczywistym – to mieszanka losowości, strategii i momentów typu "clutch" lub "troll".

---

## ⚙️ Główne mechaniki rozgrywki

### 1. Wspólny Portfel i Lobby
* **Teamplay:** Drużyna gra jako jedność. Porażka jednego gracza obciąża wszystkich, wygrana powiększa wspólną pulę.
* **Host:** Decyduje o początkowym podziale wkładu, co buduje dynamikę społeczną jeszcze przed startem.
* **Jeden rzut:** W danej rundzie rzuca tylko właściciel kostki, reszta obserwuje i reaguje.

### 2. Zakłady i Transparentność
* Gracz obstawia wynik (Parzyste/Nieparzyste lub konkretne liczby 1-6) przy wysokich kursach.
* Pełna transparentność zasad – brak ukrytych mechanik typu "lootbox".

### 3. System Interwencji (Skill-based RNG)
To nasz wyróżnik na tle konkurencji. Podczas gdy wirtualna kostka się toczy:
* Pozostali gracze mogą wpłynąć na wynik (+/- 1 oczko).
* **Dynamiczny koszt (Risk/Reward):** Im później gracz zdecyduje się na interwencję (im bliżej wyniku), tym więcej musi zapłacić ze wspólnego budżetu.
* **Antycypacja:** Od pewnego momentu interwencja jest zablokowana ("no more bets"), co buduje napięcie.

### 4. Mechaniki Retencji i "Near-Win"
* **Bailout / Druga Szansa:** Jeśli drużyna straci określoną kwotę (np. 100, 150, 200), aktywuje się mechanika ratunkowa. Drużyna ma **50% szans** na zmniejszenie straty o 50 jednostek.
* **Ranking:** Gra śledzi udane ratunki i przypadkowe "trollowanie", co napędza rywalizację wewnątrz grupy.

### 5. Lead Generation & Checkout
* Przy wyjściu z gry (Checkout), budżet jest dzielony proporcjonalnie do wkładu.
* Warunkiem realizacji wypłaty (zapisania wyniku) jest podanie adresu e-mail.

---

## 🎯 Realizacja celów wyzwania (HackNation)

Projekt bezpośrednio odpowiada na kryteria Totalizatora Sportowego:

| Wymaganie | Nasze Rozwiązanie |
| :--- | :--- |
| **Losowość jako motor emocji** | Klasyczny rzut kością wzbogacony o interakcję czasu rzeczywistego. |
| **Near-win experience** | Możliwość fizycznego wpłynięcia na kostkę. Poczucie "było tak blisko" jest potęgowane przez decyzję o użyciu interwencji. |
| **Aspekt społecznościowy** | Wspólny budżet, wzajemna pomoc, wspólne przeżywanie wyniku. |
| **Lead Generation** | E-mail wymagany przy podziale łupów (checkout). |

---

## 🚀 Planowany rozwój: Proceduralna Animacja Rzutu

W kolejnej iteracji planujemy wdrożenie zaawansowanego modelu matematycznego dla animacji. Zamiast gotowych klipów, ruch kostki będzie generowany proceduralnie.

Model opiera się na wygenerowaniu losowej funkcji rosnącej na przedziale czasu $[0,t]$, która spełnia warunki brzegowe w punktach stałych:
* Punkt startowy: $(0,0)$
* Punkt końcowy: $(t,\alpha)$

Gdzie:
* $t$ to czas trwania animacji.
* $\alpha$ to kąt obrotu kostki, zależny od wylosowanej ścianki.

System najpierw losuje $\alpha$, a następnie generuje funkcję przejścia, co zapewnia płynność i unikalność każdego rzutu.

---

## 🛠️ Technologie

* **Frontend:** [Technologia, np. React / Phaser]
* **Backend:** [Technologia, np. Node.js / Socket.io]
* **Design:** Mobile First / Responsive Web Design

---

## 💿 Jak uruchomić projekt

1.  Sklonuj repozytorium:
    ```bash
    git clone [LINK_DO_REPO]
    ```
2.  Zainstaluj zależności:
    ```bash
    npm install
    ```
3.  Uruchom serwer deweloperski:
    ```bash
    npm start
    ```

---
*Projekt stworzony na Hackathon Totalizator Sportowy 2024.*
