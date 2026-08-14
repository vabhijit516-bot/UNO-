import { useState, useEffect, useCallback } from 'react';
import { colyseus } from '../services/colyseusClient';
import { EngineState, Card } from '@uno/shared';
import type { Room } from 'colyseus.js';

export function useColyseusRoom(roomId?: string, playerName = 'Player') {
    const [room, setRoom] = useState<Room | null>(null);
    const [gameState, setGameState] = useState<EngineState | null>(null);
    const [localPlayerId, setLocalPlayerId] = useState<string>('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let currentRoom: Room;
        let isMounted = true;

        const connect = async () => {
            try {
                if (roomId && roomId.trim() !== '') {
                    const cleanCode = roomId.trim().toUpperCase();
                    try {
                        currentRoom = await colyseus.joinById(cleanCode, { name: playerName, roomCode: cleanCode });
                    } catch (err) {
                        console.warn('joinById failed, trying joinOrCreate:', err);
                        currentRoom = await colyseus.joinOrCreate('uno_room', { name: playerName, roomCode: cleanCode });
                    }
                } else {
                    const generatedCode = Math.random().toString(36).substring(2, 7).toUpperCase();
                    currentRoom = await colyseus.create('uno_room', { name: playerName, roomCode: generatedCode });
                }

                if (!isMounted) {
                    currentRoom.leave();
                    return;
                }

                setRoom(currentRoom);
                setLocalPlayerId(currentRoom.sessionId);
                setError(null);

                currentRoom.onStateChange((state: any) => {
                    if (!isMounted) return;

                    // Safely map Colyseus state to EngineState
                    const players = state.players 
                        ? Array.from(state.players.values()).map((p: any) => ({
                            id: p.id,
                            name: p.name || 'Player',
                            hand: Array.from(p.hand || []).map((c: any) => ({
                                id: c.id,
                                color: c.color,
                                type: c.cardType,
                                value: c.value
                            })),
                            score: p.score || 0,
                            connected: p.connected ?? true,
                            calledUno: p.calledUno ?? false
                        }))
                        : [];

                    const roundScoresObj = state.roundScores && typeof state.roundScores.entries === 'function'
                        ? Object.fromEntries(state.roundScores.entries())
                        : {};

                    const matchScoresObj = state.matchScores && typeof state.matchScores.entries === 'function'
                        ? Object.fromEntries(state.matchScores.entries())
                        : {};

                    const engineState: EngineState = {
                        players,
                        currentPlayerIndex: 0,
                        direction: (state.direction as 1 | -1) || 1,
                        drawPile: Array(state.drawPileCount || 0).fill({ id: 'dummy', color: 'red', type: 'number', value: 0 }),
                        discardPile: [],
                        topDiscard: state.topDiscard ? {
                            id: state.topDiscard.id,
                            color: state.topDiscard.color,
                            type: state.topDiscard.cardType,
                            value: state.topDiscard.value
                        } : { id: 'dummy', color: 'red', type: 'number', value: 0 } as any,
                        activeColor: state.activeColor || 'red',
                        phase: state.phase || 'waiting',
                        turnTimerSeconds: state.turnTimeRemaining || 30,
                        hasDrawnCard: state.hasDrawnCard || false,
                        drawnCardId: state.drawnCardId || undefined,
                        settings: { maxPlayers: 6, turnTimerSeconds: 30, scoreTarget: 500, houseRules: { stacking: false, jumpIn: false, drawUntilMatch: false, sevenZeroSwap: false } },
                        roundScores: roundScoresObj,
                        matchScores: matchScoresObj,
                    };

                    const cpIndex = engineState.players.findIndex(p => p.id === state.currentPlayerId);
                    engineState.currentPlayerIndex = Math.max(0, cpIndex);

                    setGameState(engineState);
                });

                currentRoom.onLeave((code) => {
                    console.log('Left room code:', code);
                    if (isMounted) {
                        setRoom(null);
                    }
                });
            } catch (err: any) {
                console.error('Colyseus connection error:', err);
                if (isMounted) {
                    setError(err.message || 'Failed to connect to room server.');
                }
            }
        };

        connect();

        return () => {
            isMounted = false;
            if (currentRoom) {
                currentRoom.leave();
            }
        };
    }, [roomId, playerName]);

    const playCard = useCallback((cardId: string) => {
        if (room) room.send('playCard', { type: 'playCard', cardId });
    }, [room]);

    const drawCard = useCallback(() => {
        if (room) room.send('drawCard');
    }, [room]);

    const callUno = useCallback(() => {
        if (room) room.send('callUno');
    }, [room]);

    const chooseColor = useCallback((color: string) => {
        if (room) room.send('chooseColor', { type: 'chooseColor', color });
    }, [room]);

    const passTurn = useCallback(() => {
        if (room) room.send('passTurn', { type: 'passTurn' });
    }, [room]);

    const catchUno = useCallback((targetId: string) => {
        if (room) room.send('catchUno', { type: 'catchUno', targetPlayerId: targetId });
    }, [room]);

    const startNextRound = useCallback(() => {
        if (room) room.send('startNextRound', { type: 'startNextRound' });
    }, [room]);

    const startGame = useCallback(() => {
        if (room) room.send('startGame');
    }, [room]);

    return {
        room,
        gameState,
        localPlayerId,
        error,
        playCard,
        drawCard,
        callUno,
        chooseColor,
        passTurn,
        catchUno,
        startNextRound,
        startGame
    };
}
