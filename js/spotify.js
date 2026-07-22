/**
 * spotify.js
 *
 * ---
 * Everything related to Spotify:
 *
 * - Login (PKCE)
 * - Tokens
 * - Playlist loading
 * - Web Playback SDK
 *
 * Game logic stays elsewhere.
 */


const CLIENT_ID =
  "181216a37f1e48378e89b32fc5b208a1";


const REDIRECT_URI =
  window.location.origin +
  window.location.pathname;


const SCOPES = [
  "streaming",
  "user-read-email",
  "user-read-private",
  "user-modify-playback-state",
  "user-read-playback-state",
  "playlist-read-private",
].join(" ");



const STORAGE = {

  verifier:
    "hitguessr:pkce_verifier",

  access:
    "hitguessr:spotify_access_token",

  refresh:
    "hitguessr:spotify_refresh_token",

  expiresAt:
    "hitguessr:spotify_expires_at",

};





// --------------------------------------------------
// PKCE helpers
// --------------------------------------------------


function base64UrlEncode(bytes) {

  let binary = "";

  bytes.forEach(
    byte =>
      binary += String.fromCharCode(byte)
  );


  return binary
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

}



function generateCodeVerifier() {

  const bytes =
    new Uint8Array(64);

  crypto.getRandomValues(bytes);


  return base64UrlEncode(bytes);

}



async function generateCodeChallenge(verifier) {

  const data =
    new TextEncoder()
      .encode(verifier);


  const digest =
    await crypto.subtle.digest(
      "SHA-256",
      data
    );


  return base64UrlEncode(
    new Uint8Array(digest)
  );

}





// --------------------------------------------------
// Login
// --------------------------------------------------


export async function beginLogin() {

  const verifier =
    generateCodeVerifier();


  const challenge =
    await generateCodeChallenge(
      verifier
    );


  sessionStorage.setItem(
    STORAGE.verifier,
    verifier
  );



  const params =
    new URLSearchParams({

      client_id:
        CLIENT_ID,

      response_type:
        "code",

      redirect_uri:
        REDIRECT_URI,

      scope:
        SCOPES,

      code_challenge_method:
        "S256",

      code_challenge:
        challenge,

    });



  window.location.assign(
    `https://accounts.spotify.com/authorize?${params}`
  );

}




export async function handleRedirectCallback() {

  const params =
    new URLSearchParams(
      window.location.search
    );


  const code =
    params.get("code");


  if (!code) {
    return false;
  }



  const verifier =
    sessionStorage.getItem(
      STORAGE.verifier
    );



  const body =
    new URLSearchParams({

      client_id:
        CLIENT_ID,

      grant_type:
        "authorization_code",

      code,

      redirect_uri:
        REDIRECT_URI,

      code_verifier:
        verifier,

    });



  const response =
    await fetch(
      "https://accounts.spotify.com/api/token",
      {
        method:
          "POST",

        headers:
          {
            "Content-Type":
              "application/x-www-form-urlencoded",
          },

        body,
      }
    );



  if (!response.ok) {

    throw new Error(
      "Spotify login failed."
    );

  }



  storeTokens(
    await response.json()
  );


  sessionStorage.removeItem(
    STORAGE.verifier
  );


  history.replaceState(
    {},
    "",
    window.location.pathname
  );


  return true;

}

/**
 * --------------------------------------------------
 * Tokens
 * --------------------------------------------------
 */


function storeTokens({
  access_token,
  refresh_token,
  expires_in,
}) {

  localStorage.setItem(
    STORAGE.access,
    access_token
  );


  if (refresh_token) {

    localStorage.setItem(
      STORAGE.refresh,
      refresh_token
    );

  }


  localStorage.setItem(
    STORAGE.expiresAt,
    String(
      Date.now() + expires_in * 1000
    )
  );

}





async function refreshAccessToken() {

  const refreshToken =
    localStorage.getItem(
      STORAGE.refresh
    );


  if (!refreshToken) {
    return null;
  }



  const response =
    await fetch(
      "https://accounts.spotify.com/api/token",
      {
        method: "POST",

        headers:
        {
          "Content-Type":
          "application/x-www-form-urlencoded",
        },

        body:
          new URLSearchParams({

            client_id:
              CLIENT_ID,

            grant_type:
              "refresh_token",

            refresh_token:
              refreshToken,

          }),
      }
    );



  if (!response.ok) {
    return null;
  }



  storeTokens(
    await response.json()
  );


  return localStorage.getItem(
    STORAGE.access
  );

}




export async function getAccessToken() {

  const expires =
    Number(
      localStorage.getItem(
        STORAGE.expiresAt
      ) || 0
    );


  if (
    Date.now()
    <
    expires - 30000
  ) {

    return localStorage.getItem(
      STORAGE.access
    );

  }


  return refreshAccessToken();

}




export function isLoggedIn() {

  return Boolean(
    localStorage.getItem(
      STORAGE.access
    )
  );

}





// --------------------------------------------------
// Spotify API
// --------------------------------------------------


async function apiGet(path) {

  const token =
    await getAccessToken();


  const response =
    await fetch(
      `https://api.spotify.com/v1${path}`,
      {
        headers:
        {
          Authorization:
          `Bearer ${token}`,
        },
      }
    );


  if (!response.ok) {

    const body =
      await response.json()
      .catch(() => null);


    throw new Error(
      body?.error?.message ||
      `Spotify error ${response.status}`
    );

  }


  return response.json();

}





export async function fetchProfile() {

  const profile =
    await apiGet("/me");


  return {

    displayName:
      profile.display_name ||
      profile.id,

  };

}




// --------------------------------------------------
// Playlist loading
// --------------------------------------------------


function extractPlaylistId(input) {

  const value =
    input.trim();



  const match =
    value.match(
      /playlist\/([a-zA-Z0-9]+)/
    );


  return match
    ? match[1]
    : value;

}





export async function fetchPlaylistTracks(
  playlistInput
) {

  const id =
    extractPlaylistId(
      playlistInput
    );



  let data;


  try {

    data =
      await apiGet(
        `/playlists/${id}/items?limit=100&fields=items(item(id,name,uri,is_local,artists(name),album(images,release_date)))`
      );

  }

  catch(error) {


    throw new Error(
      "This playlist cannot be loaded.\n\n" +

      "Spotify only allows playlists you created or collaborate on.\n\n" +

      "To use any public playlist:\n\n" +

      "1. Open the playlist in Spotify\n" +

      "2. Press the three dots\n" +

      "3. Choose 'Add to other playlist'\n" +

      "4. Create a new playlist\n\n" +

      "Then paste that new playlist link here."
    );

  }





  return data.items

    .map(
      item => item.item
    )


    .filter(
      track =>
        track &&
        !track.is_local &&
        track.album?.release_date
    )


    .map(
      track => ({

        id:
          track.id,

        title:
          track.name,

        artist:
          track.artists
          .map(a => a.name)
          .join(", "),


        year:
          Number(
            track.album.release_date
            .slice(0,4)
          ),


        uri:
          track.uri,


        albumImageUrl:
          track.album.images?.[0]?.url
          ?? null,

      })
    );

}





// --------------------------------------------------
// Web Playback SDK
// --------------------------------------------------


function loadPlaybackSdkScript() {

  return new Promise(resolve => {


    if (window.Spotify) {

      resolve(
        window.Spotify
      );

      return;

    }



    window.onSpotifyWebPlaybackSDKReady =
      () =>
        resolve(
          window.Spotify
        );



    const script =
      document.createElement(
        "script"
      );


    script.src =
      "https://sdk.scdn.co/spotify-player.js";


    document.head.appendChild(
      script
    );


  });

}





export async function createPlayer() {


  const Spotify =
    await loadPlaybackSdkScript();



  const player =
    new Spotify.Player({

      name:
        "HitGuessr",

      getOAuthToken:
        async callback =>
          callback(
            await getAccessToken()
          ),

      volume:
        0.8,

    });



  const devicePromise =
    new Promise(
      (resolve,reject)=>{


        player.addListener(
          "ready",
          ({
            device_id
          }) =>
            resolve(
              device_id
            )
        );


        player.addListener(
          "initialization_error",
          ({message}) =>
            reject(
              new Error(message)
            )
        );


        player.addListener(
          "authentication_error",
          ({message}) =>
            reject(
              new Error(message)
            )
        );


      }
    );



  await player.connect();


  return {

    player,

    deviceId:
      await devicePromise,

  };

}





export async function transferPlaybackHere(
  deviceId
) {

  const token =
    await getAccessToken();


  await fetch(
    "https://api.spotify.com/v1/me/player",
    {

      method:
        "PUT",

      headers:
      {
        Authorization:
        `Bearer ${token}`,

        "Content-Type":
        "application/json",
      },


      body:
        JSON.stringify({

          device_ids:
          [
            deviceId
          ],

          play:
            false,

        }),

    }
  );


}





export async function playTrack(
  deviceId,
  uri
) {


  const token =
    await getAccessToken();


  const response =
    await fetch(
      `https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`,

      {

        method:
          "PUT",

        headers:
        {
          Authorization:
          `Bearer ${token}`,

          "Content-Type":
          "application/json",
        },


        body:
          JSON.stringify({

            uris:
            [
              uri
            ]

          }),

      }
    );



  if (!response.ok) {

    throw new Error(
      "Could not start Spotify playback."
    );

  }

}





export async function pausePlayback(
  deviceId
) {

  const token =
    await getAccessToken();


  await fetch(
    `https://api.spotify.com/v1/me/player/pause?device_id=${deviceId}`,

    {

      method:
        "PUT",

      headers:
      {
        Authorization:
        `Bearer ${token}`,
      },

    }
  );

}