import { placeSelectedSong } from "./game.js";

function createSlot(position, onPlace) {
  const slot = document.createElement("button");
  slot.className = "timeline-slot";
  slot.type = "button";
  slot.title = position === 0 ? "Före första" : "Placera här";
  slot.setAttribute("aria-label", position === 0 ? "Placera låten före första kortet" : "Placera låten här");

  slot.addEventListener("dragover", (event) => {
    event.preventDefault();
    slot.classList.add("timeline-slot--active");
  });
  slot.addEventListener("dragleave", () => slot.classList.remove("timeline-slot--active"));
  slot.addEventListener("drop", (event) => {
    event.preventDefault();
    slot.classList.remove("timeline-slot--active");
    onPlace(position);
  });
  slot.addEventListener("click", () => placeSelectedSong(position));
  return slot;
}

function createTimelineCard(song) {
  const card = document.createElement("article");
  card.className = "timeline-card";
  const coverHtml = song.coverUrl ? `<img src="${song.coverUrl}" alt="Cover" class="timeline-card__cover">` : '';
  card.innerHTML = `
    ${coverHtml}
    <div class="timeline-card__info">
      <span class="timeline-card__year">${song.year}</span>
      <strong>${song.title}</strong>
      <small>${song.artist}</small>
    </div>
  `;
  return card;
}

export function renderTimeline(container, songs, onPlace) {
  container.replaceChildren();
  songs.forEach((song, index) => {
    container.append(createSlot(index, onPlace), createTimelineCard(song));
  });
  container.append(createSlot(songs.length, onPlace));
}
