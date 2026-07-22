import { describe, expect, it } from 'vitest';
import { createDeck, dealHands, shuffleDeck } from '../deck.js';

describe('deck utilities', () => {
    it('creates a 108-card deck', () => {
        const deck = createDeck();
        expect(deck).toHaveLength(108);
    });

    it('shuffles the deck without losing cards', () => {
        const deck = createDeck();
        const shuffled = shuffleDeck(deck);
        expect(shuffled).toHaveLength(deck.length);
        expect(shuffled).not.toEqual(deck);
    });

    it('deals the expected hand sizes', () => {
        const deck = createDeck();
        const { hands, remaining } = dealHands(deck, 4, 7);
        expect(hands).toHaveLength(4);
        hands.forEach((hand) => expect(hand).toHaveLength(7));
        expect(remaining).toHaveLength(108 - 28);
    });
});
