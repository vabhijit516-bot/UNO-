import { describe, expect, it } from 'vitest';
import { getCardPoints, getValidMoves, isValidPlay } from '../rules.js';

describe('UNO rules', () => {
  it('accepts matching color and matching number plays', () => {
    const topDiscard = { id: 'red-5', color: 'red', type: 'number', value: 5 };
    const card = { id: 'blue-5', color: 'blue', type: 'number', value: 5 };
    expect(isValidPlay(card, topDiscard, 'red')).toBe(true);
  });

  it('accepts wild cards always', () => {
    const topDiscard = { id: 'red-5', color: 'red', type: 'number', value: 5 };
    const wild = { id: 'wild-0', color: 'wild', type: 'wild' };
    expect(isValidPlay(wild, topDiscard, 'red')).toBe(true);
  });

  it('returns valid moves for a hand', () => {
    const hand = [
      { id: 'blue-5', color: 'blue', type: 'number', value: 5 },
      { id: 'wild-1', color: 'wild', type: 'wild' },
      { id: 'green-3', color: 'green', type: 'number', value: 3 },
    ];
    const topDiscard = { id: 'red-5', color: 'red', type: 'number', value: 5 };
    expect(getValidMoves(hand, topDiscard, 'red')).toHaveLength(2);
  });

  it('calculates point values', () => {
    expect(getCardPoints({ id: 'red-7', color: 'red', type: 'number', value: 7 })).toBe(7);
    expect(getCardPoints({ id: 'red-skip', color: 'red', type: 'skip' })).toBe(20);
    expect(getCardPoints({ id: 'wild-4', color: 'wild', type: 'wild' })).toBe(50);
  });
});
