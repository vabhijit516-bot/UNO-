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
            const { newState } = applyAction(curr, localPlayerId, { type: 'callUno' });
            return newState;
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

    // Bot AI loop with robust state revision tracking
    useEffect(() => {
        const currentPlayerId = gameState.players[gameState.currentPlayerIndex]?.id;
        if (!currentPlayerId || currentPlayerId === localPlayerId) return;
        if (gameState.phase !== 'playing' && gameState.phase !== 'choosingColor') return;

        const delay = gameState.phase === 'choosingColor' ? 300 : 650;

        const timer = setTimeout(() => {
            setGameState(curr => {
                const cId = curr.players[curr.currentPlayerIndex]?.id;
                if (cId !== currentPlayerId) return curr; // Turn changed

                let currentStateToProcess = curr;

                // 1. Check if bot can catch someone who forgot UNO!
                if (Math.random() < 0.3) {
                    const vulnerable = currentStateToProcess.players.find(p => p.id !== cId && p.hand.length === 1 && !p.calledUno);
                    if (vulnerable) {
                        const { newState } = applyAction(currentStateToProcess, cId, { type: 'catchUno', targetPlayerId: vulnerable.id });
                        currentStateToProcess = newState;
                    }
                }

                if (currentStateToProcess.phase === 'choosingColor') {
                    // Bot picks best color based on its hand
                    const botHand = currentStateToProcess.players[currentStateToProcess.currentPlayerIndex]?.hand || [];
                    const colorCounts: Record<string, number> = { red: 0, yellow: 0, green: 0, blue: 0 };
                    botHand.forEach(card => {
                        if (card.color !== 'wild') colorCounts[card.color] = (colorCounts[card.color] || 0) + 1;
                    });
                    const bestColor = (Object.keys(colorCounts) as Exclude<CardColor, 'wild'>[]).reduce((a, b) => colorCounts[a] >= colorCounts[b] ? a : b, 'red');
                    const { newState } = applyAction(currentStateToProcess, cId, { type: 'chooseColor', color: bestColor });
                    return newState;
                }

                const validActions = getValidActionsForPlayer(currentStateToProcess, cId);

                if (currentStateToProcess.hasDrawnCard) {
                    // Bot already drew this turn
                    const playAction = validActions.find(a => a.type === 'playCard');
                    if (playAction) {
                        const { newState } = applyAction(currentStateToProcess, cId, playAction);
                        return newState;
                    } else {
                        const { newState } = applyAction(currentStateToProcess, cId, { type: 'passTurn' });
                        return newState;
                    }
                }

                const playActions = validActions.filter(a => a.type === 'playCard');

                if (playActions.length > 0) {
                    const action = playActions[Math.floor(Math.random() * playActions.length)];
                    const { newState } = applyAction(currentStateToProcess, cId, action);

                    // Chance for bot to call UNO if remaining hand is 1
                    const updatedBotHand = newState.players.find(p => p.id === cId)?.hand;
                    if (updatedBotHand && updatedBotHand.length === 1) {
                        if (Math.random() > 0.15) { // 85% chance to call UNO
                            const { newState: finalState } = applyAction(newState, cId, { type: 'callUno' });
                            return finalState;
                        }
                    }
                    return newState;
                } else {
                    const { newState } = applyAction(currentStateToProcess, cId, { type: 'drawCard' });
                    return newState;
                }
            });
        }, delay);

        return () => clearTimeout(timer);
    }, [
        gameState.currentPlayerIndex, 
        gameState.phase, 
        gameState.hasDrawnCard, 
        gameState.drawnCardId, 
        gameState.players.map(p => p.hand.length).join(','),
        gameState.players.map(p => p.calledUno).join(','),
        localPlayerId
    ]);

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
