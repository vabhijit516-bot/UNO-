import type { Card, CardColor, CardType } from './types.js';

const colors: CardColor[] = ['red', 'yellow', 'green', 'blue'];
const types: CardType[] = ['number', 'skip', 'reverse', 'drawTwo'];

export function createDeck(): Card[] {
    const deck: Card[] = [];
    const pushNumberCards = (color: CardColor) => {
        deck.push({ id: `${color}-0`, color, type: 'number', value: 0 });
        for (let value = 1; value <= 9; value += 1) {
            deck.push({ id: `${color}-${value}`, color, type: 'number', value });
            deck.push({ id: `${color}-${value}-copy`, color, type: 'number', value });
        }
    };

    colors.forEach((color) => {
        pushNumberCards(color);
        types.forEach((type) => {
            if (type === 'number') return;
            deck.push({ id: `${color}-${type}-0`, color, type, value: 20 });
            deck.push({ id: `${color}-${type}-1`, color, type, value: 20 });
        });
    });

    for (let i = 0; i < 4; i += 1) {
        deck.push({ id: `wild-${i}`, color: 'wild', type: 'wild' });
        deck.push({ id: `wild-draw-four-${i}`, color: 'wild', type: 'wildDrawFour' });
    }

    return deck;
}

export function shuffleDeck(deck: Card[]): Card[] {
    const next = [...deck];
    for (let i = next.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [next[i], next[j]] = [next[j], next[i]];
    }
    return next;
}

export function dealHands(deck: Card[], playerCount: number, cardsPerPlayer = 7): { hands: Card[][]; remaining: Card[] } {
    const hands = Array.from({ length: playerCount }, () => [] as Card[]);
    const remaining = [...deck];
    for (let i = 0; i < cardsPerPlayer * playerCount; i += 1) {
        const playerIndex = i % playerCount;
        hands[playerIndex].push(remaining.shift()!);
    }
    return { hands, remaining };
}
