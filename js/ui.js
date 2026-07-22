/**
 * ui.js
 *
 * ---
 * Converts game state into visuals.
 * No game rules here.
 */


import {
  artGradientFor
} from "./data.js";



export const qs =
  (
    selector,
    root = document
  ) =>
    root.querySelector(selector);






// --------------------------------------------------
// Screen switching
// --------------------------------------------------


export function showScreen(name) {

  document
    .querySelectorAll(".screen")
    .forEach(screen => {

      screen.classList.toggle(
        "is-active",
        screen.dataset.screen === name
      );

    });

}







// --------------------------------------------------
// Artwork
// --------------------------------------------------


function artMarkup(
  card,
  className
) {


  if (card.albumImageUrl) {

    return `
      <img
        class="${className}"
        src="${card.albumImageUrl}"
        alt=""
      />
    `;

  }



  return `
    <div
      class="${className}"
      style="
        background:
        ${artGradientFor(card.id)}
      "
    ></div>
  `;

}







// --------------------------------------------------
// Timeline cards
// --------------------------------------------------


export function buildTimelineCard(card) {


  const element =
    document.createElement(
      "div"
    );


  element.className =
    "timeline-card";



  element.innerHTML =
  `

    ${artMarkup(
      card,
      "timeline-card__art"
    )}


    <p class="timeline-card__year">
      ${card.year}
    </p>


    <p class="timeline-card__title">
      ${card.title}
    </p>

  `;



  return element;

}







export function buildGap(index) {


  const element =
    document.createElement(
      "div"
    );


  element.className =
    "timeline-gap";


  element.dataset.gapIndex =
    String(index);



  return element;

}








export function renderTimeline(
  container,
  cards,
  {
    interactive = true
  } = {}
) {


  container.innerHTML = "";



  if (interactive) {

    container.appendChild(
      buildGap(0)
    );

  }




  cards.forEach(
    (card,index)=>{


      container.appendChild(
        buildTimelineCard(card)
      );



      if (interactive) {

        container.appendChild(
          buildGap(index+1)
        );

      }


    }
  );






  if (
    !interactive &&
    cards.length === 0
  ) {

    const empty =
      document.createElement(
        "p"
      );


    empty.className =
      "hint";


    empty.textContent =
      "No cards placed yet.";


    container.appendChild(
      empty
    );

  }


}








// --------------------------------------------------
// Stats
// --------------------------------------------------


export function setStats(
  scoreEl,
  remainingEl,
  score,
  remaining
) {


  scoreEl.textContent =
    String(score);


  remainingEl.textContent =
    String(remaining);

}








// --------------------------------------------------
// Mystery vinyl card
// --------------------------------------------------


export function resetMysteryCard(
  cardEl,
  playButton
) {


  cardEl.classList.remove(
    "is-revealed",
    "is-playing",
    "is-incorrect"
  );



  playButton.classList.remove(
    "is-playing"
  );



  const disc =
    qs(
      ".card__disc",
      cardEl
    );



  if (disc) {

    disc.innerHTML =
      "";

  }

}

// -----------------------------------------------------------------------
// Start screen helpers
// -----------------------------------------------------------------------

export function setSpotifyStatus(el, message, type = "") {
  el.textContent = message;

  el.classList.remove(
    "spotify-status--success",
    "spotify-status--error",
    "spotify-status--info"
  );

  if (type) {
    el.classList.add(`spotify-status--${type}`);
  }
}

export function setPlaylistStatus(el, message, type = "") {
  el.textContent = message;

  el.classList.remove(
    "playlist-status--success",
    "playlist-status--error",
    "playlist-status--info"
  );

  if (type) {
    el.classList.add(`playlist-status--${type}`);
  }
}


// -----------------------------------------------------------------------
// Spotify playlist error explanation
// -----------------------------------------------------------------------

export function showPlaylistPermissionHelp(el) {
  el.innerHTML = `
    <strong>Couldn't load that playlist.</strong><br><br>
    Spotify only allows HitGuessr to read playlists you own or collaborate on.

    To use any Spotify playlist:
    <br><br>
    1. Open the playlist in Spotify<br>
    2. Press the three dots (⋯)<br>
    3. Choose "Add to other playlist"<br>
    4. Create a new playlist<br>
    5. Use that new playlist here
  `;

  el.classList.remove(
    "playlist-status--success",
    "playlist-status--info"
  );

  el.classList.add("playlist-status--error");
}


// -----------------------------------------------------------------------
// Start button state
// -----------------------------------------------------------------------

export function setStartButtonEnabled(button, enabled) {
  button.disabled = !enabled;
  button.classList.toggle("is-disabled", !enabled);
}


// -----------------------------------------------------------------------
// Vinyl player state
// -----------------------------------------------------------------------

export function setPlayingState(cardEl, playButton, playing) {
  cardEl.classList.toggle("is-playing", playing);
  playButton.classList.toggle("is-playing", playing);

  playButton.setAttribute(
    "aria-label",
    playing ? "Pause song" : "Play song"
  );
}

// -----------------------------------------------------------------------
// Reveal mystery card answer
// -----------------------------------------------------------------------

export function revealMysteryCard(cardEl, card) {
  cardEl.classList.add("is-revealed");
  cardEl.classList.remove("is-playing");

  const artSlot = qs(".card__art-slot", cardEl);

  if (artSlot) {
    artSlot.innerHTML = artMarkup(card, "card__art");
  }

  const year = qs(".card__year", cardEl);
  const title = qs(".card__title", cardEl);
  const artist = qs(".card__artist", cardEl);

  if (year) year.textContent = String(card.year);
  if (title) title.textContent = card.title;
  if (artist) artist.textContent = card.artist;
}