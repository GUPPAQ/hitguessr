/**
 * game.js
 *
 * ---
 * Owns all game state and rules.
 * No DOM. No Spotify. Pure game logic.
 */

export const WIN_TARGET = 10;


export class Game {

  constructor(deck, playerName) {
    this.deck = deck;
    this.playerName = playerName;

    this.timeline = [];
    this.currentCard = null;

    this.score = 0;
    this.lastPlacedCard = null;
  }


  /**
   * Draw the next mystery card.
   */
  drawNext() {
    this.currentCard = this.deck.pop() ?? null;
    return this.currentCard;
  }


  /**
   * Checks if inserting the current card at a position
   * keeps the timeline chronological.
   *
   * 0 = before all cards
   * timeline.length = after all cards
   */
  isPlacementCorrect(insertIndex) {

    const card = this.currentCard;

    if (!card) {
      return false;
    }


    const before = this.timeline[insertIndex - 1];
    const after = this.timeline[insertIndex];


    if (before && card.year < before.year) {
      return false;
    }


    if (after && card.year > after.year) {
      return false;
    }


    return true;
  }


  /**
   * Places the current card if correct.
   */
  resolvePlacement(insertIndex) {

    const card = this.currentCard;

    const correct = this.isPlacementCorrect(insertIndex);


    if (correct) {

      this.timeline.splice(
        insertIndex,
        0,
        card
      );

      this.score++;

      this.lastPlacedCard = card;
    }


    this.currentCard = null;


    return {
      correct,
      card,
    };
  }


  get remainingToWin() {

    return Math.max(
      WIN_TARGET - this.score,
      0
    );

  }


  get hasWon() {

    return this.score >= WIN_TARGET;

  }


  get isDeckEmpty() {

    return this.deck.length === 0;

  }

}