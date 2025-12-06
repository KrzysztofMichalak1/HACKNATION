// Import the functions you need from the SDKs you need
// import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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

// ======================================================
// 1. FIREBASE CONFIGURATION
// ======================================================

// --- PASTE YOUR FIREBASE CONFIG HERE (The code you copied from the website) ---
// It looks like: const firebaseConfig = { ... };
// PASTE IT BELOW THIS LINE:



// Initialize Firebase (Standard Check)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();


// ======================================================
// 2. GAME LOGIC
// ======================================================
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let myId = null;
let players = {};

function joinGame() {
    const nameInput = document.getElementById("username");
    const name = nameInput.value;

    if (name === "") {
        alert("Please enter a name!");
        return;
    }

    // 1. Hide Login, Show Game
    document.getElementById("login-screen").style.display = "none";
    document.getElementById("game-container").style.display = "block";

    // 2. Create my unique ID
    myId = "player_" + Date.now();

    // 3. Pick a random start spot and color
    const startX = Math.random() * (canvas.width - 50);
    const startY = Math.random() * (canvas.height - 50);
    const randomColor = "hsl(" + Math.random() * 360 + ", 100%, 50%)";

    // 4. Send my data to the Cloud
    db.ref("players/" + myId).set({
        id: myId,
        name: name,
        x: startX,
        y: startY,
        color: randomColor
    });

    // 5. Remove me if I close the window
    db.ref("players/" + myId).onDisconnect().remove();

    // 6. Start listening and drawing
    initListeners();
    requestAnimationFrame(gameLoop);
}

function initListeners() {
    // Listen for ANY changes in the 'players' folder
    db.ref("players").on("value", (snapshot) => {
        players = snapshot.val() || {};
    });

    // Listen for Keyboard presses
    document.addEventListener("keydown", (event) => {
        if (!myId) return; // Not logged in yet

        const speed = 5;
        let myPlayer = players[myId];
        
        if (!myPlayer) return; // Data hasn't loaded yet

        // Update local coordinates
        if (event.key === "ArrowUp" || event.key === "w") myPlayer.y -= speed;
        if (event.key === "ArrowDown" || event.key === "s") myPlayer.y += speed;
        if (event.key === "ArrowLeft" || event.key === "a") myPlayer.x -= speed;
        if (event.key === "ArrowRight" || event.key === "d") myPlayer.x += speed;

        // Send new coordinates to Cloud
        db.ref("players/" + myId).update({
            x: myPlayer.x,
            y: myPlayer.y
        });
    });
}

function gameLoop() {
    // Clear screen
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw all players
    Object.keys(players).forEach((key) => {
        const p = players[key];
        
        // Draw Square
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 40, 40);

        // Draw Name
        ctx.fillStyle = "white";
        ctx.font = "16px Arial";
        ctx.fillText(p.name, p.x, p.y - 10);
    });

    // Keep looping
    requestAnimationFrame(gameLoop);
}   