/**
 * data.js
 *
 * ---
 * Demo deck used when Spotify is not connected.
 * Real Spotify playlists are converted into this exact format:
 *
 * {
 *   id,
 *   title,
 *   artist,
 *   year,
 *   uri,
 *   albumImageUrl
 * }
 *
 * Keeping this shape means the game logic never cares
 * where songs come from.
 */

export const FAKE_DECK = [
  {
    id: "s1",
    title: "Dreams",
    artist: "Fleetwood Mac",
    year: 1977,
  },
  {
    id: "s2",
    title: "Billie Jean",
    artist: "Michael Jackson",
    year: 1982,
  },
  {
    id: "s3",
    title: "Take On Me",
    artist: "a-ha",
    year: 1985,
  },
  {
    id: "s4",
    title: "Wonderwall",
    artist: "Oasis",
    year: 1995,
  },
  {
    id: "s5",
    title: "Crazy",
    artist: "Gnarls Barkley",
    year: 2006,
  },
  {
    id: "s6",
    title: "Somebody That I Used To Know",
    artist: "Gotye",
    year: 2011,
  },
  {
    id: "s7",
    title: "Blinding Lights",
    artist: "The Weeknd",
    year: 2019,
  },
  {
    id: "s8",
    title: "Africa",
    artist: "Toto",
    year: 1982,
  },
  {
    id: "s9",
    title: "Mr. Brightside",
    artist: "The Killers",
    year: 2003,
  },
  {
    id: "s10",
    title: "Levitating",
    artist: "Dua Lipa",
    year: 2020,
  },
  {
    id: "s11",
    title: "Hotel California",
    artist: "Eagles",
    year: 1976,
  },
  {
    id: "s12",
    title: "Lose Yourself",
    artist: "Eminem",
    year: 2002,
  },
  {
    id: "s13",
    title: "Rolling in the Deep",
    artist: "Adele",
    year: 2010,
  },
  {
    id: "s14",
    title: "Get Lucky",
    artist: "Daft Punk",
    year: 2013,
  },
  {
    id: "s15",
    title: "Smells Like Teen Spirit",
    artist: "Nirvana",
    year: 1991,
  },
];


/**
 * Fisher–Yates shuffle.
 * Returns a new array and does not mutate the original.
 */
export function shuffledDeck(deck = FAKE_DECK) {
  const copy = [...deck];

  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}


/**
 * Fallback artwork generator.
 * Used only for demo songs without Spotify album art.
 */
export function artGradientFor(id) {
  let hash = 0;

  for (let i = 0; i < id.length; i++) {
    hash =
      id.charCodeAt(i) +
      ((hash << 5) - hash);
  }

  const hue = Math.abs(hash) % 360;

  return `
    linear-gradient(
      135deg,
      hsl(${hue}, 70%, 55%),
      hsl(${(hue + 50) % 360}, 70%, 25%)
    )
  `;
}