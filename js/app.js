import { startLocalGame } from "./game.js";
import { loginWithSpotify, handleSpotifyRedirect, getAccessToken, logoutSpotify, initSpotifyPlayer, activatePlayer, getSpotifyUserProfile } from "./spotify.js";

const screens = [...document.querySelectorAll(".screen")];
const screenNames = new Set(screens.map((s) => s.id.replace("-screen", "")));
const authSection = document.getElementById("auth-section");
const startSection = document.getElementById("start-section");

let players = [];
let loggedInUser = null;

// ── Helpers ──
function showScreen(name) {
  if (!screenNames.has(name)) return;
  screens.forEach((screen) => {
    const isCurrent = screen.id === `${name}-screen`;
    screen.hidden = !isCurrent;
    screen.classList.toggle("screen--active", isCurrent);
  });
  window.scrollTo({ top: 0, behavior: "auto" });
}

function renderPlayers() {
  const list = document.getElementById("players-list");
  if (!list) return;
  list.innerHTML = "";
  players.forEach((p, i) => {
    const li = document.createElement("li");
    li.className = "player-item";
    li.style.justifyContent = "space-between";
    li.innerHTML = `
      <span>👤 ${p}</span>
      <button class="remove-player-btn" type="button" data-index="${i}" aria-label="Ta bort ${p}" title="Ta bort ${p}">✕</button>
    `;
    list.append(li);
  });
}

function addPlayer() {
  const input = document.getElementById("new-player-name");
  const name = input.value.trim();
  if (name && !players.includes(name)) {
    players.push(name);
    input.value = "";
    renderPlayers();
    input.focus();
  }
}

function extractSpotifyTarget(rawUrl) {
  if (!rawUrl) return null;
  const str = rawUrl.trim();

  const playlistMatch = str.match(/(?:playlist\/|playlist:)([a-zA-Z0-9]{22})/);
  if (playlistMatch) {
    return { type: 'playlist', id: playlistMatch[1] };
  }

  const albumMatch = str.match(/(?:album\/|album:)([a-zA-Z0-9]{22})/);
  if (albumMatch) {
    return { type: 'album', id: albumMatch[1] };
  }

  const bareMatch = str.match(/^([a-zA-Z0-9]{22})$/);
  if (bareMatch) {
    return { type: 'playlist', id: bareMatch[1] };
  }

  return null;
}

// ── Enter key to add player ──
document.getElementById("new-player-name")?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    addPlayer();
  }
});

// ── Enter key to start game from playlist input ──
document.getElementById("custom-playlist-url")?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    document.querySelector('[data-action="start-custom-playlist"]')?.click();
  }
});

// ── Click handler ──
document.addEventListener("click", (event) => {
  const removeBtn = event.target.closest(".remove-player-btn");
  if (removeBtn) {
    const idx = parseInt(removeBtn.dataset.index, 10);
    if (!isNaN(idx) && idx >= 0 && idx < players.length) {
      players.splice(idx, 1);
      renderPlayers();
    }
    return;
  }

  const button = event.target.closest("[data-action]");
  if (!button) return;
  const action = button.dataset.action;

  if (action === "spotify-login") loginWithSpotify();
  if (action === "spotify-logout") logoutSpotify();
  
  if (action === "open-setup") {
    if (players.length === 0 && loggedInUser) {
      players.push(loggedInUser);
    }
    renderPlayers();
    showScreen("lobby");
  }
  
  if (action === "go-landing") {
    showScreen("landing");
  }
  
  if (action === "add-player") addPlayer();

  if (action === "start-custom-playlist") {
    const input = document.getElementById("custom-playlist-url");
    const target = extractSpotifyTarget(input.value);
    
    if (!target) {
      input.classList.add("error");
      input.placeholder = "Ogiltig URL — klistra in en Spotify-spellista eller album";
      setTimeout(() => { input.classList.remove("error"); input.placeholder = "Klistra in Spotify-spellista URL"; }, 2500);
      return;
    }

    // Activate web player in user-gesture context
    activatePlayer();
    showScreen("game");
    startLocalGame(target, players.length > 0 ? players : [loggedInUser || "Spelare 1"]);
  }
});

// ── Init ──
async function init() {
  const isRedirect = await handleSpotifyRedirect();
  if (isRedirect || getAccessToken()) {
    authSection.hidden = true;
    startSection.hidden = false;
    // Start connecting the Spotify player in background
    initSpotifyPlayer().catch(err => console.warn("SDK init deferred:", err.message || err));

    // Fetch Spotify user profile to auto-populate player name
    try {
      const name = await getSpotifyUserProfile();
      if (name) {
        loggedInUser = name;
        if (players.length === 0) {
          players.push(name);
        }
      }
    } catch (e) {
      console.warn("Could not fetch user name:", e);
    }
  }
  showScreen("landing");
}

init();
