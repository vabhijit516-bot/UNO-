import { useState, useMemo, useEffect, useCallback } from 'react';
import { initializeGame, applyAction, getValidActionsForPlayer, EngineState, CardColor } from '@uno/shared';

export function useLocalGame(playerIds: string[]) {
    const localPlayerId = playerIds[0];
    const initialGameState = useMemo(() => initializeGame(playerIds), [playerIds]);
    const [gameState, setGameState] = useState<EngineState>(initialGameState);

    const playCard = useCallback((cardId: string) => {
        setGameState(curr => {
            const { newState, error } = applyAction(curr, localPlayerId, { type: 'playCard', cardId });
            if (error) {
                console.error('Play error:', error);
                return curr;
            }
            return newState;
        });
    }, [localPlayerId]);

    const drawCard = useCallback(() => {
        setGameState(curr => {
            if (curr.players[curr.currentPlayerIndex].id !== localPlayerId) return curr;
            const { newState, error } = applyAction(curr, localPlayerId, { type: 'drawCard' });
            if (error) {
                console.error('Draw error:', error);
                return curr;
            }
            return newState;
        });
    }, [localPlayerId]);

    const callUno = useCallback(() => {
        setGameState(curr => {
            const updated = { ...curr, players: [...curr.players] };
            const playerIndex = updated.players.findIndex(p => p.id === localPlayerId);
            if (playerIndex !== -1) {
                updated.players[playerIndex] = { ...updated.players[playerIndex], calledUno: true };
            }
            return updated;
        });
    }, [localPlayerId]);

    const chooseColor = useCallback((color: string) => {
        setGameState(curr => {
            const { newState, error } = applyAction(curr, localPlayerId, { type: 'chooseColor', color: color as Exclude<CardColor, 'wild'> });
            if (error) return curr;
            return newState;
        });
    }, [localPlayerId]);

    const passTurn = useCallback(() => {
        setGameState(curr => {
            const { newState, error } = applyAction(curr, localPlayerId, { type: 'passTurn' });
            if (error) return curr;
            return newState;
        });
    }, [localPlayerId]);

    const catchUno = useCallback((targetId: string) => {
        setGameState(curr => {
            const { newState, error } = applyAction(curr, localPlayerId, { type: 'catchUno', targetPlayerId: targetId });
            if (error) return curr;
            return newState;
        });
    }, [localPlayerId]);

    const startNextRound = useCallback(() => {
        setGameState(curr => {
            const { newState, error } = applyAction(curr, localPlayerId, { type: 'startNextRound' });
            if (error) return curr;
            return newState;
        });
    }, [localPlayerId]);

    // Bot AI loop
    useEffect(() => {
        const currentPlayerId = gameState.players[gameState.currentPlayerIndex]?.id;
        if (!currentPlayerId || currentPlayerId === localPlayerId) return;
        if (gameState.phase !== 'playing' && gameState.phase !== 'choosingColor') return;

        const timer = setTimeout(() => {
            setGameState(curr => {
                const cId = curr.players[curr.currentPlayerIndex]?.id;
                if (cId !== currentPlayerId) return curr; // State changed

                // 1. Check if we can catch someone! (25% chance per tick to notice)
                if (Math.random() < 0.25) {
                    const vulnerable = curr.players.find(p => p.id !== cId && p.hand.length === 1 && !p.calledUno);
                    if (vulnerable) {
                        const { newState } = applyAction(curr, cId, { type: 'catchUno', targetPlayerId: vulnerable.id });
                        return newState;
                    }
                }

                if (curr.phase === 'choosingColor') {
                    // Bot picks random color
                    const colors: Exclude<CardColor, 'wild'>[] = ['red', 'yellow', 'green', 'blue'];
                    const randomColor = colors[Math.floor(Math.random() * colors.length)];
                    const { newState } = applyAction(curr, cId, { type: 'chooseColor', color: randomColor });
                    return newState;
                }

                const validActions = getValidActionsForPlayer(curr, cId);
                
                if (validActions.length > 0) {
                    // If we drew a card and it's playable, play it. If we can only pass, pass.
                    const action = validActions[Math.floor(Math.random() * validActions.length)];
                    const { newState } = applyAction(curr, cId, action);
                    
                    // Small chance for bot to forget to call UNO
                    if (action.type === 'playCard' && newState.players.find(p => p.id === cId)?.hand.length === 1) {
                        if (Math.random() > 0.2) { // 80% chance to remember UNO
                            const { newState: finalState } = applyAction(newState, cId, { type: 'callUno' });
                            return finalState;
                        }
                    }
                    return newState;
                } else {
                    const { newState } = applyAction(curr, cId, { type: 'drawCard' });
                    return newState;
                }
            });
        }, 1500); // 1.5s delay for bots

        return () => clearTimeout(timer);
    }, [gameState.currentPlayerIndex, gameState.phase, localPlayerId]);

    return {
        gameState,
        localPlayerId,
        playCard,
        drawCard,
        callUno,
        chooseColor,
        passTurn,
        catchUno,
        startNextRound
    };
}
