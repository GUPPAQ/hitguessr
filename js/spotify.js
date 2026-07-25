import { storage } from "./storage.js";

const CLIENT_ID = '181216a37f1e48378e89b32fc5b208a1'; 
const REDIRECT_URI = window.location.origin + window.location.pathname; 
const SCOPES = 'streaming user-read-email user-read-private user-modify-playback-state user-read-playback-state playlist-read-private playlist-read-collaborative';

// ── PKCE Auth Flow ──
const generateRandomString = (length) => {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return values.reduce((acc, x) => acc + possible[x % possible.length], "");
};

const sha256 = async (plain) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return window.crypto.subtle.digest('SHA-256', data);
};

const base64encode = (input) => {
  return btoa(String.fromCharCode(...new Uint8Array(input)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
};

export async function loginWithSpotify() {
  const codeVerifier = generateRandomString(64);
  const hashed = await sha256(codeVerifier);
  const codeChallenge = base64encode(hashed);

  storage.set('code_verifier', codeVerifier);

  const authUrl = new URL("https://accounts.spotify.com/authorize");
  authUrl.search = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    scope: SCOPES,
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
    redirect_uri: REDIRECT_URI,
  }).toString();

  window.location.href = authUrl.toString();
}

export async function handleSpotifyRedirect() {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  if (!code) return false;

  const codeVerifier = storage.get('code_verifier');
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: REDIRECT_URI,
    client_id: CLIENT_ID,
    code_verifier: codeVerifier
  });

  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body
    });

    const data = await response.json();
    if (data.access_token) {
      storage.set('access_token', data.access_token);
      window.history.replaceState({}, document.title, window.location.pathname);
      return true;
    }
  } catch (error) {
    console.error("Error exchanging code for token", error);
  }
  return false;
}

export function getAccessToken() {
  return storage.get('access_token');
}

export function logoutSpotify() {
  storage.remove('access_token');
  storage.remove('code_verifier');
  window.location.reload();
}

// ── Spotify Web Playback SDK ──
export let player = null;
let deviceId = null;
let playerReady = null; // resolves when player is ready

export function initSpotifyPlayer() {
  if (playerReady) return playerReady;

  playerReady = new Promise((resolve, reject) => {
    const token = getAccessToken();
    if (!token) {
      playerReady = null;
      return reject(new Error("No access token"));
    }

    const setup = () => {
      if (player && deviceId) {
        return resolve(deviceId);
      }

      player = new Spotify.Player({
        name: 'HitGuessr',
        getOAuthToken: cb => cb(token),
        volume: 0.8
      });

      player.addListener('ready', ({ device_id }) => {
        console.log('[HitGuessr] Spotify ready, device:', device_id);
        deviceId = device_id;
        resolve(deviceId);
      });

      player.addListener('not_ready', ({ device_id }) => {
        console.warn('[HitGuessr] Device went offline:', device_id);
        if (deviceId === device_id) deviceId = null;
      });

      player.addListener('initialization_error', ({ message }) => {
        console.error('[HitGuessr] Init error:', message);
        playerReady = null;
        reject(new Error(message));
      });

      player.addListener('authentication_error', ({ message }) => {
        console.error('[HitGuessr] Auth error:', message);
        playerReady = null;
        logoutSpotify();
        reject(new Error(message));
      });

      player.addListener('account_error', ({ message }) => {
        console.error('[HitGuessr] Account error:', message);
        playerReady = null;
        reject(new Error("Spotify Premium krävs."));
      });

      player.connect();
    };

    if (window.Spotify && window.Spotify.Player) {
      setup();
    } else {
      window.onSpotifyWebPlaybackSDKReady = setup;
    }
  });

  return playerReady;
}

export async function activatePlayer() {
  if (player) {
    try { await player.activateElement(); } catch (e) { /* ok */ }
  }
}

// ── API ──
async function apiCall(endpoint, method = 'GET', body = null) {
  const token = getAccessToken();
  if (!token) throw new Error("Inte inloggad");
  
  const res = await fetch(`https://api.spotify.com/v1${endpoint}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    method,
    body: body ? JSON.stringify(body) : null
  });
  
  if (res.status === 204) return null;
  if (res.status === 401) {
    logoutSpotify();
    throw new Error("Token utgången — logga in igen.");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error("API error:", res.status, err);
    throw new Error(`Spotify API ${res.status}`);
  }
  return await res.json();
}

// ── Fetch playlist or album tracks (with pagination & fallback properties) ──
export async function fetchPlaylistTracks(targetInput) {
  let target = targetInput;
  if (typeof targetInput === "string") {
    const match = targetInput.match(/([a-zA-Z0-9]{22})/);
    target = match ? { type: 'playlist', id: match[1] } : null;
  }
  
  if (!target || !target.id) {
    throw new Error("Ogiltig Spotify-länk.");
  }

  // ── ALBUM FETCH ──
  if (target.type === 'album') {
    let albumData;
    try {
      albumData = await apiCall(`/albums/${target.id}`);
    } catch (e) {
      console.error("[HitGuessr] Album fetch failed:", e);
      throw new Error(`Kunde inte hämta album (${e.message})`);
    }

    if (!albumData || !albumData.tracks || !albumData.tracks.items) return [];

    const year = parseInt(albumData.release_date ? albumData.release_date.split("-")[0] : "2000", 10);
    const coverUrl = (albumData.images && albumData.images.length > 0) ? albumData.images[0].url : "";

    return albumData.tracks.items
      .filter(t => t && t.uri)
      .map(t => ({
        id: t.id,
        uri: t.uri,
        title: t.name || "Okänd låt",
        artist: t.artists ? t.artists.map(a => a.name).join(", ") : (albumData.artists ? albumData.artists.map(a => a.name).join(", ") : "Okänd artist"),
        year: year,
        coverUrl: coverUrl
      }));
  }

  // ── PLAYLIST FETCH ──
  let fullData;
  try {
    fullData = await apiCall(`/playlists/${target.id}`);
  } catch (err) {
    console.error("[HitGuessr] Playlist fetch failed:", err);
    throw new Error(`Kunde inte hämta spellista (${err.message})`);
  }

  console.log(`[HitGuessr] Playlist "${fullData?.name || 'unknown'}"`);
  
  // Spotify API may return tracks under "tracks" or "items" depending on API version
  const tracksObj = fullData?.tracks || fullData?.items;
  console.log(`[HitGuessr] tracks/items object keys:`, tracksObj ? Object.keys(tracksObj) : 'NONE');
  console.log(`[HitGuessr] total=${tracksObj?.total}, items length=${tracksObj?.items?.length}, href=${tracksObj?.href}`);

  // Get items from the main response, or fetch tracks separately as fallback
  let allItems = tracksObj?.items || [];

  // If the main endpoint returned 0 items, fetch tracks directly
  if (allItems.length === 0) {
    console.log('[HitGuessr] No items in main response, trying /playlists/{id}/tracks and /items endpoints...');
    
    // Try both /tracks and /items endpoints
    for (const suffix of ['/tracks', '/items']) {
      try {
        const tracksData = await apiCall(`/playlists/${target.id}${suffix}?limit=100`);
        console.log(`[HitGuessr] ${suffix} fetch — keys:`, tracksData ? Object.keys(tracksData) : 'null');
        console.log(`[HitGuessr] ${suffix} fetch — items length:`, tracksData?.items?.length, 'total:', tracksData?.total);
        allItems = tracksData?.items || [];
        
        if (allItems.length > 0) {
          // Handle pagination
          let nextUrl = tracksData?.next;
          let pageCount = 1;
          while (nextUrl && pageCount < 5) {
            try {
              const token = getAccessToken();
              const res = await fetch(nextUrl, {
                headers: { Authorization: `Bearer ${token}` }
              });
              if (!res.ok) break;
              const page = await res.json();
              allItems = allItems.concat(page.items || []);
              nextUrl = page.next;
              pageCount++;
            } catch (e) {
              console.warn("[HitGuessr] Pagination fetch warning:", e);
              break;
            }
          }
          break; // Got items, stop trying endpoints
        }
      } catch (e) {
        console.warn(`[HitGuessr] ${suffix} endpoint failed:`, e.message);
      }
    }
  } else {
    // Handle pagination from main endpoint
    let nextUrl = tracksObj.next;
    let pageCount = 1;
    while (nextUrl && pageCount < 5) {
      try {
        const token = getAccessToken();
        const res = await fetch(nextUrl, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) break;
        const page = await res.json();
        allItems = allItems.concat(page.items || []);
        nextUrl = page.next;
        pageCount++;
      } catch (e) {
        console.warn("[HitGuessr] Pagination fetch warning:", e);
        break;
      }
    }
  }

  console.log(`[HitGuessr] Raw items from API: ${allItems.length}`);
  if (allItems.length > 0) {
    console.log('[HitGuessr] Sample item [0]:', JSON.stringify(allItems[0], null, 2).slice(0, 800));
  }
  if (allItems.length === 0) {
    console.error('[HitGuessr] Full API response for debugging:', JSON.stringify(fullData, null, 2).slice(0, 2000));
  }

  const validTracks = [];
  let skippedNull = 0, skippedLocal = 0, skippedNoUri = 0;

  for (const item of allItems) {
    // The Spotify playlist API wraps each track in { track: {...} }
    // But direct tracks endpoint may also use this structure
    const trackObj = item?.track || item?.item || item;
    if (!trackObj || typeof trackObj !== 'object') { skippedNull++; continue; }

    // Skip local files — they can't be played via API
    if (trackObj.is_local) { skippedLocal++; continue; }

    // Must have a playable spotify URI
    const uri = trackObj.uri || '';
    if (!uri.startsWith('spotify:track:')) { skippedNoUri++; continue; }

    const releaseDate = trackObj.album?.release_date || trackObj.release_date || '';
    let year = 2000; // fallback
    if (releaseDate) {
      const parsed = parseInt(releaseDate.split("-")[0], 10);
      if (!isNaN(parsed)) year = parsed;
    }

    const coverUrl = trackObj.album?.images?.[0]?.url || trackObj.images?.[0]?.url || "";

    validTracks.push({
      id: trackObj.id || Math.random().toString(),
      uri: uri,
      title: trackObj.name || "Okänd låt",
      artist: trackObj.artists ? trackObj.artists.map(a => a.name).join(", ") : "Okänd artist",
      year: year,
      coverUrl: coverUrl
    });
  }

  console.log(`[HitGuessr] Valid playable tracks: ${validTracks.length} / ${allItems.length} raw items`);
  console.log(`[HitGuessr] Skipped — null: ${skippedNull}, local: ${skippedLocal}, no URI: ${skippedNoUri}`);
  return validTracks;
}

// ── Play a track ──
export async function playTrack(uri) {
  // Make sure player is ready
  let activeDevice = deviceId;
  if (!activeDevice) {
    try {
      activeDevice = await initSpotifyPlayer();
    } catch (e) {
      throw new Error("Spotify-spelaren kunde inte startas: " + e.message);
    }
  }

  if (!activeDevice) {
    throw new Error("Ingen Spotify-enhet aktiv.");
  }

  // Transfer playback to our device first
  try {
    await apiCall('/me/player', 'PUT', { device_ids: [activeDevice], play: false });
  } catch (e) {
    // Transfer can 404 if nothing was playing before — that's fine
    console.warn("Playback transfer note:", e.message);
  }

  // Small delay to let transfer settle
  await new Promise(r => setTimeout(r, 300));

  // Play the track
  await apiCall(`/me/player/play?device_id=${activeDevice}`, 'PUT', {
    uris: [uri]
  });
}

// ── Pause ──
export async function pausePlayer() {
  if (player) {
    try { await player.pause(); } catch (e) { /* ok */ }
  }
}
