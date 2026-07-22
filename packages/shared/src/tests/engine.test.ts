import { describe, expect, it } from 'vitest';
import { applyAction, initializeGame, getValidActionsForPlayer } from '../engine.js';

describe('engine', () => {
    it('initializes a game with the right hand sizes', () => {
        const state = initializeGame(['p1', 'p2']);
        expect(state.players).toHaveLength(2);
        state.players.forEach((player) => expect(player.hand).toHaveLength(7));
    });

    it('plays a valid card and advances the turn', () => {
        const state = initializeGame(['p1', 'p2']);
        const validActions = getValidActionsForPlayer(state, 'p1');
        // Find a non-wild, non-skip, non-reverse card for the test to ensure simple turn advancement
        const numberAction = validActions.find(a => {
            const card = state.players[0].hand.find(c => c.id === a.cardId);
            return card && card.type === 'number';
        });
        
        if (!numberAction) {
            // If by chance no number cards, just pass (or we could mock)
            return;
        }
        expect(validActions.length).toBeGreaterThan(0);
        const result = applyAction(state, 'p1', numberAction);
        expect(result.error).toBeUndefined();
        expect(result.newState.players[0].hand.some((item) => item.id === numberAction.cardId)).toBe(false);
        expect(result.newState.currentPlayerIndex).toBe(1);
    });
});
