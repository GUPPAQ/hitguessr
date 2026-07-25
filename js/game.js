import { renderTimeline } from "./timeline.js";
import { fetchPlaylistTracks, playTrack, pausePlayer } from "./spotify.js";

const elements = {
  mysteryCard: document.querySelector("#mystery-card"),
  mysteryCover: document.querySelector("#mystery-cover"),
  mysteryTitle: document.querySelector("#mystery-title"),
  mysteryArtist: document.querySelector("#mystery-artist"),
  mysteryMark: document.querySelector("#mystery-mark"),
  feedback: document.querySelector("#game-feedback"),
  timeline: document.querySelector("#timeline"),
};

let game = {
  timeline: [],
  deck: [],
  currentSong: null,
  isResolving: false,
  players: [],
  scores: {},
  currentPlayerIndex: 0,
  currentRound: 1,
  maxRounds: 20,
  totalPlayed: 0
};

let selectedForPlacement = false;

function shuffle(items) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function showFeedback(message, type) {
  elements.feedback.textContent = message;
  elements.feedback.className = `game-feedback game-feedback--${type}`;
  elements.feedback.style.animation = 'none';
  void elements.feedback.offsetHeight; // trigger reflow
  elements.feedback.style.animation = '';
}

function renderScoreboard() {
  const sb = document.getElementById("game-scoreboard");
  if (!sb) return;
  sb.innerHTML = "";
  
  const sortedPlayers = [...game.players].sort((a, b) => game.scores[b] - game.scores[a]);
  
  sortedPlayers.forEach(p => {
    const li = document.createElement("li");
    li.innerHTML = `<span>${p}</span><span>${game.scores[p]} poäng</span>`;
    if (p === game.players[game.currentPlayerIndex]) {
      li.classList.add("active-player");
    }
    sb.append(li);
  });
}

function updateTurnIndicator() {
  const nameEl = document.getElementById("current-player-name");
  const roundEl = document.getElementById("current-round");
  if (nameEl && game.players.length > 0) {
    nameEl.textContent = `${game.players[game.currentPlayerIndex]}s tur`;
  }
  if (roundEl) {
    roundEl.textContent = `Runda ${game.currentRound} / ${game.maxRounds}`;
  }
}

async function drawNextSong() {
  game.currentSong = game.deck.shift();
  selectedForPlacement = false;
  elements.mysteryCard.classList.remove("mystery-card--selected", "mystery-card--dragging", "mystery-card--revealed", "mystery-card--correct", "mystery-card--wrong");

  const vinyl = document.getElementById("vinyl-record");
  if (vinyl) vinyl.classList.add("vinyl-record--spinning");

  if (!game.currentSong) {
    elements.mysteryCard.hidden = true;
    pausePlayer();
    showEndScreen();
    return;
  }

  elements.mysteryCard.hidden = false;
  elements.mysteryTitle.textContent = "Hemlig låt";
  elements.mysteryArtist.textContent = "";
  
  if (elements.mysteryCover) elements.mysteryCover.hidden = true;
  if (elements.mysteryMark) elements.mysteryMark.style.display = "";

  showFeedback("Lyssna och placera kortet på tidslinjen.", "correct");
  
  try {
    await playTrack(game.currentSong.uri);
  } catch (error) {
    console.error("Could not play track:", error);
    showFeedback("Kunde inte spela låten. Kolla att Spotify är aktivt och att du har Premium.", "wrong");
  }
}

function isCorrectPosition(position) {
  const previous = game.timeline[position - 1];
  const next = game.timeline[position];
  return (!previous || game.currentSong.year >= previous.year)
    && (!next || game.currentSong.year <= next.year);
}

async function placeSong(position) {
  if (!game.currentSong || game.isResolving) return;

  game.isResolving = true;
  game.totalPlayed += 1;
  const song = game.currentSong;
  const wasCorrect = isCorrectPosition(position);
  const currentPlayer = game.players[game.currentPlayerIndex];

  // Reveal the card
  elements.mysteryTitle.textContent = song.title;
  elements.mysteryArtist.textContent = `${song.artist} · ${song.year}`;
  if (song.coverUrl && elements.mysteryCover) {
    elements.mysteryCover.src = song.coverUrl;
    elements.mysteryCover.hidden = false;
    if (elements.mysteryMark) elements.mysteryMark.style.display = "none";
  }
  
  elements.mysteryCard.classList.add("mystery-card--revealed");
  const vinyl = document.getElementById("vinyl-record");
  if (vinyl) vinyl.classList.remove("vinyl-record--spinning");

  if (wasCorrect) {
    game.timeline.splice(position, 0, song);
    game.scores[currentPlayer] += 1;
    elements.mysteryCard.classList.add("mystery-card--correct");
    showFeedback(`🎉 Rätt! "${song.title}" kom ${song.year}.`, "correct");
  } else {
    let correctPos = game.timeline.findIndex(s => s.year > song.year);
    if (correctPos === -1) correctPos = game.timeline.length;
    game.timeline.splice(correctPos, 0, song);
    elements.mysteryCard.classList.add("mystery-card--wrong");
    showFeedback(`❌ Fel! Den kom ${song.year}. Kortet flyttas till rätt plats.`, "wrong");
  }

  render();
  renderScoreboard();
  
  // Pause audio while waiting
  try { await pausePlayer(); } catch (e) { /* ignore */ }

  window.setTimeout(() => {
    game.isResolving = false;
    
    // Advance turn
    game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
    if (game.currentPlayerIndex === 0) {
      game.currentRound += 1;
    }
    
    updateTurnIndicator();
    renderScoreboard();

    if (game.currentRound > game.maxRounds || game.deck.length === 0) {
      elements.mysteryCard.hidden = true;
      pausePlayer();
      showEndScreen();
      return;
    }
    drawNextSong();
  }, 3000);
}

function showEndScreen() {
  const screens = [...document.querySelectorAll(".screen")];
  screens.forEach(s => { s.hidden = true; s.classList.remove("screen--active"); });
  const endScreen = document.getElementById("end-screen");
  endScreen.hidden = false;
  endScreen.classList.add("screen--active");
  
  const sortedPlayers = [...game.players].sort((a, b) => game.scores[b] - game.scores[a]);
  const winner = sortedPlayers[0];
  
  document.getElementById("winner-name").textContent = winner;
  document.getElementById("stat-played").textContent = game.totalPlayed;
  document.getElementById("stat-rounds").textContent = game.currentRound - 1;

  // Build leaderboard
  const lb = document.getElementById("end-leaderboard");
  if (lb) {
    lb.innerHTML = "";
    sortedPlayers.forEach((p, i) => {
      const li = document.createElement("li");
      const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
      li.innerHTML = `<span><span class="rank">${medal}</span> ${p}</span><span class="score">${game.scores[p]} poäng</span>`;
      lb.append(li);
    });
  }
}

export function render() {
  renderTimeline(elements.timeline, game.timeline, (position) => {
    placeSong(position);
  });
}

function onCardClick() {
  if (!game.currentSong || game.isResolving) return;
  selectedForPlacement = !selectedForPlacement;
  elements.mysteryCard.classList.toggle("mystery-card--selected", selectedForPlacement);
  showFeedback(selectedForPlacement ? "Tryck på en grön plats på tidslinjen." : "Tryck på kortet för att välja det.", "correct");
}

function registerInteractions() {
  elements.mysteryCard.addEventListener("dragstart", (event) => {
    if (game.isResolving) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.effectAllowed = "move";
    elements.mysteryCard.classList.add("mystery-card--dragging");
  });

  elements.mysteryCard.addEventListener("dragend", () => {
    elements.mysteryCard.classList.remove("mystery-card--dragging");
  });

  elements.mysteryCard.addEventListener("click", onCardClick);
}

export async function startLocalGame(playlistId, playersList) {
  if (!playlistId) {
    showFeedback("Ingen spellista angiven.", "wrong");
    return;
  }
  if (!playersList || playersList.length === 0) {
    playersList = ["Player 1"];
  }
  
  showFeedback("Laddar låtar från spellistan…", "correct");

  let tracks;
  try {
    tracks = await fetchPlaylistTracks(playlistId);
  } catch (error) {
    showFeedback("Kunde inte hämta spellistan: " + error.message, "wrong");
    return;
  }
  
  if (!tracks || tracks.length < 2) {
    showFeedback(`Spellistan har för få låtar (${tracks ? tracks.length : 0} hittades, minst 2 behövs).`, "wrong");
    return;
  }

  const shuffled = shuffle(tracks);
  const [starter, ...deck] = shuffled;
  
  game = {
    timeline: [starter],
    deck,
    currentSong: null,
    isResolving: false,
    players: playersList,
    scores: {},
    currentPlayerIndex: 0,
    currentRound: 1,
    maxRounds: Math.min(20, Math.floor(deck.length / playersList.length)),
    totalPlayed: 0
  };
  
  playersList.forEach(p => game.scores[p] = 0);
  
  updateTurnIndicator();
  renderScoreboard();
  render();
  drawNextSong();
}

registerInteractions();

export function placeSelectedSong(position) {
  if (selectedForPlacement) placeSong(position);
}
