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
        const connect = async () => {
            try {
                if (roomId) {
                    currentRoom = await colyseus.joinById(roomId, { name: playerName });
                } else {
                    currentRoom = await colyseus.create('uno_room', { name: playerName });
                }
                setRoom(currentRoom);
                setLocalPlayerId(currentRoom.sessionId);

                currentRoom.onStateChange((state: any) => {
                    // Map Colyseus state to EngineState so GameBoard can render it
                    const engineState: EngineState = {
                        players: Array.from(state.players.values()).map((p: any) => ({
                            id: p.id,
                            name: p.name,
                            hand: Array.from(p.hand || []).map((c: any) => ({
                                id: c.id,
                                color: c.color,
                                type: c.cardType,
                                value: c.value
                            })),
                            score: p.score,
                            connected: p.connected,
                            calledUno: p.calledUno
                        })),
                        currentPlayerIndex: 0,
                        direction: state.direction as 1 | -1,
                        drawPile: Array(state.drawPileCount).fill({ id: 'dummy', color: 'red', type: 'number', value: 0 }),
                        discardPile: [],
                        topDiscard: state.topDiscard ? {
                            id: state.topDiscard.id,
                            color: state.topDiscard.color,
                            type: state.topDiscard.cardType,
                            value: state.topDiscard.value
                        } : { id: 'dummy', color: 'red', type: 'number', value: 0 } as any,
                        activeColor: state.activeColor as any,
                        phase: state.phase,
                        turnTimerSeconds: state.turnTimeRemaining,
                        settings: { maxPlayers: 6, turnTimerSeconds: 30, scoreTarget: 500, houseRules: { stacking: false, jumpIn: false, drawUntilMatch: false, sevenZeroSwap: false } },
                        roundScores: {}
                    };

                    // Fix currentPlayerIndex
                    const cpIndex = engineState.players.findIndex(p => p.id === state.currentPlayerId);
                    engineState.currentPlayerIndex = Math.max(0, cpIndex);

                    setGameState(engineState);
                });

                currentRoom.onLeave((code) => {
                    console.log('Left room:', code);
                    setRoom(null);
                });
            } catch (err: any) {
                console.error('Colyseus connection error:', err);
                setError(err.message);
            }
        };

        connect();

        return () => {
            if (currentRoom) currentRoom.leave();
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
        startGame
    };
}
