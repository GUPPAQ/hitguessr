/**
 * storage.js
 * ----------
 * A thin wrapper around localStorage. Kept in its own file so that when
 * we add real accounts/multiplayer later, this is the only place that
 * needs to change (e.g. swapping to Firebase) — nothing else in the app
 * talks to localStorage directly.
 */

const BEST_SCORE_KEY = "hitguessr:bestScore";

export function getBestScore() {
  const raw = localStorage.getItem(BEST_SCORE_KEY);
  return raw ? Number(raw) : 0;
}

export function saveBestScoreIfHigher(score) {
  const best = getBestScore();
  if (score > best) {
    localStorage.setItem(BEST_SCORE_KEY, String(score));
    return true; // it's a new best
  }
  return false;
}
