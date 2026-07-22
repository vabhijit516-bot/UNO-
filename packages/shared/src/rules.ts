import type { Card, CardColor } from './types.js';

export function isValidPlay(card: Card, topDiscard: Card, activeColor: CardColor): boolean {
  if (card.color === 'wild') return true;
  if (topDiscard.color === 'wild') {
    return card.color === activeColor;
  }
  if (card.color === activeColor) return true;
  if (card.type === topDiscard.type && card.color === topDiscard.color) return true;
  if (card.type === 'number' && topDiscard.type === 'number') {
    return card.value === topDiscard.value;
  }
  return false;
}

export function getValidMoves(hand: Card[], topDiscard: Card, activeColor: CardColor): Card[] {
  return hand.filter((card) => isValidPlay(card, topDiscard, activeColor));
}

export function getCardPoints(card: Card): number {
  if (card.type === 'wild' || card.type === 'wildDrawFour') return 50;
  if (card.type === 'skip' || card.type === 'reverse' || card.type === 'drawTwo') return 20;
  return card.value ?? 0;
}
