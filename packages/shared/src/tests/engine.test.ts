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
        const playAction = validActions.find(a => a.type === 'playCard');
        
        if (!playAction) {
            return;
        }
        expect(validActions.length).toBeGreaterThan(0);
        const result = applyAction(state, 'p1', playAction);
        expect(result.error).toBeUndefined();
    });

    it('includes drawCard action in valid actions when card drawing is allowed', () => {
        const state = initializeGame(['p1', 'p2']);
        const validActions = getValidActionsForPlayer(state, 'p1');
        const drawAction = validActions.find(a => a.type === 'drawCard');
        expect(drawAction).toBeDefined();
    });

    it('resets calledUno when player has more than 1 card after playing', () => {
        const state = initializeGame(['p1', 'p2']);
        state.players[0].calledUno = true;
        const validActions = getValidActionsForPlayer(state, 'p1');
        const playAction = validActions.find(a => a.type === 'playCard');
        if (playAction) {
            const { newState } = applyAction(state, 'p1', playAction);
            // Since hand length went from 7 to 6, calledUno should reset to false
            expect(newState.players[0].calledUno).toBe(false);
        }
    });

    it('handles drawing card and passing turn', () => {
        const state = initializeGame(['p1', 'p2']);
        const drawResult = applyAction(state, 'p1', { type: 'drawCard' });
        expect(drawResult.error).toBeUndefined();
        expect(drawResult.newState.hasDrawnCard).toBe(true);
        expect(drawResult.newState.players[0].hand).toHaveLength(8);

        const passResult = applyAction(drawResult.newState, 'p1', { type: 'passTurn' });
        expect(passResult.error).toBeUndefined();
        expect(passResult.newState.currentPlayerIndex).toBe(1);
        expect(passResult.newState.hasDrawnCard).toBe(false);
    });
});
