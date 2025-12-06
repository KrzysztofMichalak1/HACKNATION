document.addEventListener('DOMContentLoaded', () => {

    // --- Referencje do elementów DOM ---
    const setupScreen = document.getElementById('setup-screen');
    const gameScreen = document.getElementById('game-screen');
    const playerCountSelect = document.getElementById('player-count');
    const startGameBtn = document.getElementById('start-game-btn');

    const keyConfigScreen = document.getElementById('key-config-screen');
    const keyConfigForms = document.getElementById('key-config-forms');
    const confirmKeysBtn = document.getElementById('confirm-keys-btn');

    const sharedBudgetEl = document.getElementById('shared-budget');
    const playersContainer = document.getElementById('players-container');
    const gameInfoEl = document.getElementById('game-info');

    const diceRollArea = document.getElementById('dice-roll-area');
    const diceRollerInfo = document.getElementById('dice-roller-info');
    const diceAnimationEl = document.getElementById('dice-animation');
    const influenceCostEl = document.getElementById('influence-cost');
    const influenceControlsEl = document.getElementById('influence-controls');
    const influenceResultText = document.getElementById('influence-result-text');


    // --- Stan Gry ---
    let assignedKeys = new Set();
    let state = {
        players: [],
        sharedBudget: 100,
        currentPlayerIndex: 0,
        round: 1,
        lastResultMessage: '',
        rollHistory: [],
        currentRoll: {
            isRolling: false,
            rollerId: null,
            baseValue: 0,
            finalValue: 0,
            influenceInterval: null,
            animationTimeout: null,
            influenceCost: 0,
            influencedBy: [],
            influences: [],
            animation: {
                finalX: 0,
                finalY: 0,
            }
        },
        turnOrder: [],
    };

    // --- Nowy przepływ startu gry ---

    function showKeyConfigScreen() {
        assignedKeys.clear(); // Clear previously assigned keys on re-entry
        const playerCount = parseInt(playerCountSelect.value, 10);
        state.players = [];
        keyConfigForms.innerHTML = '';

        for (let i = 1; i <= playerCount; i++) {
            const player = {
                id: i,
                name: `Gracz ${i}`,
                bet: { type: null, value: null },
                hasPlacedBet: false,
                controls: { plus: null, minus: null }
            };
            state.players.push(player);

            const form = document.createElement('div');
            form.className = 'col-md-5';
            form.innerHTML = `
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title text-center">${player.name}</h5>
                        <div class="mb-3">
                            <label class="form-label">Klawisz dla "+1":</label>
                            <input type="text" class="form-control key-input" data-player-id="${i}" data-action="plus" placeholder="Kliknij i naciśnij klawisz" readonly>
                        </div>
                        <div>
                            <label class="form-label">Klawisz dla "-1":</label>
                            <input type="text" class="form-control key-input" data-player-id="${i}" data-action="minus" placeholder="Kliknij i naciśnij klawisz" readonly>
                        </div>
                    </div>
                </div>
            `;
            keyConfigForms.appendChild(form);
        }

        // Apply default key assignments after creating player forms
        setDefaultKeyAssignments();

        document.querySelectorAll('.key-input').forEach(input => {
            input.addEventListener('keydown', (e) => {
                e.preventDefault();
                const newKey = e.key === ' ' ? 'Space' : e.key;
                const playerId = parseInt(input.dataset.playerId, 10);
                const action = input.dataset.action;
                const player = state.players.find(p => p.id === playerId);
                const oldKey = player.controls[action];

                if (assignedKeys.has(newKey) && newKey !== oldKey) {
                    alert(`Klawisz "${newKey}" jest już przypisany! Proszę wybrać inny.`);
                    return;
                }

                // Zwolnij stary klawisz, jeśli istniał
                if (oldKey && assignedKeys.has(oldKey)) {
                    assignedKeys.delete(oldKey);
                }
                
                // Przypisz nowy klawisz
                input.value = newKey;
                player.controls[action] = newKey;
                assignedKeys.add(newKey);

                const allKeyInputs = Array.from(document.querySelectorAll('.key-input'));
                const currentIndex = allKeyInputs.indexOf(input);
                if (currentIndex < allKeyInputs.length - 1) {
                    allKeyInputs[currentIndex + 1].focus();
                } else {
                    confirmKeysBtn.focus();
                }
            });
        });

        setupScreen.classList.add('d-none');
        keyConfigScreen.classList.remove('d-none');
    }

    function saveKeysAndStartGame() {
        for (const player of state.players) {
            if (!player.controls.plus || !player.controls.minus) {
                alert(`Gracz ${player.name} musi ustawić oba klawisze!`);
                return;
            }
        }
        
        keyConfigScreen.classList.add('d-none');
        initializeGameBoard();
    }

    function setDefaultKeyAssignments() {
        assignedKeys.clear(); // Clear all previously assigned keys

        const defaultKeyMap = {
            1: { plus: 'q', minus: 'a' },
            2: { plus: 'w', minus: 's' },
            3: { plus: 'e', minus: 'd' },
            4: { plus: 'r', minus: 'f' },
            5: { plus: 't', minus: 'g' }, // Example for more players
            6: { plus: 'y', minus: 'h' },
        };

        state.players.forEach(player => {
            const playerDefaults = defaultKeyMap[player.id];
            if (playerDefaults) {
                player.controls.plus = playerDefaults.plus;
                player.controls.minus = playerDefaults.minus;
                assignedKeys.add(player.controls.plus);
                assignedKeys.add(player.controls.minus);
            } else {
                // Fallback for more players if needed, or handle error
                console.warn(`No default keys defined for player ${player.id}`);
            }
        });

        // Update the UI
        document.querySelectorAll('.key-input').forEach(input => {
            const playerId = parseInt(input.dataset.playerId, 10);
            const action = input.dataset.action;
            const player = state.players.find(p => p.id === playerId);
            if (player && player.controls[action]) {
                input.value = player.controls[action];
            }
        });
    }

    function initializeGameBoard() {
        state.turnOrder = shuffleArray([...Array(state.players.length).keys()]);
        state.currentPlayerIndex = 0;
        state.sharedBudget = 100;
        state.round = 1;
        state.lastResultMessage = '';
        state.rollHistory = [];

        gameScreen.classList.remove('d-none');
        updateBudgetUI();
        renderPlayerCards();

        diceRollArea.classList.remove('d-none');
        // Reset kostki do pozycji początkowej bez animacji
        diceAnimationEl.style.transition = 'none'; 
        const initialAngle = getRotationForFace(1);
        diceAnimationEl.style.transform = `rotateX(${initialAngle.x}deg) rotateY(${initialAngle.y}deg)`;
        
        diceRollerInfo.textContent = 'Oczekiwanie na pierwszy zakład';
        
        startTurn();
    }

    // --- Funkcje pomocnicze dla kostki 3D ---
    function getRotationForFace(face) {
        switch (face) {
            case 1: return { x: 0, y: 0 };    // front
            case 2: return { x: 0, y: -90 };   // right
            case 3: return { x: -90, y: 0 };  // top
            case 4: return { x: 90, y: 0 };   // bottom
            case 5: return { x: 0, y: 90 };    // left
            case 6: return { x: 0, y: 180 };   // back
            default: return { x: 0, y: 0 };
        }
    }

    // --- Główna logika gry ---

    function renderPlayerCards() {
        playersContainer.innerHTML = '';
        state.players.forEach(player => {
            const playerCard = document.createElement('div');
            playerCard.className = 'mb-4';
            playerCard.innerHTML = `
                <div class="player-card" id="player-card-${player.id}" data-player-id="${player.id}">
                    <h5 class="card-title">${player.name}</h5>
                    <div class="dice-placeholder mb-3">
                        <div class="dice" id="dice-display-${player.id}">?</div>
                    </div>
                    <h6>Postaw zakład:</h6>
                    <div class="bet-controls">
                        <div class="form-check form-check-inline">
                            <input class="form-check-input bet-type" type="radio" name="bet-options-${player.id}" id="bet-even-${player.id}" value="even" disabled>
                            <label class="form-check-label" for="bet-even-${player.id}">Parzyste</label>
                        </div>
                        <div class="form-check form-check-inline">
                            <input class="form-check-input bet-type" type="radio" name="bet-options-${player.id}" id="bet-odd-${player.id}" value="odd" disabled>
                            <label class="form-check-label" for="bet-odd-${player.id}">Nieparzyste</label>
                        </div>
                        <div class="input-group mt-2">
                            <input type="number" class="form-control bet-number" min="1" max="6" placeholder="Liczba" disabled>
                            <button class="btn btn-primary confirm-bet-btn" disabled>Zatwierdź</button>
                        </div>
                        <div class="bet-info mt-2 text-muted">Oczekuje...</div>
                    </div>
                </div>
            `;
            playersContainer.appendChild(playerCard);
        });
    }

    function startTurn() {
        const turnPlayerId = state.turnOrder[state.currentPlayerIndex] + 1;
        const player = state.players.find(p => p.id === turnPlayerId);
        const turnMessage = `Tura gracza: ${player.name}. Wybierz i zatwierdź swój zakład.`;
        
        if (state.lastResultMessage) {
            gameInfoEl.innerHTML = `<div>${turnMessage}</div><hr class="my-2"><p class="text-muted mb-0"><small>Ostatni wynik: ${state.lastResultMessage}</small></p>`;
        } else {
            gameInfoEl.textContent = turnMessage;
        }

        document.querySelectorAll('.player-card').forEach(card => {
            card.classList.remove('active');
            if (state.players.find(p => p.id == card.dataset.playerId).hasPlacedBet) card.classList.add('done');
            else card.classList.add('waiting');
        });

        const activeCard = document.getElementById(`player-card-${player.id}`);
        activeCard.classList.add('active');
        activeCard.classList.remove('waiting', 'done');
        enableBetControls(player.id, true);
    }

    function enableBetControls(playerId, enabled) {
        const card = document.getElementById(`player-card-${playerId}`);
        card.querySelectorAll('.bet-type, .bet-number, .confirm-bet-btn').forEach(el => el.disabled = !enabled);
        if (enabled) {
            const confirmBtn = card.querySelector('.confirm-bet-btn');
            confirmBtn.onclick = () => handleBetConfirmation(playerId);
            const numberInput = card.querySelector('.bet-number');
            const radioButtons = card.querySelectorAll('.bet-type');
            radioButtons.forEach(radio => { radio.onchange = () => { numberInput.value = ''; }; });
            numberInput.onfocus = () => { radioButtons.forEach(radio => radio.checked = false); };
        }
    }

    function handleBetConfirmation(playerId) {
        const player = state.players.find(p => p.id === playerId);
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
        player.bet = bet;
        player.hasPlacedBet = true;
        enableBetControls(playerId, false);
        
        const betInfoEl = card.querySelector('.bet-info');
        if (bet.type === 'number') betInfoEl.textContent = `Zakład: ${bet.value}`;
        else betInfoEl.textContent = `Zakład: ${bet.type === 'even' ? 'Parzyste' : 'Nieparzyste'}`;
        
        rollDiceForPlayer(playerId);
    }

    function rollDiceForPlayer(playerId) {
        const player = state.players.find(p => p.id === playerId);
        gameInfoEl.textContent = `Losowanie kostki gracza: ${player.name}`;

        // Reset stanu rzutu
        state.currentRoll.isRolling = true;
        state.currentRoll.rollerId = playerId;
        state.currentRoll.baseValue = Math.floor(Math.random() * 6) + 1;
        state.currentRoll.finalValue = state.currentRoll.baseValue;
        state.currentRoll.influenceCost = 0;
        influenceCostEl.textContent = '0';
        state.currentRoll.influencedBy = [];
        state.currentRoll.influences = [];
        influenceResultText.innerHTML = '';

        diceRollerInfo.textContent = `Rzut dla ${player.name}`;
        diceRollArea.classList.remove('d-none');
        renderInfluenceControls();
        document.addEventListener('keydown', handleKeyPress);

        const rollDuration = 8000;
        const costInterval = 1000;
        state.currentRoll.influenceInterval = setInterval(() => {
            state.currentRoll.influenceCost += 2;
            influenceCostEl.textContent = state.currentRoll.influenceCost;
        }, costInterval);
        
        // --- Nowa animacja zwalniająca ---
        const randomSpinsX = Math.floor(Math.random() * 5 + 4); // 4-9 obrotów
        const randomSpinsY = Math.floor(Math.random() * 5 + 4);

        const finalAngle = getRotationForFace(state.currentRoll.finalValue);

        state.currentRoll.animation.finalX = (randomSpinsX * 360) + finalAngle.x;
        state.currentRoll.animation.finalY = (randomSpinsY * 360) + finalAngle.y;
        
        diceAnimationEl.style.transition = `transform ${rollDuration / 1000}s cubic-bezier(.15, .9, .3, 1)`;
        diceAnimationEl.style.transform = `rotateX(${state.currentRoll.animation.finalX}deg) rotateY(${state.currentRoll.animation.finalY}deg)`;
        // --- Koniec animacji ---

        state.currentRoll.animationTimeout = setTimeout(() => {
            state.currentRoll.isRolling = false;
            document.removeEventListener('keydown', handleKeyPress);
            clearInterval(state.currentRoll.influenceInterval);
            
            influenceControlsEl.innerHTML = '<p>Czas na wpływ minął!</p>';

            if (state.currentRoll.baseValue !== state.currentRoll.finalValue) {
                influenceResultText.textContent = `Wynik przed manipulacją: ${state.currentRoll.baseValue}, po manipulacji: ${state.currentRoll.finalValue}`;
            }
            
            evaluateBet(playerId);
            goToNextTurn();
        }, rollDuration);
    }

    function renderInfluenceControls() {
        influenceControlsEl.innerHTML = '';
        state.players.forEach(p => {
            const canInfluence = state.currentRoll.rollerId !== p.id;
            const influenceWrapper = document.createElement('div');
            influenceWrapper.className = 'd-flex flex-column align-items-center';
            influenceWrapper.innerHTML = `
                <small>${p.name}</small>
                <div class="btn-group" data-influencer-id="${p.id}">
                    <button class="btn btn-sm btn-primary influence-btn" data-type="add" ${!canInfluence ? 'disabled' : ''}>+1 <small class="text-muted">(${p.controls.plus})</small></button>
                    <button class="btn btn-sm btn-primary influence-btn" data-type="sub" ${!canInfluence ? 'disabled' : ''}>-1 <small class="text-muted">(${p.controls.minus})</small></button>
                </div>
            `;
            influenceControlsEl.appendChild(influenceWrapper);
        });

        influenceControlsEl.querySelectorAll('.influence-btn').forEach(btn => {
            btn.onclick = () => {
                const influencerId = parseInt(btn.closest('.btn-group').dataset.influencerId, 10);
                const influenceType = btn.dataset.type;
                handleInfluence(influencerId, influenceType);
            };
        });
    }

    function handleInfluence(influencerId, influenceType) {
        if (!state.currentRoll.isRolling || state.currentRoll.influencedBy.includes(influencerId)) return;
        const cost = state.currentRoll.influenceCost;
        if (state.sharedBudget < cost) {
            alert('Niewystarczający budżet, aby wpłynąć na rzut!');
            return;
        }
        const influencer = state.players.find(p => p.id === influencerId);
        state.sharedBudget -= cost;
        state.currentRoll.influencedBy.push(influencerId);
        updateBudgetUI();

        const oldValue = state.currentRoll.finalValue;
        let finalVal = oldValue;
        let actionText = '';

        if (influenceType === 'add') {
            finalVal++;
            actionText = 'dodał +1';
        }
        if (influenceType === 'sub') {
            finalVal--;
            actionText = 'odjął -1';
        }
        
        if (finalVal > 6) finalVal = 1; // Wrap around
        if (finalVal < 1) finalVal = 6; // Wrap around
        state.currentRoll.finalValue = finalVal;

        // Aktualizacja animacji
        const oldAngle = getRotationForFace(oldValue);
        const newAngle = getRotationForFace(finalVal);

        // Oblicz różnicę, aby dodać ją do obecnej animacji
        const diffX = newAngle.x - oldAngle.x;
        const diffY = newAngle.y - oldAngle.y;

        state.currentRoll.animation.finalX += diffX;
        state.currentRoll.animation.finalY += diffY;
        
        // Zastosuj nową docelową rotację. Aktywna tranzycja płynnie zmieni kurs.
        diceAnimationEl.style.transform = `rotateX(${state.currentRoll.animation.finalX}deg) rotateY(${state.currentRoll.animation.finalY}deg)`;

        state.currentRoll.influences.push({ influencerName: influencer.name, action: actionText, cost: cost });
        influenceResultText.innerHTML += `<div><small>${influencer.name} ${actionText} (koszt: ${cost})</small></div>`;
        document.querySelectorAll(`.btn-group[data-influencer-id="${influencerId}"] .influence-btn`).forEach(btn => {
            btn.disabled = true;
            btn.classList.add('btn-success');
        });
    }

    function evaluateBet(playerId) {
        const player = state.players.find(p => p.id === playerId);
        const result = state.currentRoll.finalValue;
        const bet = player.bet;
        let win = false;
        if (bet.type === 'even' && result % 2 === 0) win = true;
        if (bet.type === 'odd' && result % 2 !== 0) win = true;
        if (bet.type === 'number' && result === bet.value) win = true;
        let outcomeMessage = `Wyrzucono: ${state.currentRoll.baseValue}. Wynik końcowy: ${result}. `;
        if (win) {
            const amount = bet.type === 'number' ? 50 : 10;
            state.sharedBudget += amount;
            outcomeMessage += `Zakład poprawny! +${amount} PLN`;
        } else {
            state.sharedBudget -= 5;
            outcomeMessage += `Zakład niepoprawny. -5 PLN`;
        }
        document.getElementById(`dice-display-${playerId}`).textContent = state.currentRoll.baseValue;
        updateBudgetUI();
        state.lastResultMessage = outcomeMessage;
        gameInfoEl.textContent = outcomeMessage;
        state.rollHistory.push({ rollerName: player.name, fullMessage: outcomeMessage, influences: state.currentRoll.influences });
    }

    function goToNextTurn() {
        state.currentPlayerIndex++;
        if (state.currentPlayerIndex < state.turnOrder.length) {
            setTimeout(startTurn, 2500);
        } else {
            setTimeout(endRound, 2500);
        }
    }

    function endRound() {
        gameInfoEl.innerHTML = `Runda ${state.round} zakończona! Końcowy budżet: ${state.sharedBudget} PLN. <br>`;
        const newGameBtn = document.createElement('button');
        newGameBtn.textContent = 'Zagraj od nowa';
        newGameBtn.className = 'btn btn-primary mt-3';
        newGameBtn.onclick = () => {
            gameScreen.classList.add('d-none');
            keyConfigScreen.classList.add('d-none');
            setupScreen.classList.remove('d-none');
        };
        gameInfoEl.appendChild(newGameBtn);
    }

    function handleKeyPress(e) {
        if (!state.currentRoll.isRolling) return;
        let influenceType = null;
        let influencerId = null;
        for (const player of state.players) {
            if (player.id === state.currentRoll.rollerId) continue;
            if (e.key === player.controls.plus) {
                influenceType = 'add';
                influencerId = player.id;
                break;
            }
            if (e.key === player.controls.minus) {
                influenceType = 'sub';
                influencerId = player.id;
                break;
            }
        }
        if (influencerId && influenceType) {
            e.preventDefault();
            handleInfluence(influencerId, influenceType);
        }
    }

    function updateBudgetUI() {
        sharedBudgetEl.textContent = `${state.sharedBudget} PLN`;
        sharedBudgetEl.classList.remove('text-success', 'text-danger', 'fw-bold');
        if (state.sharedBudget > 100) sharedBudgetEl.classList.add('text-success', 'fw-bold');
        else if (state.sharedBudget < 100) sharedBudgetEl.classList.add('text-danger', 'fw-bold');
    }

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    // --- Event Listeners ---
    startGameBtn.addEventListener('click', showKeyConfigScreen);
    confirmKeysBtn.addEventListener('click', saveKeysAndStartGame);
    document.getElementById('set-default-keys-btn').addEventListener('click', setDefaultKeyAssignments);

    const historyModal = document.getElementById('historyModal');
    const historyLog = document.getElementById('history-log');

    function renderHistory() {
        historyLog.innerHTML = '';
        if (state.rollHistory.length === 0) {
            historyLog.innerHTML = '<p class="text-center text-muted">Brak historii dla tej rundy.</p>';
            return;
        }
        const list = document.createElement('ul');
        list.className = 'list-group';
        [...state.rollHistory].reverse().forEach(entry => {
            const listItem = document.createElement('li');
            listItem.className = 'list-group-item';
            let influencesHTML = '';
            if (entry.influences && entry.influences.length > 0) {
                influencesHTML += '<ul class="list-unstyled mt-2 mb-0">';
                entry.influences.forEach(influence => {
                    influencesHTML += `<li><small class="text-muted ps-3">&rarr; ${influence.influencerName} ${influence.action} (koszt: ${influence.cost} PLN)</small></li>`;
                });
                influencesHTML += '</ul>';
            }
            listItem.innerHTML = `
                <div><strong>${entry.rollerName}:</strong> ${entry.fullMessage}</div>
                ${influencesHTML}
            `;
            list.appendChild(listItem);
        });
        historyLog.appendChild(list);
    }
    historyModal.addEventListener('show.bs.modal', renderHistory);

    function handleGlobalKeyPress(e) {
        if (e.key === 'Enter') {
            if (!setupScreen.classList.contains('d-none')) {
                startGameBtn.click();
                e.preventDefault();
            } else if (!keyConfigScreen.classList.contains('d-none')) {
                confirmKeysBtn.click();
                e.preventDefault();
            } else if (!gameScreen.classList.contains('d-none') && !state.currentRoll.isRolling) {
                const activeCard = document.querySelector('.player-card.active');
                if (activeCard) {
                    const confirmBetButton = activeCard.querySelector('.confirm-bet-btn');
                    if (confirmBetButton && !confirmBetButton.disabled) {
                        confirmBetButton.click();
                        e.preventDefault();
                    }
                }
            }
        }
    }
    document.addEventListener('keydown', handleGlobalKeyPress);
});