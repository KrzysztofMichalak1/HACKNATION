// ======================================================
// 1. KONFIGURACJA FIREBASE
// ======================================================

// --- TUTAJ WKLEJ SWÓJ KOD Z FIREBASE (const firebaseConfig = ...) ---
// Pamiętaj o dodaniu databaseURL jeśli go nie ma!
const firebaseConfig = {
  apiKey: "AIzaSyCaZ7FQh8YR8lKNCoUrers8JaBmuTa64Ys",
  authDomain: "sqad-dice.firebaseapp.com",
  
  // --- I ADDED THIS LINE FOR YOU ---
  databaseURL: "https://sqad-dice-default-rtdb.europe-west1.firebasedatabase.app",
  // --------------------------------
  
  projectId: "sqad-dice",
  storageBucket: "sqad-dice.firebasestorage.app",
  messagingSenderId: "738671011090",
  appId: "1:738671011090:web:021d25ba0ad62d4e50ffcb",
  measurementId: "G-JCCCWQHF9K"
};

// Inicjalizacja
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

// ======================================================
// 2. ZMIENNE GLOBALNE
// ======================================================
let myId = null;
let myName = "";
let playersData = {};
let gameData = {};
let amIHost = false;

// Elementy DOM
const lobbyScreen = document.getElementById('lobby-screen');
const gameScreen = document.getElementById('game-screen');
const lobbyList = document.getElementById('lobby-list');
const startOnlineBtn = document.getElementById('start-online-btn');
const waitingMsg = document.getElementById('waiting-msg');
const playersContainer = document.getElementById('players-container');
const gameInfoEl = document.getElementById('game-info');
const diceAnimationEl = document.getElementById('dice-animation');
const sharedBudgetEl = document.getElementById('shared-budget');
const influenceCostEl = document.getElementById('influence-cost');
const trueValueText = document.getElementById('true-value-text');

// ======================================================
// 3. LOGIKA LOBBY
// ======================================================

document.getElementById('join-btn').addEventListener('click', () => {
    const nameInput = document.getElementById('username');
    myName = nameInput.value.trim();
    if (!myName) return alert("Wpisz imię!");

    // Tworzymy ID gracza
    myId = "player_" + Date.now();

    // Zapisujemy się do bazy
    db.ref("players/" + myId).set({
        id: myId,
        name: myName,
        joinedAt: firebase.database.ServerValue.TIMESTAMP,
        bet: null,
        hasPlacedBet: false
    });

    // Ukrywamy input, pokazujemy status
    document.getElementById('join-btn').style.display = 'none';
    nameInput.disabled = true;
    waitingMsg.style.display = 'block';

    // Usuń mnie jak wyjdę
    db.ref("players/" + myId).onDisconnect().remove();

    initLobbyListener();
});

function initLobbyListener() {
    // Słuchaj listy graczy
    db.ref("players").on("value", (snapshot) => {
        playersData = snapshot.val() || {};
        renderLobby();
        
        // Sprawdź czy jestem hostem (pierwszy gracz)
        const allIds = Object.keys(playersData).sort();
        if (allIds.length > 0 && allIds[0] === myId) {
            amIHost = true;
            startOnlineBtn.style.display = 'block';
            waitingMsg.style.display = 'none';
        }
    });

    // Słuchaj stanu gry (czy się zaczęła)
    db.ref("gameState").on("value", (snapshot) => {
        gameData = snapshot.val();
        if (gameData && gameData.status === "PLAYING") {
            startGameUI();
        }
    });
}

function renderLobby() {
    lobbyList.innerHTML = '';
    Object.values(playersData).forEach(p => {
        const li = document.createElement('li');
        li.className = "list-group-item";
        li.textContent = p.name + (p.id === myId ? " (Ty)" : "");
        lobbyList.appendChild(li);
    });
}

// Host klika START
startOnlineBtn.addEventListener('click', () => {
    // Inicjalizacja stanu gry w bazie
    const playerIds = Object.keys(playersData);
    db.ref("gameState").set({
        status: "PLAYING",
        round: 1,
        sharedBudget: 100,
        currentPlayerIndex: 0,
        turnOrder: playerIds, // Kolejność tur
        currentRoll: {
            isRolling: false,
            baseValue: 1,
            finalValue: 1,
            influenceCost: 0
        }
    });
});

// ======================================================
// 4. LOGIKA GRY (Synchronizacja)
// ======================================================

function startGameUI() {
    lobbyScreen.classList.add('d-none');
    gameScreen.classList.remove('d-none');
    
    // Nasłuchuj zmian w grze
    initGameListeners();
}

function initGameListeners() {
    // 1. Słuchaj budżetu i rundy
    db.ref("gameState").on("value", (snapshot) => {
        gameData = snapshot.val();
        if (!gameData) return;
        
        updateHeaderUI();
        checkTurn();
    });

    // 2. Słuchaj zmian u graczy (zakłady)
    db.ref("players").on("value", (snapshot) => {
        playersData = snapshot.val() || {};
        renderBoard();
    });

    // 3. Słuchaj kostki (animacje i wpływy)
    db.ref("gameState/currentRoll").on("value", (snapshot) => {
        const rollData = snapshot.val();
        if (rollData) handleRollUpdate(rollData);
    });
}

function updateHeaderUI() {
    document.getElementById('round-display').textContent = gameData.round;
    sharedBudgetEl.textContent = gameData.sharedBudget + " PLN";
    
    // Kolory budżetu
    if (gameData.sharedBudget > 100) sharedBudgetEl.className = "mb-0 text-success fw-bold";
    else if (gameData.sharedBudget < 100) sharedBudgetEl.className = "mb-0 text-danger fw-bold";
    else sharedBudgetEl.className = "mb-0 fw-bold";
}

function renderBoard() {
    playersContainer.innerHTML = '';
    const turnPlayerId = gameData.turnOrder[gameData.currentPlayerIndex];

    gameData.turnOrder.forEach(pid => {
        const p = playersData[pid];
        if (!p) return;

        const isMyCard = (pid === myId);
        const isActive = (pid === turnPlayerId);
        
        const div = document.createElement('div');
        div.className = "col-6 mb-4";
        
        let betStatus = "Czeka...";
        if (p.hasPlacedBet) {
            if (p.bet.type === 'even') betStatus = "Parzyste";
            else if (p.bet.type === 'odd') betStatus = "Nieparzyste";
            else betStatus = "Liczba: " + p.bet.value;
        }

        // HTML Karty Gracza
        div.innerHTML = `
            <div class="card p-3 ${isActive ? 'border-primary border-3 shadow' : ''} ${p.hasPlacedBet ? 'bg-light' : ''}">
                <h5 class="card-title text-center">${p.name} ${isMyCard ? '(Ty)' : ''}</h5>
                <div class="text-center my-2" style="font-size: 24px;">🎲</div>
                
                ${isActive && isMyCard && !p.hasPlacedBet ? renderBetControls() : `<p class="text-center text-muted">${betStatus}</p>`}
            </div>
        `;
        playersContainer.appendChild(div);
    });
}

function renderBetControls() {
    return `
        <div class="d-grid gap-2">
            <button class="btn btn-outline-primary btn-sm" onclick="placeBet('even')">Parzyste</button>
            <button class="btn btn-outline-primary btn-sm" onclick="placeBet('odd')">Nieparzyste</button>
            <div class="input-group input-group-sm">
                <input type="number" id="bet-num-input" class="form-control" placeholder="1-6" min="1" max="6">
                <button class="btn btn-primary" onclick="placeBet('number')">OK</button>
            </div>
        </div>
    `;
}

// ======================================================
// 5. AKCJE GRACZA
// ======================================================

// Wysyłanie zakładu do bazy
window.placeBet = function(type) {
    let betVal = null;
    if (type === 'number') {
        const val = document.getElementById('bet-num-input').value;
        if (val < 1 || val > 6) return alert("Wybierz 1-6");
        betVal = parseInt(val);
    }

    db.ref("players/" + myId).update({
        hasPlacedBet: true,
        bet: { type: type, value: betVal }
    });

    // Rozpocznij rzut kostką (automatycznie po zakładzie)
    startRoll();
};

function startRoll() {
    const baseVal = Math.floor(Math.random() * 6) + 1;
    
    db.ref("gameState/currentRoll").update({
        isRolling: true,
        baseValue: baseVal,
        finalValue: baseVal,
        influenceCost: 0,
        startTime: Date.now()
    });

    // Uruchom timer kosztów (tylko osoba rzucająca to liczy)
    let cost = 0;
    const interval = setInterval(() => {
        cost += 2;
        db.ref("gameState/currentRoll").update({ influenceCost: cost });
    }, 1000);

    // Zakończ rzut po 8 sekundach
    setTimeout(() => {
        clearInterval(interval);
        finalizeTurn();
    }, 8000);
}

// ======================================================
// 6. OBSŁUGA KOSTKI I WPŁYWÓW
// ======================================================

let lastIsRolling = false;

function handleRollUpdate(roll) {
    influenceCostEl.textContent = roll.influenceCost;
    
    // Jeśli zaczęło się toczenie
    if (roll.isRolling && !lastIsRolling) {
        animateDice(roll.baseValue); // Animacja wizualna
        gameInfoEl.textContent = "KOSTKA SIĘ TOCZY! WPŁYWAJ!";
        gameInfoEl.className = "alert alert-warning text-center fw-bold";
    }

    // Obsługa przycisków wpływu
    const turnPlayerId = gameData.turnOrder[gameData.currentPlayerIndex];
    const isMyTurn = (myId === turnPlayerId);
    
    const btnPlus = document.getElementById('btn-influence-plus');
    const btnMinus = document.getElementById('btn-influence-minus');

    if (roll.isRolling && !isMyTurn) {
        btnPlus.disabled = false;
        btnMinus.disabled = false;
        
        // Obsługa kliknięć
        btnPlus.onclick = () => sendInfluence(1);
        btnMinus.onclick = () => sendInfluence(-1);
    } else {
        btnPlus.disabled = true;
        btnMinus.disabled = true;
    }

    // Aktualizacja wyniku na żywo
    if (roll.finalValue !== roll.baseValue) {
        trueValueText.innerHTML = `Aktualny wynik: <span class="text-warning">${roll.finalValue}</span>`;
    } else {
        trueValueText.innerHTML = "";
    }

    lastIsRolling = roll.isRolling;
}

function sendInfluence(amount) {
    // Transakcja, żeby nie nadpisać zmian innych graczy
    db.ref("gameState/currentRoll").transaction((current) => {
        if (current && current.isRolling) {
            let newVal = current.finalValue + amount;
            if (newVal > 6) newVal = 1;
            if (newVal < 1) newVal = 6;
            
            current.finalValue = newVal;
            // Odejmij kasę z budżetu (koszt wpływu)
            // Uwaga: w prostym MVP odejmujemy po prostu koszt bieżący
            // W pełnej wersji trzeba by to lepiej liczyć
        }
        return current;
    });
    
    // Odejmij koszt z budżetu globalnego
    db.ref("gameState/sharedBudget").transaction(budget => {
        return budget - gameData.currentRoll.influenceCost;
    });
}

function animateDice(targetValue) {
    // Prosta animacja CSS
    const x = Math.floor(Math.random() * 4 + 2) * 360;
    const y = Math.floor(Math.random() * 4 + 2) * 360;
    
    // Mapowanie ścianek (uproszczone)
    let finalRot = {x:0, y:0};
    if(targetValue === 1) finalRot = {x:0, y:0};
    if(targetValue === 6) finalRot = {x:180, y:0};
    // ... (możesz dodać resztę mapowania z Twojego starego kodu)

    diceAnimationEl.style.transition = "transform 8s cubic-bezier(.15, .9, .3, 1)";
    diceAnimationEl.style.transform = `rotateX(${x}deg) rotateY(${y}deg)`;
}

function finalizeTurn() {
    // Pobierz aktualny stan
    db.ref("gameState").once("value").then(snap => {
        const state = snap.val();
        const roll = state.currentRoll;
        const turnPlayerId = state.turnOrder[state.currentPlayerIndex];
        
        // Sprawdź wygraną (tylko host to robi żeby nie dublować)
        if (amIHost) {
            const player = playersData[turnPlayerId];
            let win = false;
            
            if (player.bet.type === 'even' && roll.finalValue % 2 === 0) win = true;
            if (player.bet.type === 'odd' && roll.finalValue % 2 !== 0) win = true;
            if (player.bet.type === 'number' && roll.finalValue === player.bet.value) win = true;

            let budgetChange = win ? (player.bet.type === 'number' ? 50 : 10) : -5;
            
            // Aktualizuj bazę
            db.ref("gameState").update({
                sharedBudget: state.sharedBudget + budgetChange,
                "currentRoll/isRolling": false
            });

            // Następna tura
            let nextIndex = state.currentPlayerIndex + 1;
            if (nextIndex >= state.turnOrder.length) {
                nextIndex = 0;
                db.ref("gameState").update({ round: state.round + 1 });
            }
            
            // Reset gracza
            db.ref("players/" + turnPlayerId).update({ hasPlacedBet: false });
            
            db.ref("gameState").update({ currentPlayerIndex: nextIndex });
        }
    });
}

function checkTurn() {
    const turnPlayerId = gameData.turnOrder[gameData.currentPlayerIndex];
    const player = playersData[turnPlayerId];
    if(player) {
        gameInfoEl.textContent = `Tura gracza: ${player.name}`;
        gameInfoEl.className = "alert alert-info text-center fw-bold";
    }
}