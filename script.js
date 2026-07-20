// --- KONFIGURATION ---
const CLIENT_ID = '181216a37f1e48378e89b32fc5b208a1'; 
const REDIRECT_URI = 'https://guppaq.github.io/hitguessr/'; 
const SCOPES = 'streaming user-read-email user-read-private';

let accessToken = null;

// --- SPOTIFY INLOGGNING ---
const loginBtn = document.getElementById('login-btn');

loginBtn.addEventListener('click', () => {
    const authUrl = `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&response_type=token&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(SCOPES)}`;
    window.location.href = authUrl;
});

// Kolla om vi precis kom tillbaka från Spotify med en token
function checkUrlForToken() {
    const hash = window.location.hash;
    if (hash) {
        const urlParams = new URLSearchParams(hash.substring(1));
        accessToken = urlParams.get('access_token');
        
        if (accessToken) {
            // Vi är inloggade! Byt skärm
            document.getElementById('login-screen').classList.remove('active');
            document.getElementById('game-screen').classList.active = true;
            document.getElementById('game-screen').style.display = 'block'; // Tvinga visning
            
            // Rensa URL:en så den ser snygg ut
            window.history.pushState("", document.title, window.location.pathname);
            
            // Redo att hämta låtar! (Nästa steg)
            console.log("Inloggad och redo!");
        }
    }
}

// --- SPEL-LOGIK (GRUND) ---
const tabs = document.querySelectorAll('.tab-btn');
let currentPlayerIndex = 0;

// Logik för att byta flik mellan familjemedlemmarna
tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
        // Ta bort aktiv klass från alla
        tabs.forEach(t => t.classList.remove('active'));
        // Sätt aktiv klass på klickad
        e.target.classList.add('active');
        
        currentPlayerIndex = e.target.getAttribute('data-player');
        console.log("Bytte till spelare: " + currentPlayerIndex);
        
        // Här ska koden in för att byta ut korten på tidslinjen
    });
});

const drawCardBtn = document.getElementById('draw-card-btn');
const mysteryCard = document.getElementById('mystery-card');
const lockInBtn = document.getElementById('lock-in-btn');

// Dra ett kort
drawCardBtn.addEventListener('click', () => {
    mysteryCard.classList.remove('hidden');
    lockInBtn.disabled = false;
    // Här lägger vi till anropet till Spotify API för att hämta slumpmässig låt
});

// Körs när sidan laddas
window.onload = checkUrlForToken;
