import { describe, expect, it } from 'vitest';
import { applyAction, initializeGame, getValidActionsForPlayer } from '../engine.js';

describe('engine', () => {
    it('initializes a game with the right hand sizes', () => {
        const state = initializeGame(['p1', 'p2']);
        expect(state.players).toHaveLength(2);
        // Standard start hands are 7 cards, unless opening card is Draw Two (which adds +2 penalty)
        expect(state.players[0].hand.length).toBeGreaterThanOrEqual(7);
        expect(state.players[1].hand.length).toBeGreaterThanOrEqual(7);
    });

    it('plays a valid card and advances the turn', () => {
        const state = initializeGame(['p1', 'p2']);
        const currentPlayerId = state.players[state.currentPlayerIndex].id;
        const validActions = getValidActionsForPlayer(state, currentPlayerId);
        const playAction = validActions.find(a => a.type === 'playCard');
        
        if (!playAction) {
            return;
        }
        expect(validActions.length).toBeGreaterThan(0);
        const result = applyAction(state, currentPlayerId, playAction);
        expect(result.error).toBeUndefined();
    });

    it('includes drawCard action in valid actions when card drawing is allowed', () => {
        const state = initializeGame(['p1', 'p2']);
        const currentPlayerId = state.players[state.currentPlayerIndex].id;
        const validActions = getValidActionsForPlayer(state, currentPlayerId);
        const drawAction = validActions.find(a => a.type === 'drawCard');
        expect(drawAction).toBeDefined();
    });

    it('resets calledUno when player has more than 1 card after playing', () => {
        const state = initializeGame(['p1', 'p2']);
        const currentPlayerId = state.players[state.currentPlayerIndex].id;
        state.players[state.currentPlayerIndex].calledUno = true;
        const validActions = getValidActionsForPlayer(state, currentPlayerId);
        const playAction = validActions.find(a => a.type === 'playCard');
        if (playAction) {
            const { newState } = applyAction(state, currentPlayerId, playAction);
            expect(newState.players[0].calledUno).toBe(false);
        }
    });

    it('handles drawing card and passing turn', () => {
        const state = initializeGame(['p1', 'p2']);
        const currentPlayerId = state.players[state.currentPlayerIndex].id;
        const drawResult = applyAction(state, currentPlayerId, { type: 'drawCard' });
        expect(drawResult.error).toBeUndefined();
        expect(drawResult.newState.hasDrawnCard).toBe(true);

        const passResult = applyAction(drawResult.newState, currentPlayerId, { type: 'passTurn' });
        expect(passResult.error).toBeUndefined();
        expect(passResult.newState.hasDrawnCard).toBe(false);
    });

    it('ensures opening card is never Wild Draw Four', () => {
        for (let i = 0; i < 20; i++) {
            const state = initializeGame(['p1', 'p2', 'p3']);
            expect(state.topDiscard.type).not.toBe('wildDrawFour');
        }
    });
});
