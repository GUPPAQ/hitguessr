// --- KONFIGURATION ---
const CLIENT_ID = '181216a37f1e48378e89b32fc5b208a1'; 
const REDIRECT_URI = 'https://guppaq.github.io/hitguessr/'; 
const SCOPES = 'streaming user-read-email user-read-private';

let accessToken = null;

// --- SÄKERHETSFUNKTIONER FÖR SPOTIFY (PKCE) ---
function generateRandomString(length) {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

async function generateCodeChallenge(codeVerifier) {
    const data = new TextEncoder().encode(codeVerifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode.apply(null, [...new Uint8Array(digest)]))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

// --- SPOTIFY INLOGGNING ---
const loginBtn = document.getElementById('login-btn');

loginBtn.addEventListener('click', async () => {
    // Skapa säkerhetsnycklar för inloggningen
    const codeVerifier = generateRandomString(128);
    window.localStorage.setItem('code_verifier', codeVerifier);
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    const authUrl = new URL("https://accounts.spotify.com/authorize");
    authUrl.search = new URLSearchParams({
        client_id: CLIENT_ID,
        response_type: 'code',
        redirect_uri: REDIRECT_URI,
        scope: SCOPES,
        code_challenge_method: 'S256',
        code_challenge: codeChallenge
    }).toString();

    window.location.href = authUrl.toString();
});

// Kolla om vi precis kom tillbaka från Spotify med en kod
async function checkUrlForCode() {
    const urlParams = new URLSearchParams(window.location.search);
    let code = urlParams.get('code');

    if (code) {
        let codeVerifier = localStorage.getItem('code_verifier');
        
        // Byt ut koden mot en riktig Access Token
        const payload = {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: CLIENT_ID,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: REDIRECT_URI,
                code_verifier: codeVerifier
            })
        };

        try {
            const body = await fetch("https://accounts.spotify.com/api/token", payload);
            const response = await body.json();
            
            if (response.access_token) {
                accessToken = response.access_token;
                
                // Vi är inloggade! Byt skärm
                document.getElementById('login-screen').classList.remove('active');
                document.getElementById('game-screen').classList.add('active');
                
                // Rensa URL:en så den ser snygg ut
                window.history.pushState("", document.title, window.location.pathname);
                console.log("Inloggad och redo! Token hämtad.");
            }
        } catch (error) {
            console.error("Kunde inte hämta token", error);
        }
    }
}

// --- SPEL-LOGIK (GRUND) ---
const tabs = document.querySelectorAll('.tab-btn');
let currentPlayerIndex = 0;

tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
        tabs.forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        
        currentPlayerIndex = e.target.getAttribute('data-player');
        console.log("Bytte till spelare: " + currentPlayerIndex);
    });
});

const drawCardBtn = document.getElementById('draw-card-btn');
const mysteryCard = document.getElementById('mystery-card');
const lockInBtn = document.getElementById('lock-in-btn');

drawCardBtn.addEventListener('click', () => {
    mysteryCard.classList.remove('hidden');
    lockInBtn.disabled = false;
});

// Körs när sidan laddas
window.onload = checkUrlForCode;

window.onSpotifyWebPlaybackSDKReady = () => {
    console.log("Spotify SDK är laddat och redo att användas!");
};
