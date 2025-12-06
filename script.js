// ======================================================
// 1. KONFIGURACJA FIREBASE
// ======================================================
const firebaseConfig = {
    apiKey: "AIzaSyCaZ7FQh8YR8lKNCoUrers8JaBmuTa64Ys",
    authDomain: "sqad-dice.firebaseapp.com",
    databaseURL: "https://sqad-dice-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "sqad-dice",
    storageBucket: "sqad-dice.firebasestorage.app",
    messagingSenderId: "738671011090",
    appId: "1:738671011090:web:021d25ba0ad62d4e50ffcb",
    measurementId: "G-JCCCWQHF9K"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

// ======================================================
// 2. ZMIENNE GLOBALNE I ELEMENTY DOM
// ======================================================
let myId = null;
let myName = "";
let playersData = {};
let gameData = {};
let amIHost = false;
let localState = {
    animationTimeout: null,
    influenceInterval: null
};

// Ekrany
const lobbyScreen = document.getElementById('lobby-screen');
const gameScreen = document.getElementById('game-screen');

// Lobby
const lobbyList = document.getElementById('lobby-list');
const startOnlineBtn = document.getElementById('start-online-btn');
const waitingMsg = document.getElementById('waiting-msg');
const usernameInput = document.getElementById('username');
const joinBtn = document.getElementById('join-btn');

// Gra
const playersContainer = document.getElementById('players-container');
const gameInfoEl = document.getElementById('game-info');
const roundDisplayEl = document.getElementById('round-display');
const sharedBudgetEl = document.getElementById('shared-budget');

// Kostka
const diceAnimationEl = document.getElementById('dice-animation');
const diceRollerInfo = document.getElementById('dice-roller-info');
const influenceCostEl = document.getElementById('influence-cost');
const influenceResultText = document.getElementById('influence-result-text');
const trueValueText = document.getElementById('true-value-text');
const btnInfluencePlus = document.getElementById('btn-influence-plus');
const btnInfluenceMinus = document.getElementById('btn-influence-minus');

// Historia
const historyModal = document.getElementById('historyModal');
const historyLog = document.getElementById('history-log');

// ======================================================
// 3. LOGIKA LOBBY
// ======================================================

joinBtn.addEventListener('click', () => {
    myName = usernameInput.value.trim();
    if (!myName) return alert("Wpisz imię!");

    myId = "player_" + Date.now(); // Tworzymy unikalne ID gracza

    // Zapisujemy się do bazy danych
    db.ref("players/" + myId).set({
        id: myId,
        name: myName,
        bet: null,
        hasPlacedBet: false
    });

    // Ukrywamy przycisk dołączenia i input
    joinBtn.style.display = 'none';
    usernameInput.disabled = true;
    waitingMsg.style.display = 'block';

    // Usuń gracza z bazy, gdy zamknie kartę
    db.ref("players/" + myId).onDisconnect().remove();

    initLobbyListener();
});

function initLobbyListener() {
    // Nasłuchuj zmian w liście graczy
    db.ref("players").on("value", (snapshot) => {
        playersData = snapshot.val() || {};
        renderLobby();
        
        // Sprawdź, czy jesteś hostem (pierwszy gracz na liście)
        const playerKeys = Object.keys(playersData);
        if (playerKeys.length > 0 && playerKeys.sort()[0] === myId) {
            amIHost = true;
            startOnlineBtn.style.display = 'block';
            waitingMsg.style.display = 'none';
        } else {
            amIHost = false;
            startOnlineBtn.style.display = 'none';
            if (joinBtn.style.display === 'none') { // Pokaż wiadomość o czekaniu tylko jeśli już dołączyliśmy
                 waitingMsg.style.display = 'block';
            }
        }
    });

    // Nasłuchuj stanu gry
    db.ref("gameState").on("value", (snapshot) => {
        const newGameData = snapshot.val();
        if (newGameData && newGameData.status === "PLAYING") {
            gameData = newGameData; // Zapisz nowe dane gry
            startGameUI();
        }
        // Jeśli gra się resetuje lub kończy, wróć do lobby
        else if (!newGameData || newGameData.status === "LOBBY") {
            if(gameScreen.classList.contains('d-none') === false){
                 location.reload(); // Prosty sposób na reset UI
            }
        }
    });
}

function renderLobby() {
    lobbyList.innerHTML = '';
    const playerKeys = Object.keys(playersData);

    if (playerKeys.length === 0) {
        lobbyList.innerHTML = '<li class="list-group-item text-muted text-center">Czekanie na graczy...</li>';
        return;
    }

    Object.values(playersData).forEach(p => {
        const li = document.createElement('li');
        li.className = "list-group-item";
        li.textContent = p.name + (p.id === myId ? " (Ty)" : "");
        lobbyList.appendChild(li);
    });
}

// Host klika START
startOnlineBtn.addEventListener('click', () => {
    const playerIds = Object.keys(playersData);
    if(playerIds.length === 0) return;

    // Inicjalizacja stanu gry w bazie
    db.ref("gameState").set({
        status: "PLAYING",
        round: 1,
        sharedBudget: 100,
        currentPlayerIndex: 0,
        turnOrder: playerIds.sort(), // Ustalona kolejność graczy
        lastResultMessage: '',
        rollHistory: [],
        currentRoll: {
            isRolling: false,
            rollerId: null,
            baseValue: 1,
            finalValue: 1,
            influenceCost: 0,
            totalInfluenceCost: 0,
            influencedBy: []
        }
    });
});

// ======================================================
// 4. LOGIKA GRY (SYNCHRONIZACJA)
// ======================================================

function startGameUI() {
    lobbyScreen.classList.add('d-none');
    gameScreen.classList.remove('d-none');
    
    // Nasłuchuj na bieżąco zmian w grze
    initGameListeners();
}

function initGameListeners() {
    // Główny listener stanu gry
    db.ref("gameState").on("value", (snapshot) => {
        gameData = snapshot.val();
        if (!gameData) return; // Jeśli gra została zresetowana
        
        updateHeaderUI();
        updateGameInfo();
        handleRollUpdate(gameData.currentRoll);
    });

    // Listener zmian u graczy (potrzebny do renderowania kart)
    db.ref("players").on("value", (snapshot) => {
        playersData = snapshot.val() || {};
        renderPlayerCards();
    });
}

function updateHeaderUI() {
    roundDisplayEl.textContent = gameData.round;
    sharedBudgetEl.textContent = `${gameData.sharedBudget} PLN`;

    sharedBudgetEl.classList.remove('text-success', 'text-danger', 'fw-bold');
    if (gameData.sharedBudget > 100) sharedBudgetEl.classList.add('text-success', 'fw-bold');
    else if (gameData.sharedBudget < 100) sharedBudgetEl.classList.add('text-danger', 'fw-bold');
}

function updateGameInfo() {
    const turnPlayerId = gameData.turnOrder[gameData.currentPlayerIndex];
    const player = playersData[turnPlayerId];
    
    if (gameData.currentRoll.isRolling) {
        const rollerName = playersData[gameData.currentRoll.rollerId]?.name || '';
        gameInfoEl.textContent = `Losowanie kostki gracza: ${rollerName}. Możesz wpłynąć na wynik!`;
        gameInfoEl.className = "alert alert-warning text-center fw-bold";
    } else {
        const turnMessage = player ? `Tura gracza: ${player.name}. Wybierz i zatwierdź swój zakład.` : 'Czekam na gracza...';
        if (gameData.lastResultMessage) {
            gameInfoEl.innerHTML = `<div>${turnMessage}</div><hr class="my-2"><p class="text-muted mb-0"><small>Ostatni wynik: ${gameData.lastResultMessage}</small></p>`;
        } else {
            gameInfoEl.textContent = turnMessage;
        }
        gameInfoEl.className = "alert alert-info text-center";
    }
}

// ======================================================
// 5. RENDEROWANIE KART GRACZY
// ======================================================

function renderPlayerCards() {
    playersContainer.innerHTML = '';
    if (!gameData.turnOrder) return;

    const turnPlayerId = gameData.turnOrder[gameData.currentPlayerIndex];

    gameData.turnOrder.forEach(playerId => {
        const p = playersData[playerId];
        if (!p) return; // Gracz mógł się rozłączyć

        const isMyCard = (playerId === myId);
        const isActive = (playerId === turnPlayerId);
        
        const cardDiv = document.createElement('div');
        cardDiv.className = 'col-6 mb-4';

        const cardClasses = ['player-card'];
        if (isActive && !gameData.currentRoll.isRolling) cardClasses.push('active');
        if (p.hasPlacedBet) cardClasses.push('done');

        // Informacje o zakładzie
        let betInfo = "Oczekuje...";
        if (p.hasPlacedBet && p.bet) {
            if (p.bet.type === 'number') betInfo = `Zakład: ${p.bet.value}`;
            else betInfo = `Zakład: ${p.bet.type === 'even' ? 'Parzyste' : 'Nieparzyste'}`;
        }
        
        // Zawartość karty
        cardDiv.innerHTML = `
            <div class="${cardClasses.join(' ')}" id="player-card-${p.id}" data-player-id="${p.id}">
                <h5 class="card-title">${p.name} ${isMyCard ? '(Ty)' : ''}</h5>
                <div class="bet-controls">
                    ${(isActive && isMyCard && !p.hasPlacedBet) ? renderBetControls(p.id) : `<div class="bet-info mt-2 text-muted">${betInfo}</div>`}
                </div>
            </div>
        `;
        playersContainer.appendChild(cardDiv);
    });

    // Dodaj event listenery do nowo utworzonych kontrolek
    attachBetControlEvents();
}

function renderBetControls(playerId) {
    return `
        <h6>Postaw zakład:</h6>
        <div class="form-check form-check-inline">
            <input class="form-check-input bet-type" type="radio" name="bet-options-${playerId}" id="bet-even-${playerId}" value="even">
            <label class="form-check-label" for="bet-even-${playerId}">Parzyste</label>
        </div>
        <div class="form-check form-check-inline">
            <input class="form-check-input bet-type" type="radio" name="bet-options-${playerId}" id="bet-odd-${playerId}" value="odd">
            <label class="form-check-label" for="bet-odd-${playerId}">Nieparzyste</label>
        </div>
        <div class="input-group mt-2">
            <input type="number" class="form-control bet-number" min="1" max="6" placeholder="Liczba">
            <button class="btn btn-primary confirm-bet-btn">Zatwierdź</button>
        </div>
    `;
}

function attachBetControlEvents() {
    const confirmBtn = document.querySelector('.confirm-bet-btn');
    if (confirmBtn) {
        const card = confirmBtn.closest('.player-card');
        const playerId = card.dataset.playerId;
        
        confirmBtn.onclick = () => handleBetConfirmation(playerId);

        const numberInput = card.querySelector('.bet-number');
        const radioButtons = card.querySelectorAll('.bet-type');
        radioButtons.forEach(radio => { radio.onchange = () => { numberInput.value = ''; }; });
        numberInput.onfocus = () => { radioButtons.forEach(radio => radio.checked = false); };
    }
}

// ======================================================
// 6. AKCJE GRACZA
// ======================================================

function handleBetConfirmation(playerId) {
    const card = document.getElementById(`player-card-${playerId}`);
    const betTypeEven = card.querySelector(`#bet-even-${playerId}`).checked;
    const betTypeOdd = card.querySelector(`#bet-odd-${playerId}`).checked;
    const betNumber = card.querySelector('.bet-number').value;

    let bet = null;
    if (betTypeEven) bet = { type: 'even' };
    else if (betTypeOdd) bet = { type: 'odd' };
    else if (betNumber >= 1 && betNumber <= 6) bet = { type: 'number', value: parseInt(betNumber, 10) };
    
    if (!bet) {
        alert('Proszę wybrać prawidłowy zakład (parzyste, nieparzyste lub liczba 1-6).');
        return;
    }

    // Ustaw zakład i flagę w bazie
    db.ref("players/" + playerId).update({
        hasPlacedBet: true,
        bet: bet
    });
    
    // Tylko host rozpoczyna rzut kostką
    if (amIHost) {
        startRoll(playerId);
    }
}

function startRoll(rollerId) {
    const baseVal = Math.floor(Math.random() * 6) + 1;
    const rollDuration = 8000;

    // Rozpocznij rzut w bazie danych
    db.ref("gameState/currentRoll").update({
        isRolling: true,
        rollerId: rollerId,
        baseValue: baseVal,
        finalValue: baseVal,
        influenceCost: 0,
        totalInfluenceCost: 0,
        influencedBy: [],
    });
    
    // Ustaw timer kosztu wpływu (tylko host)
    const costInterval = setInterval(() => {
        // Użyj transakcji, aby bezpiecznie zwiększyć koszt
        db.ref("gameState/currentRoll/influenceCost").transaction(cost => (cost || 0) + 2);
    }, 1000);

    // Po zakończeniu rzutu, host finalizuje turę
    setTimeout(() => {
        clearInterval(costInterval);
        finalizeTurn();
    }, rollDuration);
}

// ======================================================
// 7. WPŁYW I KOSTKA
// ======================================================

function getRotationForFace(face) {
    switch (face) {
        case 1: return { x: 0, y: 0 };
        case 2: return { x: 0, y: -90 };
        case 3: return { x: -90, y: 0 };
        case 4: return { x: 90, y: 0 };
        case 5: return { x: 0, y: 90 };
        case 6: return { x: 0, y: 180 };
        default: return { x: 0, y: 0 };
    }
}

let lastIsRollingState = false;

function handleRollUpdate(roll) {
    if (!roll) return;

    // Aktualizuj UI na podstawie danych z bazy
    influenceCostEl.textContent = roll.influenceCost || 0;
    const rollerName = playersData[roll.rollerId]?.name || '';
    diceRollerInfo.textContent = `Rzut dla ${rollerName}`;
    
    // Jeśli rzut właśnie się rozpoczął
    if (roll.isRolling && !lastIsRollingState) {
        animateDice(roll.baseValue);
    }

    // Logika przycisków wpływu
    const canInfluence = roll.isRolling && myId !== roll.rollerId && !(roll.influencedBy || []).includes(myId);
    btnInfluencePlus.disabled = !canInfluence;
    btnInfluenceMinus.disabled = !canInfluence;

    // Wynik w czasie rzeczywistym
    if (roll.isRolling && roll.baseValue !== roll.finalValue) {
        trueValueText.innerHTML = `Aktualny wynik: <span class="fw-bold text-warning">${roll.finalValue}</span>`;
    } else {
        trueValueText.innerHTML = "";
    }
    
    lastIsRollingState = roll.isRolling;
}

function animateDice(baseValue) {
    clearTimeout(localState.animationTimeout);
    
    const rollDuration = 8000;
    const randomSpinsX = Math.floor(Math.random() * 5 + 4);
    const randomSpinsY = Math.floor(Math.random() * 5 + 4);
    const finalAngle = getRotationForFace(baseValue); // Początkowo celuj w bazową wartość

    const finalX = (randomSpinsX * 360) + finalAngle.x;
    const finalY = (randomSpinsY * 360) + finalAngle.y;
    
    diceAnimationEl.style.transition = 'none';
    // Trick to reset animation - TBD if needed
    
    diceAnimationEl.style.transition = `transform ${rollDuration / 1000}s cubic-bezier(.15, .9, .3, 1)`;
    diceAnimationEl.style.transform = `rotateX(${finalX}deg) rotateY(${finalY}deg)`;

    localState.animationTimeout = setTimeout(() => {
        // Po zakończeniu animacji, ustaw kostkę na ostateczną wartość z bazy
        db.ref('gameState/currentRoll/finalValue').once('value', snapshot => {
            const finalValue = snapshot.val();
            const correctAngle = getRotationForFace(finalValue);
            diceAnimationEl.style.transition = 'transform 0.5s ease-out';
            diceAnimationEl.style.transform = `rotateX(${correctAngle.x}deg) rotateY(${correctAngle.y}deg)`;
        });
    }, rollDuration);
}

function sendInfluence(amount) {
    const currentCost = gameData.currentRoll.influenceCost;
    if (gameData.sharedBudget < currentCost) {
        return alert("Za mało pieniędzy w kasie!");
    }

    // Oznacz, że wpłynąłeś na rzut
    db.ref(`gameState/currentRoll/influencedBy`).transaction(list => {
        list = list || [];
        list.push(myId);
        return list;
    });

    // Zmodyfikuj wartość kostki
    db.ref(`gameState/currentRoll/finalValue`).transaction(val => {
        let newVal = (val || 1) + amount;
        if (newVal > 6) return 1;
        if (newVal < 1) return 6;
        return newVal;
    });

    // Odejmij koszt od budżetu i dodaj do kosztu całkowitego
    db.ref(`gameState`).transaction(state => {
        if(state){
            state.sharedBudget -= currentCost;
            state.currentRoll.totalInfluenceCost += currentCost;
        }
        return state;
    });
}

btnInfluencePlus.onclick = () => sendInfluence(1);
btnInfluenceMinus.onclick = () => sendInfluence(-1);

// ======================================================
// 8. ZAKOŃCZENIE TURY I RUNDY (TYLKO HOST)
// ======================================================

function finalizeTurn() {
    if (!amIHost) return;

    db.ref().once("value").then(snapshot => {
        const fullState = snapshot.val();
        const state = fullState.gameState;
        const roll = state.currentRoll;
        const turnPlayerId = state.turnOrder[state.currentPlayerIndex];
        const player = fullState.players[turnPlayerId];
        
        // Oblicz wynik
        let win = false;
        if (player.bet.type === 'even' && roll.finalValue % 2 === 0) win = true;
        if (player.bet.type === 'odd' && roll.finalValue % 2 !== 0) win = true;
        if (player.bet.type === 'number' && roll.finalValue === player.bet.value) win = true;

        const prize = win ? (player.bet.type === 'number' ? 50 : 10) : -5;
        const budgetChange = prize;

        const outcomeMessage = `Na kostce: ${roll.baseValue}. Wynik końcowy: ${roll.finalValue}. ${player.name} ${win ? `wygrywa! +${prize} PLN` : `przegrywa. -5 PLN`}`;
        
        // Zapisz historię
        const historyEntry = { rollerName: player.name, fullMessage: outcomeMessage };
        db.ref('gameState/rollHistory').transaction(history => {
            history = history || [];
            history.push(historyEntry);
            return history;
        });
        
        // Przygotuj aktualizację do bazy
        let updates = {};
        updates['/gameState/sharedBudget'] = state.sharedBudget + budgetChange;
        updates['/gameState/currentRoll/isRolling'] = false;
        updates['/gameState/lastResultMessage'] = outcomeMessage;
        updates[`/players/${turnPlayerId}/hasPlacedBet`] = false;
        updates[`/players/${turnPlayerId}/bet`] = null;

        // Przejdź do następnego gracza lub rundy
        let nextIndex = state.currentPlayerIndex + 1;
        if (nextIndex >= state.turnOrder.length) {
            updates['/gameState/round'] = state.round + 1;
            // Reset wszystkich graczy na nową rundę
            state.turnOrder.forEach(pid => {
                updates[`/players/${pid}/hasPlacedBet`] = false;
                updates[`/players/${pid}/bet`] = null;
            });
            nextIndex = 0;
        }
        updates['/gameState/currentPlayerIndex'] = nextIndex;

        db.ref().update(updates);
    });
}

// ======================================================
// 9. HISTORIA
// ======================================================

function renderHistory() {
    historyLog.innerHTML = '';
    const history = gameData.rollHistory || [];
    if (history.length === 0) {
        historyLog.innerHTML = '<p class="text-center text-muted">Brak historii dla tej rundy.</p>';
        return;
    }
    const list = document.createElement('ul');
    list.className = 'list-group';
    [...history].reverse().forEach(entry => {
        const listItem = document.createElement('li');
        listItem.className = 'list-group-item';
        listItem.innerHTML = `<div><strong>${entry.rollerName}:</strong> ${entry.fullMessage}</div>`;
        list.appendChild(listItem);
    });
    historyLog.appendChild(list);
}
historyModal.addEventListener('show.bs.modal', renderHistory);