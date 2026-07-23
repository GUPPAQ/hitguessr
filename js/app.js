/*
==========================================
 HITGUESSR APP
 Main application controller
==========================================
*/


// ==========================================
// APP STATE
// ==========================================

const appState = {

    currentScreen: "landing",

    player: null,

    gameStarted: false

};



// ==========================================
// DOM ELEMENTS
// ==========================================

const startButton = document.querySelector(
    ".primary-button"
);

const landingScreen = document.querySelector(
    "#landing-screen"
);



// ==========================================
// SCREEN MANAGEMENT
// ==========================================

function changeScreen(screenName) {

    appState.currentScreen = screenName;

    console.log(
        "Changed screen:",
        screenName
    );

}



// ==========================================
// START GAME
// ==========================================

function startGame() {

    appState.gameStarted = true;

    changeScreen("setup");

    console.log(
        "Game started!"
    );

}



// ==========================================
// EVENTS
// ==========================================

if (startButton) {

    startButton.addEventListener(
        "click",
        startGame
    );

}



// ==========================================
// INIT
// ==========================================

function init() {

    console.log(
        "🎵 HitGuessr loaded"
    );


    console.log(
        appState
    );

}


init();
