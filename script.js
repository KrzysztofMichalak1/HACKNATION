document.addEventListener('DOMContentLoaded', () => {
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

    // Max cost for influence
    const MAX_INFLUENCE_COST = 15;

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
    const budgetAllocation = document.getElementById('budget-allocation');
    const budgetInputs = document.getElementById('budget-inputs');
    const budgetWarning = document.getElementById('budget-warning');


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
    const currentBetDisplay = document.getElementById('current-bet-display');

    // Historia
    const historyModal = document.getElementById('historyModal');
    const historyLog = document.getElementById('history-log');

    const cashoutBtn = document.getElementById('cashout-btn');
    const cashoutBody = document.getElementById('cashout-body');

    const emailInputModal = document.getElementById('emailInputModal');
    const cashoutEmailInput = document.getElementById('cashout-email-input');
    const submitEmailBtn = document.getElementById('submit-email-btn');
    const closeCashoutModalBtn = document.getElementById('close-cashout-modal-btn');

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
            hasPlacedBet: false,
            saves: 0,
            trolls: 0
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
        budgetInputs.innerHTML = '';
        const playerIds = Object.keys(playersData);

        if (playerIds.length === 0) {
            lobbyList.innerHTML = '<li class="list-group-item text-muted text-center">Czekanie na graczy...</li>';
            budgetAllocation.style.display = 'none';
            return;
        }

        budgetAllocation.style.display = 'block';
        
        // Calculate even split
        const totalPlayers = playerIds.length;
        const baseBudget = Math.floor(500 / totalPlayers);
        let remainder = 500 % totalPlayers;

        const playerBudgets = {};
        playerIds.forEach((id, index) => {
            playerBudgets[id] = baseBudget + (index < remainder ? 1 : 0);
        });

        Object.values(playersData).forEach(p => {
            const li = document.createElement('li');
            li.className = "list-group-item";
            li.textContent = p.name + (p.id === myId ? " (Ty)" : "");
            lobbyList.appendChild(li);

            const budgetInputDiv = document.createElement('div');
            budgetInputDiv.className = 'input-group mb-2';
            
            const playerNameSpan = document.createElement('span');
            playerNameSpan.className = 'input-group-text';
            playerNameSpan.textContent = p.name;
            
            const input = document.createElement('input');
            input.type = 'number';
            input.className = 'form-control budget-input';
            // Set initial value to the calculated even split
            input.value = playerBudgets[p.id] || 0; 
            input.dataset.playerId = p.id;
            
            if (!amIHost) {
                input.disabled = true;
            }

            budgetInputDiv.appendChild(playerNameSpan);
            budgetInputDiv.appendChild(input);
            budgetInputs.appendChild(budgetInputDiv);
        });

        const checkBudget = () => {
            const inputs = document.querySelectorAll('.budget-input');
            let totalBudget = 0;
            inputs.forEach(i => {
                totalBudget += parseInt(i.value, 10) || 0;
            });

            if (totalBudget !== 500) {
                budgetWarning.textContent = `Suma budżetów musi wynosić 500. Obecnie: ${totalBudget}`;
                budgetWarning.style.display = 'block';
                if (amIHost) {
                    startOnlineBtn.disabled = true;
                }
            } else {
                budgetWarning.style.display = 'none';
                if (amIHost) {
                    startOnlineBtn.disabled = false;
                }
            }
        };

        if (amIHost) {
            budgetInputs.addEventListener('input', checkBudget);
        }
        checkBudget(); // Initial check
    }

    // Host klika START
    startOnlineBtn.addEventListener('click', () => {
        const playerIds = Object.keys(playersData);
        if(playerIds.length === 0) return;

        const initialBudgets = {};
        const inputs = document.querySelectorAll('.budget-input');
        inputs.forEach(input => {
            const playerId = input.dataset.playerId;
            const budget = parseInt(input.value, 10) || 0;
            if (playerId) {
                initialBudgets[playerId] = budget;
            }
        });

        // Inicjalizacja stanu gry w bazie
        db.ref("gameState").set({
            status: "PLAYING",
            round: 1,
            sharedBudget: 500,
            initialBudgets: initialBudgets,
            budgetHistory: [500], // Initialize budget history
            usedBailoutThresholds: [],
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
                influencedBy: [],
                influences: null
            }
        });
    });

    // ======================================================
    // 4. LOGIKA GRY (SYNCHRONIZACJA)
    // ======================================================

    function startGameUI() {
        // *** CRITICAL FIX: Detach lobby listeners to prevent them from running during the game ***
        db.ref("players").off();
        db.ref("gameState").off();

        lobbyScreen.classList.add('d-none');
        gameScreen.classList.remove('d-none');
        
        // Nasłuchuj na bieżąco zmian w grze
        initGameListeners();
    }

    const bailoutPanel = document.getElementById('bailout-panel');
    const bailoutCoin = document.getElementById('bailout-coin');
    const bailoutResultText = document.getElementById('bailout-result-text');
    let lastProcessedBailout = null;

    function startBailoutAnimation(bailoutData, onComplete) {
        bailoutPanel.classList.remove('d-none');
        
        // Reset coin
        bailoutCoin.style.transition = 'none';
        bailoutCoin.style.transform = 'rotateY(0deg)';
        
        // Force reflow
        bailoutCoin.offsetHeight; 

        // Determine final angle
        const finalAngle = bailoutData.success ? 360 * 4 : 180 + 360 * 4; // 4 full spins

        // Apply animation
        bailoutCoin.style.transition = 'transform 3s cubic-bezier(0.3, 0, 0.4, 1)';
        bailoutCoin.style.transform = `rotateY(${finalAngle}deg)`;

        setTimeout(() => {
            bailoutPanel.classList.add('d-none');
            onComplete();
        }, 4500); // Total duration of animation + pause
    }

    function initGameListeners() {
        // Główny listener stanu gry
        db.ref("gameState").on("value", (snapshot) => {
            gameData = snapshot.val();
            if (!gameData) return; // Jeśli gra została zresetowana
            
            const newBailout = gameData.currentRoll.bailoutAttempt;
            if (newBailout && JSON.stringify(newBailout) !== lastProcessedBailout) {
                lastProcessedBailout = JSON.stringify(newBailout);
                
                startBailoutAnimation(newBailout, () => {
                    updateHeaderUI();
                    updateGameInfo();
                    handleRollUpdate(gameData.currentRoll);
                    renderPlayerCards();
                });
            } else {
                updateHeaderUI();
                updateGameInfo();
                handleRollUpdate(gameData.currentRoll);
                renderPlayerCards();
            }
        });

        // Listener zmian u graczy
        db.ref("players").on("value", (snapshot) => {
            const newPlayersData = snapshot.val() || {};

            // Host-only: Sprawdź, czy aktualny gracz postawił zakład, aby rozpocząć rzut
            if (amIHost && gameData && gameData.status === "PLAYING" && gameData.currentRoll && !gameData.currentRoll.isRolling) {
                const turnPlayerId = gameData.turnOrder[gameData.currentPlayerIndex];
                const currentPlayer = newPlayersData[turnPlayerId];

                // Simplified check: If it's the current player's turn and they have placed a bet, start the roll.
                // The `isRolling` flag will prevent this from re-triggering.
                if (currentPlayer && currentPlayer.hasPlacedBet) {
                    startRoll(turnPlayerId, currentPlayer.bet);
                }
            }

            playersData = newPlayersData;
            renderPlayerCards();
        });
    }

    function updateHeaderUI() {
        if (!gameData) return;
        roundDisplayEl.textContent = gameData.round;
        sharedBudgetEl.textContent = `${gameData.sharedBudget} PKT`;

        sharedBudgetEl.classList.remove('text-success', 'text-danger', 'fw-bold');
        if (gameData.sharedBudget > 100) sharedBudgetEl.classList.add('text-success', 'fw-bold');
        else if (gameData.sharedBudget < 100) sharedBudgetEl.classList.add('text-danger', 'fw-bold');
        
        if (amIHost) {
            cashoutBtn.style.display = 'block';
        }
    }

    function renderRoundSummary(history) {
        let summaryHTML = '<div class="d-flex justify-content-center gap-2 flex-wrap align-items-center">';
        const historyToShow = (history || []).slice(-10); // Show last 10 rounds

        if (historyToShow.length === 0) {
            summaryHTML += '<p class="text-muted">Brak historii do wyświetlenia.</p>';
        } else {
            historyToShow.forEach(entry => {
                const value = entry.summary.total.value;
                const colorClass = value >= 0 ? 'bg-success' : 'bg-danger';
                summaryHTML += `
                    <div class="summary-square ${colorClass} text-white d-flex align-items-center justify-content-center">
                        ${value > 0 ? '+' : ''}${value}
                    </div>
                `;
            });
        }
        
        // Calculate and add total sum square
        if ((history || []).length > 0) {
            const totalSum = (history || []).reduce((acc, entry) => acc + entry.summary.total.value, 0);
            const totalColorClass = totalSum >= 0 ? 'bg-primary' : 'bg-dark'; // Different colors for total
            summaryHTML += `
                <div class="summary-total-square ${totalColorClass} text-white d-flex align-items-center justify-content-center">
                    ${totalSum > 0 ? '+' : ''}${totalSum}
                </div>
            `;
        }

        summaryHTML += '</div>';
        return summaryHTML;
    }

    function updateGameInfo() {
        if (!gameData || !gameData.turnOrder || !playersData) return;
        
        gameInfoEl.innerHTML = renderRoundSummary(gameData.rollHistory);

        if (gameData.currentRoll.isRolling) {
            gameInfoEl.className = "alert alert-warning text-center fw-bold";
        } else {
            gameInfoEl.className = "alert alert-light text-center";
        }
    }

    // ======================================================
    // 5. RENDEROWANIE KART GRACZY
    // ======================================================

    function renderPlayerCards() {
        playersContainer.innerHTML = '';
        if (!gameData || !gameData.turnOrder) return;

        const turnPlayerId = gameData.turnOrder[gameData.currentPlayerIndex];

        gameData.turnOrder.forEach(playerId => {
            const p = playersData[playerId];
            if (!p) return; // Gracz mógł się rozłączyć

            const isMyCard = (playerId === myId);
            const isActive = (playerId === turnPlayerId);
            
            const cardDiv = document.createElement('div');
            cardDiv.className = 'col-6 mb-4';

            const cardClasses = ['player-card'];
            if (isActive && gameData.currentRoll && !gameData.currentRoll.isRolling) cardClasses.push('active');
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

        // Ustaw zakład i flagę w bazie. Host zareaguje na tę zmianę.
        db.ref("players/" + playerId).update({
            hasPlacedBet: true,
            bet: bet
        });
    }

    function startRoll(rollerId, bet) {
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
            influences: null, // Reset influence messages
            bet: bet
        });
        
        // Ustaw timer kosztu wpływu (tylko host)
        const costInterval = setInterval(() => {
            db.ref("gameState/currentRoll/influenceCost").transaction(cost => (cost || 0) + 4);
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
        const currentInfluenceCost = roll.influenceCost || 0;
        // const rollerName = playersData[roll.rollerId]?.name || '';
        diceRollerInfo.textContent = '';

        // Display current bet information
        const currentPlayerId = roll.rollerId;
        const currentPlayer = playersData[currentPlayerId];
        let betText = '';
        if (roll.bet) {
            if (roll.bet.type === 'number') {
                betText = `Zakład gracza: ${currentPlayer?.name} postawił na: ${roll.bet.value}`;
            } else {
                betText = `Zakład gracza: ${currentPlayer?.name} postawił na: ${roll.bet.type === 'even' ? 'Parzyste' : 'Nieparzyste'}`;
            }
        }
        currentBetDisplay.textContent = betText;
        
        // Jeśli rzut właśnie się rozpoczął
        if (roll.isRolling && !lastIsRollingState) {
            animateDice(roll.baseValue);
        }

        // Logika przycisków wpływu
        const canInfluence = roll.isRolling && myId !== roll.rollerId && !(roll.influencedBy || []).includes(myId) && currentInfluenceCost < MAX_INFLUENCE_COST;

        if (currentInfluenceCost >= MAX_INFLUENCE_COST) {
            influenceCostEl.textContent = 'Za pozno na wplywanie';
            btnInfluencePlus.disabled = true;
            btnInfluenceMinus.disabled = true;
        } else {
            influenceCostEl.textContent = `Koszt Wpływy: ${currentInfluenceCost}`;
            btnInfluencePlus.disabled = !canInfluence;
            btnInfluenceMinus.disabled = !canInfluence;
        }

        // Render influence messages
        influenceResultText.innerHTML = '';
        if (roll.influences) { // Show influences during and after the roll
            Object.values(roll.influences).forEach(influence => {
                const p = document.createElement('p');
                p.className = 'mb-0 text-warning';
                p.innerHTML = `<small>${influence.influencerName} wpłynął na rzut: ${influence.action}</small>`;
                influenceResultText.appendChild(p);
            });
        }
        
        // Handle final result text visibility
        trueValueText.innerHTML = "";
        const roundSummaryEl = document.getElementById('round-summary');
        if(roundSummaryEl) roundSummaryEl.innerHTML = "";

        if (!roll.isRolling) { // Always show final result when roll is over
            trueValueText.innerHTML = `Ostateczny wynik: <span class="text-lotto-yellow-strong fw-bold">${roll.finalValue}</span>`;
            
            if (roll.turnSummary && roundSummaryEl) {
                const totalColor = roll.turnSummary.total.value >= 0 ? 'text-strong-success' : 'text-strong-danger';

                let summaryHTML = `
                    <p class="mb-0 ${roll.turnSummary.betWinnings.value > 0 ? 'text-strong-success' : 'text-strong-danger'}"><small>${roll.turnSummary.betWinnings.text}</small></p>
                    <p class="mb-0 text-secondary"><small>${roll.turnSummary.roundCost.text}</small></p>
                    <p class="mb-0 text-warning"><small>${roll.turnSummary.influenceCost.text}</small></p>
                `;
                if(roll.turnSummary.bailout) {
                    summaryHTML += `<p class="mb-0 ${roll.turnSummary.bailout.value > 0 ? 'text-success' : 'text-danger'} fw-bold"><small>${roll.turnSummary.bailout.text}</small></p>`;
                }
                summaryHTML += `<p class="fw-bold fs-1 ${totalColor}">${roll.turnSummary.total.text}</p>`;

                roundSummaryEl.innerHTML = summaryHTML;
            }
        }
        
        lastIsRollingState = roll.isRolling;
    }

    function animateDice(baseValue) {
        clearTimeout(localState.animationTimeout);
        
        const rollDuration = 8000;
        const randomSpinsX = Math.floor(Math.random() * 5 + 4);
        const randomSpinsY = Math.floor(Math.random() * 5 + 4);
        const finalAngle = getRotationForFace(baseValue); // Animate towards the base value

        const finalX = (randomSpinsX * 360) + finalAngle.x;
        const finalY = (randomSpinsY * 360) + finalAngle.y;
        
        diceAnimationEl.style.transition = 'none';
        // Trick to reset animation
        diceAnimationEl.offsetHeight; 
        
        diceAnimationEl.style.transition = `transform ${rollDuration / 1000}s cubic-bezier(.15, .9, .3, 1)`;
        diceAnimationEl.style.transform = `rotateX(${finalX}deg) rotateY(${finalY}deg)`;

        // After animation, ensure the dice visually rests on the base value face.
        localState.animationTimeout = setTimeout(() => {
            const correctAngle = getRotationForFace(baseValue);
            diceAnimationEl.style.transition = 'none';
            diceAnimationEl.style.transform = `rotateX(${correctAngle.x}deg) rotateY(${correctAngle.y}deg)`;
        }, rollDuration);
    }

    function checkWin(value, bet) {
        if (!bet) return false;
        if (bet.type === 'even' && value % 2 === 0) return true;
        if (bet.type === 'odd' && value % 2 !== 0) return true;
        if (bet.type === 'number' && value === bet.value) return true;
        return false;
    }

    function sendInfluence(amount) {
        if (!gameData || !gameData.currentRoll || !gameData.currentRoll.isRolling) return;

        const currentCost = gameData.currentRoll.influenceCost;
        if (gameData.sharedBudget < currentCost) {
            return alert("Za mało pieniędzy w kasie!");
        }

        const rollRef = db.ref('gameState/currentRoll');

        rollRef.transaction(currentRoll => {
            if (currentRoll) {
                // Prevent multiple influences from the same player
                if ((currentRoll.influencedBy || []).includes(myId)) {
                    return; // Abort transaction
                }
                
                const bet = currentRoll.bet;
                const value_before = currentRoll.finalValue;
                
                let value_after = value_before + amount;
                if (value_after > 6) value_after = 1;
                if (value_after < 1) value_after = 6;

                const wasWinningBefore = checkWin(value_before, bet);
                const isWinningAfter = checkWin(value_after, bet);

                let statUpdate = {};
                if (!wasWinningBefore && isWinningAfter) { // RATUNKI
                    statUpdate = { [`players/${myId}/saves`]: firebase.database.ServerValue.increment(1) };
                } else if (wasWinningBefore && !isWinningAfter) { // SABOTAŻE
                    statUpdate = { [`players/${myId}/trolls`]: firebase.database.ServerValue.increment(1) };
                }

                // Update player stats
                if(Object.keys(statUpdate).length > 0) {
                    db.ref().update(statUpdate);
                }

                // Update roll state
                currentRoll.finalValue = value_after;
                if (!currentRoll.influencedBy) currentRoll.influencedBy = [];
                currentRoll.influencedBy.push(myId);

                if (!currentRoll.influences) currentRoll.influences = {};
                const influenceId = `influence_${Date.now()}`;
                currentRoll.influences[influenceId] = { influencerName: myName, action: amount > 0 ? '+1' : '-1', cost: currentCost };
            }
            return currentRoll;
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
            if(!fullState || !fullState.gameState || !fullState.gameState.currentRoll.isRolling) return; // Prevent double execution
            
            const state = fullState.gameState;
            const roll = state.currentRoll;
            const turnPlayerId = state.turnOrder[state.currentPlayerIndex];
            const player = fullState.players[turnPlayerId];

            if (!player || !player.bet) {
                console.error("CRITICAL: Player or player.bet is missing in finalizeTurn for player:", turnPlayerId);
                const updates = {
                    '/gameState/currentRoll/isRolling': false,
                    '/gameState/currentPlayerIndex': (state.currentPlayerIndex + 1) % state.turnOrder.length
                };
                db.ref().update(updates);
                return;
            }
            
            let win = false;
            if (player.bet.type === 'even' && roll.finalValue % 2 === 0) win = true;
            if (player.bet.type === 'odd' && roll.finalValue % 2 !== 0) win = true;
            if (player.bet.type === 'number' && roll.finalValue === player.bet.value) win = true;

            let betWinnings = 0;
            if (win) {
                betWinnings = player.bet.type === 'number' ? 60 : 30;
            }

            const roundCost = 15;
            const totalInfluenceCost = Object.values(roll.influences || {}).reduce((sum, inf) => sum + inf.cost, 0);
            
            const initialBudgetChange = betWinnings - roundCost - totalInfluenceCost;
            const oldBudget = state.sharedBudget;
            let newBudget = oldBudget + initialBudgetChange;
            
            let bailoutAttempt = null;
            const usedThresholds = state.usedBailoutThresholds || [];
            const thresholds = Array.from({length: 8}, (_, i) => 400 - i * 50); // [400, 350, ..., 50]

            for (const threshold of thresholds) {
                if (newBudget <= threshold && oldBudget > threshold && !usedThresholds.includes(threshold)) {
                    const success = Math.random() < 0.5;
                    bailoutAttempt = { threshold, success };
                    if (success) {
                        newBudget += 50;
                    }
                    usedThresholds.push(threshold);
                    break;
                }
            }

            const finalBudgetChange = newBudget - oldBudget;

            const turnSummary = {
                betWinnings: { text: `Wygrana z zakładu: ${betWinnings > 0 ? '+' : ''}${betWinnings} PKT`, value: betWinnings },
                roundCost: { text: `Koszt rundy: -${roundCost} PKT`, value: -roundCost },
                influenceCost: { text: `Koszt wpływu: -${totalInfluenceCost} PKT`, value: -totalInfluenceCost },
                bailout: bailoutAttempt ? { text: `Bailout! ${bailoutAttempt.success ? '+50' : '+0'} PKT`, value: bailoutAttempt.success ? 50 : 0 } : null,
                total: { text: `Suma: ${finalBudgetChange >= 0 ? '+' : ''}${finalBudgetChange} PKT`, value: finalBudgetChange }
            };

            let outcomeMessage = `Na kostce: ${roll.baseValue}. Wynik końcowy: ${roll.finalValue}. ${player.name} ${win ? `wygrywa` : `przegrywa`}.`;

            const historyEntry = { 
                rollerName: player.name, 
                fullMessage: outcomeMessage, 
                influences: roll.influences ?? null,
                summary: turnSummary,
                bet: player.bet
            };
            
            let updates = {};
            updates['/gameState/rollHistory'] = [...(state.rollHistory || []), historyEntry];
            updates['/gameState/sharedBudget'] = newBudget;
            updates['/gameState/usedBailoutThresholds'] = usedThresholds;
            updates['/gameState/budgetHistory'] = [...(state.budgetHistory || [100]), newBudget];
            updates['/gameState/lastResultMessage'] = outcomeMessage;
            updates['/gameState/currentRoll/turnSummary'] = turnSummary;
            updates['/gameState/currentRoll/bailoutAttempt'] = bailoutAttempt;
            updates['/gameState/currentRoll/isRolling'] = false;
            
            let nextIndex = (state.currentPlayerIndex + 1) % state.turnOrder.length;
            updates['/gameState/round'] = state.round + 1;
            updates[`/players/${turnPlayerId}/hasPlacedBet`] = false;
            updates[`/players/${turnPlayerId}/bet`] = null;
            updates['/gameState/currentPlayerIndex'] = nextIndex;

            db.ref().update(updates);
        });
    }

    // ======================================================
    // 9. HISTORIA
    // ======================================================

    function renderHistory() {
        historyLog.innerHTML = '';
        if (!gameData || !gameData.rollHistory) {
            historyLog.innerHTML = '<p class="text-center text-muted">Brak historii do wyświetlenia.</p>';
            return;
        }
        const history = gameData.rollHistory;
        const list = document.createElement('ul');
        list.className = 'list-group';

        [...history].reverse().forEach(entry => {
            const listItem = document.createElement('li');
            const totalBudgetChange = entry.summary.total.value;
            const itemColorClass = totalBudgetChange >= 0 ? 'list-group-item-success' : 'list-group-item-danger';
            listItem.className = `list-group-item ${itemColorClass} mb-2`;

            let betText = '';
            if (entry.bet) {
                if (entry.bet.type === 'number') {
                    betText = `Postawiono na: <strong>${entry.bet.value}</strong>`;
                } else {
                    betText = `Postawiono na: <strong>${entry.bet.type === 'even' ? 'Parzyste' : 'Nieparzyste'}</strong>`;
                }
            }

            let influencesHTML = '';
            if (entry.influences) {
                influencesHTML += '<ul class="list-unstyled mt-2 mb-0">';
                Object.values(entry.influences).forEach(influence => {
                    influencesHTML += `<li><small class="text-muted ps-3">&rarr; ${influence.influencerName} wpłynął na rzut: ${influence.action} (koszt: ${influence.cost} PKT)</small></li>`;
                });
                influencesHTML += '</ul>';
            }

            listItem.innerHTML = `
                <div class="d-flex justify-content-between align-items-center">
                    <h5 class="mb-0">Runda dla: ${entry.rollerName}</h5>
                    <span class="badge bg-dark">${betText}</span>
                </div>
                <hr>
                <p class="mb-1">${entry.fullMessage}</p>
                ${influencesHTML}
                <hr>
                <div class="text-end">
                    <p class="mb-0"><small>${entry.summary.betWinnings.text}</small></p>
                    <p class="mb-0"><small>${entry.summary.roundCost.text}</small></p>
                    <p class="mb-0"><small>${entry.summary.influenceCost.text}</small></p>
                    ${entry.summary.bailout ? `<p class="mb-0 fw-bold"><small>${entry.summary.bailout.text}</small></p>` : ''}
                    <p class="fw-bold mb-0"><small>${entry.summary.total.text}</small></p>
                </div>
            `;
            list.appendChild(listItem);
        });
        historyLog.appendChild(list);
    }
    historyModal.addEventListener('show.bs.modal', renderHistory);

    // ======================================================
    // 10. WYKRES BUDŻETU
    // ======================================================
    let budgetChart = null; // To hold the chart instance

    function renderBudgetPlot() {
        if (!gameData || !gameData.budgetHistory) return;

        const ctx = document.getElementById('budget-chart').getContext('2d');
        
        if (budgetChart) {
            budgetChart.destroy(); // Destroy previous chart instance
        }

        budgetChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array.from({length: gameData.budgetHistory.length}, (_, i) => `Runda ${i}`),
                datasets: [{
                    label: 'Budżet Drużyny',
                    data: gameData.budgetHistory,
                    fill: false,
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.1
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: false
                    }
                }
            }
        });
    }

    const budgetPlotModal = document.getElementById('budgetPlotModal');
    if (budgetPlotModal) {
        budgetPlotModal.addEventListener('show.bs.modal', renderBudgetPlot);
    }

    // ======================================================
    // 11. RANKING
    // ======================================================
    const rankingModal = document.getElementById('rankingModal');
    const rankingBody = document.getElementById('ranking-body');

    function renderRanking() {
        if (!playersData) return;

        const playersArray = Object.values(playersData);
        
        // Calculate net score and sort
        playersArray.forEach(p => {
            p.netScore = (p.saves || 0) - (p.trolls || 0);
        });
        playersArray.sort((a, b) => b.netScore - a.netScore);

        let tableHTML = `
            <table class="table table-striped">
                <thead>
                    <tr>
                        <th scope="col">#</th>
                        <th scope="col">Gracz</th>
                        <th scope="col">Ratunki</th>
                        <th scope="col">Sabotaże</th>
                        <th scope="col">Wynik Netto</th>
                    </tr>
                </thead>
                <tbody>
        `;

        playersArray.forEach((p, index) => {
            tableHTML += `
                <tr>
                    <th scope="row">${index + 1}</th>
                    <td>${p.name}</td>
                    <td>${p.saves || 0}</td>
                    <td>${p.trolls || 0}</td>
                    <td>${p.netScore}</td>
                </tr>
            `;
        });

        tableHTML += `
                </tbody>
            </table>
        `;

        rankingBody.innerHTML = tableHTML;
    }

    if(rankingModal) {
        rankingModal.addEventListener('show.bs.modal', renderRanking);
    }

    if (cashoutBtn) {
        cashoutBtn.addEventListener('click', () => {
            const emailModal = new bootstrap.Modal(emailInputModal);
            emailModal.show();
        });
    }

    if (submitEmailBtn) {
        submitEmailBtn.addEventListener('click', () => {
            const email = cashoutEmailInput.value.trim();
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // Basic email validation regex

            if (!emailRegex.test(email)) {
                alert('Proszę wprowadzić poprawny adres e-mail.');
                return;
            }

            const emailModalInstance = bootstrap.Modal.getInstance(emailInputModal);
            if (emailModalInstance) {
                emailModalInstance.hide();
            }

            const cashoutModalInstance = new bootstrap.Modal(cashoutModal);
            cashoutModalInstance.show();
        });
    }

    const cashoutModal = document.getElementById('cashoutModal');
    if (cashoutModal) {
        cashoutModal.addEventListener('show.bs.modal', renderCashout);
    }

    if (closeCashoutModalBtn) {
        closeCashoutModalBtn.addEventListener('click', () => {
            // Close the cashout modal
            const cashoutModalInstance = bootstrap.Modal.getInstance(cashoutModal);
            if (cashoutModalInstance) {
                cashoutModalInstance.hide();
            }
            // Restart the game
            restartGame();
        });
    }

    function restartGame() {
        // Only the host can reset the game state
        if (amIHost) {
            db.ref("gameState").set({ status: "LOBBY" });
            db.ref("players").set(null); // Clear all players
        }
        location.reload(); // Explicitly refresh the page
    }

    function renderCashout() {
        cashoutBody.innerHTML = '';
        if (!gameData || !gameData.initialBudgets || !playersData) {
            cashoutBody.innerHTML = '<p class="text-center text-muted">Brak danych do podziału budżetu.</p>';
            return;
        }

        const currentSharedBudget = gameData.sharedBudget;
        const initialBudgets = gameData.initialBudgets;
        const totalInitialBudget = 500; // This is always 500 based on lobby validation

        let tableHTML = `
            <table class="table table-striped">
                <thead>
                    <tr>
                        <th scope="col">Gracz</th>
                        <th scope="col">Udział Początkowy (PKT)</th>
                        <th scope="col">Udział Początkowy (%)</th>
                        <th scope="col">Końcowy Budżet (PKT)</th>
                    </tr>
                </thead>
                <tbody>
        `;

        Object.keys(initialBudgets).forEach(playerId => {
            const playerName = playersData[playerId]?.name || `Nieznany (${playerId})`;
            const initialContribution = initialBudgets[playerId];
            const percentage = (initialContribution / totalInitialBudget) * 100;
            const finalShare = (percentage / 100) * currentSharedBudget;

            tableHTML += `
                <tr>
                    <td>${playerName}</td>
                    <td>${initialContribution}</td>
                    <td>${percentage.toFixed(2)}%</td>
                    <td>${finalShare.toFixed(2)}</td>
                </tr>
            `;
        });

        tableHTML += `
                </tbody>
            </table>
            <h5 class="mt-4 text-end">Całkowity budżet do podziału: ${currentSharedBudget} PKT</h5>
        `;

        cashoutBody.innerHTML = tableHTML;
    }
});