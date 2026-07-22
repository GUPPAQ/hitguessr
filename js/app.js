/**
 * app.js
 *
 * Main controller:
 * DOM events -> game.js / spotify.js -> ui.js
 */

console.log("HitGuessr app.js loaded");

import { Game } from "./game.js";
import { shuffledDeck, FAKE_DECK } from "./data.js";
import { initDragToPlace } from "./timeline.js";
import { getBestScore, saveBestScoreIfHigher } from "./storage.js";
import * as spotify from "./spotify.js";

import {
  showScreen,
  qs,
  renderTimeline,
  setStats,
  resetMysteryCard,
  revealMysteryCard,
  flashFeedback,
  clearFeedback,
} from "./ui.js";


// -----------------------------
// DOM
// -----------------------------

const els = {

  playerNameInput: qs("#player-name"),

  btnStart: qs("#btn-start"),
  btnAgain: qs("#btn-again"),

  btnPlay: qs("#btn-play"),

  playerLabel: qs("#player-label"),

  statScore: qs("#stat-score"),
  statRemaining: qs("#stat-remaining"),

  mysteryCard: qs("#mystery-card"),
  timeline: qs("#timeline"),
  endTimeline: qs("#end-timeline"),

  feedback: qs("#feedback"),

  endTitle: qs("#end-title"),
  endEyebrow: qs("#end-eyebrow"),
  endScoreValue: qs("#end-score-value"),

  modeHint: qs("#mode-hint"),


  // Spotify
  btnSpotifyConnect: qs("#btn-spotify-connect"),
  spotifyConnected: qs("#spotify-connected"),
  spotifyStatus: qs("#spotify-status"),

  playlistUrl: qs("#playlist-url"),
  playlistStatus: qs("#playlist-status"),

};


let game = null;
let realDeck = null;

let spotifyPlayer = null;
let isSpotifyTrackPlaying = false;

let awaitingPlacement = false;


// -----------------------------
// Validation
// -----------------------------

function canStartGame() {

  const name =
    els.playerNameInput.value.trim();

  return (
    name.length > 0 &&
    realDeck &&
    spotifyPlayer
  );

}


function updateStartButton() {

  els.btnStart.disabled = !canStartGame();

}



// -----------------------------
// Start game
// -----------------------------

function startGame() {

  if (!canStartGame()) {
    flashFeedback(
      els.feedback,
      false,
      "Connect Spotify and load a playlist first."
    );
    return;
  }


  const name =
    els.playerNameInput.value.trim();


  game = new Game(
    shuffledDeck(realDeck),
    name
  );


  els.playerLabel.textContent = name;


  showScreen("game");


  drawNextCard();

}



// -----------------------------
// Draw card
// -----------------------------

function drawNextCard() {

  const card = game.drawNext();


  if (!card) {
    endRound();
    return;
  }


  resetMysteryCard(
    els.mysteryCard,
    els.btnPlay
  );


  clearFeedback(
    els.feedback
  );


  renderTimeline(
    els.timeline,
    game.timeline,
    {
      interactive:true
    }
  );


  setStats(
    els.statScore,
    els.statRemaining,
    game.score,
    game.remainingToWin
  );


  awaitingPlacement = true;
  isSpotifyTrackPlaying = false;

}

// -----------------------------
// Drop handling
// -----------------------------

async function handleDrop(insertIndex) {

  if (!awaitingPlacement) return;

  awaitingPlacement = false;


  if (isSpotifyTrackPlaying && spotifyPlayer) {
    spotify.pausePlayback(
      spotifyPlayer.deviceId
    ).catch(() => {});
  }


  const placedCard = game.currentCard;

  const { correct } =
    game.resolvePlacement(insertIndex);


  revealMysteryCard(
    els.mysteryCard,
    placedCard
  );


  flashFeedback(
    els.feedback,
    correct,
    correct
      ? "Correct — nice ear."
      : "Not quite — here's where it goes."
  );


  renderTimeline(
    els.timeline,
    game.timeline,
    {
      interactive:true
    }
  );


  setStats(
    els.statScore,
    els.statRemaining,
    game.score,
    game.remainingToWin
  );


  const delay = correct ? 1400 : 2000;


  setTimeout(() => {

    if (
      game.hasWon ||
      game.isDeckEmpty
    ) {
      endRound();
    } 
    else {
      drawNextCard();
    }

  }, delay);

}



// -----------------------------
// End screen
// -----------------------------

function endRound() {

  const newBest =
    saveBestScoreIfHigher(
      game.score
    );


  els.endEyebrow.textContent =
    game.hasWon
      ? "you win"
      : "round over";


  els.endTitle.textContent =
    game.hasWon
      ? "Timeline complete"
      : "That's the deck";


  els.endScoreValue.textContent =
    String(game.score);


  renderTimeline(
    els.endTimeline,
    game.timeline,
    {
      interactive:false
    }
  );


  if (newBest) {
    els.endEyebrow.textContent +=
      " · new best";
  }


  showScreen("end");

}



// -----------------------------
// Play button
// -----------------------------

async function togglePlay() {

  if (!awaitingPlacement)
    return;


  const playing =
    els.mysteryCard.classList.toggle(
      "is-playing"
    );


  els.btnPlay.classList.toggle(
    "is-playing",
    playing
  );


  if (!spotifyPlayer)
    return;


  const card =
    game.currentCard;


  try {

    if (playing) {

      await spotifyPlayer.player.activateElement();

      await spotify.playTrack(
        spotifyPlayer.deviceId,
        card.uri
      );


      isSpotifyTrackPlaying = true;


    } else {


      await spotify.pausePlayback(
        spotifyPlayer.deviceId
      );


      isSpotifyTrackPlaying = false;

    }


  } catch(err) {

    flashFeedback(
      els.feedback,
      false,
      err.message
    );

  }

}



// -----------------------------
// Spotify
// -----------------------------

async function connectSpotify() {

  els.btnSpotifyConnect.textContent =
    "Connecting...";


  await spotify.beginLogin();

}



async function afterSpotifyLogin() {

  els.btnSpotifyConnect.hidden = true;

  els.spotifyConnected.hidden = false;


  try {

    const {
      displayName
    } = await spotify.fetchProfile();


    els.spotifyStatus.textContent =
      `Connected as ${displayName}`;


    spotifyPlayer =
      await spotify.createPlayer();


    await spotify.transferPlaybackHere(
      spotifyPlayer.deviceId
    );


    els.playlistStatus.textContent =
      "Paste your playlist link.";


    updateStartButton();


  }
  catch(err) {

    els.spotifyStatus.textContent =
      "Spotify connection failed.";

    console.error(err);

  }

}



// -----------------------------
// Playlist loading
// -----------------------------

async function loadPlaylist() {

  const url =
    els.playlistUrl.value.trim();


  if (!url)
    return;


  els.playlistStatus.textContent =
    "Loading playlist...";


  try {

    const tracks =
      await spotify.fetchPlaylistTracks(url);



    if (tracks.length < 5) {

      els.playlistStatus.textContent =
        "Playlist needs at least 5 songs.";

      return;

    }


    realDeck = tracks;


    els.playlistStatus.textContent =
      `${tracks.length} songs loaded.`;


    els.modeHint.textContent =
      "Ready to play.";


    updateStartButton();


  }
  catch(err) {


    console.warn(err);


    els.playlistStatus.textContent =
      `
This playlist cannot be loaded.

Spotify only allows playlists you own
or collaborate on.

Open Spotify:
1. Press three dots
2. Add to playlist
3. Create a new playlist
4. Try that playlist here
      `;


  }

}



// -----------------------------
// Events
// -----------------------------

els.btnStart.addEventListener(
  "click",
  startGame
);


els.btnAgain.addEventListener(
  "click",
  () => showScreen("start")
);


els.btnPlay.addEventListener(
  "click",
  togglePlay
);



els.playerNameInput.addEventListener(
  "input",
  updateStartButton
);



els.btnSpotifyConnect.addEventListener(
  "click",
  connectSpotify
);



els.playlistUrl.addEventListener(
  "change",
  loadPlaylist
);



initDragToPlace({

  cardEl:
    els.mysteryCard,

  timelineContainer:
    els.timeline,

  canDrag:
    () => awaitingPlacement,

  onDrop:
    handleDrop

});



// -----------------------------
// Startup
// -----------------------------

const best =
  getBestScore();


if (best > 0) {

  els.modeHint.textContent =
    `Best so far: ${best} correct`;

}



spotify.handleRedirectCallback()
.then(
  (justLoggedIn) => {

    if (
      justLoggedIn ||
      spotify.isLoggedIn()
    ) {

      afterSpotifyLogin();

    }

  }
);