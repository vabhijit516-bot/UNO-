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

    const chooseColor = useCallback((color: Exclude<CardColor, 'wild'>) => {
        setGameState(curr => {
            const { newState, error } = applyAction(curr, localPlayerId, { type: 'chooseColor', color });
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

                if (curr.phase === 'choosingColor') {
                    // Bot picks random color
                    const colors: Exclude<CardColor, 'wild'>[] = ['red', 'yellow', 'green', 'blue'];
                    const randomColor = colors[Math.floor(Math.random() * colors.length)];
                    const { newState } = applyAction(curr, cId, { type: 'chooseColor', color: randomColor });
                    return newState;
                }

                const validActions = getValidActionsForPlayer(curr, cId);
                if (validActions.length > 0) {
                    const action = validActions[Math.floor(Math.random() * validActions.length)];
                    const { newState } = applyAction(curr, cId, action);
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
        chooseColor
    };
}
