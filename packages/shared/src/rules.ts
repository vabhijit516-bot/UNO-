import type { Card, CardColor } from './types.js';

export function isValidPlay(card: Card, topDiscard: Card, activeColor: CardColor): boolean {
  if (card.color === 'wild') return true;
  if (topDiscard.color === 'wild') {
    return card.color === activeColor;
  }
  if (card.color === activeColor) return true;
  // Match Action Cards of the same type (e.g. Red Skip on Blue Skip)
  if (card.type === topDiscard.type && card.type !== 'number') return true;
  // Match Number Cards of the same value (e.g. Red 5 on Blue 5)
  if (card.type === 'number' && topDiscard.type === 'number') {
    return card.value === topDiscard.value;
  }
  return false;
}

export function hasMatchingColor(hand: Card[], activeColor: CardColor): boolean {
  return hand.some((card) => card.color === activeColor);
}

export function getValidMoves(hand: Card[], topDiscard: Card, activeColor: CardColor): Card[] {
  return hand.filter((card) => isValidPlay(card, topDiscard, activeColor));
}

export function getCardPoints(card: Card): number {
  if (card.type === 'wild' || card.type === 'wildDrawFour') return 50;
  if (card.type === 'skip' || card.type === 'reverse' || card.type === 'drawTwo') return 20;
  return card.value ?? 0;
}
