import { createDeck, dealHands, shuffleDeck } from './deck.js';
import { getCardPoints, isValidPlay } from './rules.js';
import type { Card, CardColor, EngineState, GameAction, GameEvent, PlayerState, RoomSettings } from './types.js';

const defaultSettings: RoomSettings = {
    maxPlayers: 4,
    turnTimerSeconds: 30,
    scoreTarget: 500,
    houseRules: {
        stacking: false,
        jumpIn: false,
        drawUntilMatch: false,
        sevenZeroSwap: false,
    },
};

export function initializeGame(playerIds: string[], settings: Partial<RoomSettings> = {}): EngineState {
    const resolvedSettings: RoomSettings = { ...defaultSettings, ...settings, houseRules: { ...defaultSettings.houseRules, ...settings.houseRules } };
    const deck = shuffleDeck(createDeck());
    const { hands, remaining } = dealHands(deck, playerIds.length);
    const firstCard = remaining.shift()!;
    const discardPile = [firstCard];
    const players: PlayerState[] = playerIds.map((id, index) => ({
        id,
        name: `Player ${index + 1}`,
        hand: hands[index],
        score: 0,
        connected: true,
        calledUno: false,
    }));

    return {
        players,
        currentPlayerIndex: 0,
        direction: 1,
        drawPile: remaining,
        discardPile,
        topDiscard: firstCard,
        activeColor: firstCard.color === 'wild' ? 'red' : firstCard.color,
        phase: 'playing',
        turnTimerSeconds: resolvedSettings.turnTimerSeconds,
        roundScores: {},
        settings: resolvedSettings,
    };
}

export function applyAction(state: EngineState, playerId: string, action: GameAction): { newState: EngineState; events: GameEvent[]; error?: string } {
    const playerIndex = state.players.findIndex((player) => player.id === playerId);
    if (playerIndex === -1) return { newState: state, events: [], error: 'Player not found' };
    if (state.currentPlayerIndex !== playerIndex) return { newState: state, events: [], error: 'Not your turn' };

    const player = state.players[playerIndex];
    const events: GameEvent[] = [];

    // Helper to draw a card, handling reshuffle
    const drawCardFromPile = (currentState: EngineState): { card: Card | undefined, nextState: EngineState, newEvents: GameEvent[] } => {
        let drawPile = [...currentState.drawPile];
        let discardPile = [...currentState.discardPile];
        const localEvents: GameEvent[] = [];

        if (drawPile.length === 0) {
            if (discardPile.length <= 1) {
                return { card: undefined, nextState: currentState, newEvents: [] }; // Cannot draw
            }
            // Reshuffle
            const top = discardPile.pop()!;
            drawPile = shuffleDeck(discardPile);
            discardPile = [top];
            localEvents.push({ type: 'reshuffled' });
        }
        
        const card = drawPile.shift();
        return { 
            card, 
            nextState: { ...currentState, drawPile, discardPile }, 
            newEvents: localEvents 
        };
    };

    if (action.type === 'drawCard') {
        const { card, nextState: s1, newEvents } = drawCardFromPile(state);
        events.push(...newEvents);
        
        if (!card) {
            return { newState: state, events: [{ type: 'drawPileEmpty' }], error: 'Draw pile empty' };
        }
        
        const updatedPlayers = [...s1.players];
        updatedPlayers[playerIndex] = { ...player, hand: [...player.hand, card] };
        
        const nextIndex = (s1.currentPlayerIndex + s1.direction + s1.players.length) % s1.players.length;
        events.push({ type: 'cardDrawn', payload: { playerId, cardId: card.id } });
        
        return { 
            newState: { ...s1, currentPlayerIndex: nextIndex, players: updatedPlayers }, 
            events 
        };
    }

    if (action.type === 'playCard') {
        const card = player.hand.find((item) => item.id === action.cardId);
        if (!card) return { newState: state, events: [], error: 'Card not found' };
        if (!isValidPlay(card, state.topDiscard, state.activeColor)) return { newState: state, events: [], error: 'Invalid play' };

        const updatedPlayers = [...state.players];
        updatedPlayers[playerIndex] = { ...player, hand: player.hand.filter((item) => item.id !== action.cardId) };
        
        let nextState: EngineState = {
            ...state,
            players: updatedPlayers,
            discardPile: [...state.discardPile, card],
            topDiscard: card,
            activeColor: card.color === 'wild' ? state.activeColor : card.color, // Temporarily keep old color if wild
        };

        const newColor = nextState.activeColor;
        events.push({ type: 'cardPlayed', payload: { playerId, cardId: card.id, color: newColor } });

        // Handle Card Effects
        let skipNext = false;
        let cardsToDraw = 0;

        if (card.type === 'reverse') {
            nextState.direction = (nextState.direction * -1) as 1 | -1;
            // In 2 player games, reverse acts as a skip
            if (nextState.players.length === 2) skipNext = true;
        } else if (card.type === 'skip') {
            skipNext = true;
        } else if (card.type === 'drawTwo') {
            cardsToDraw = 2;
            skipNext = true;
        } else if (card.type === 'wildDrawFour') {
            cardsToDraw = 4;
            skipNext = true;
        }

        // Calculate next turn index
        let nextIndex = (nextState.currentPlayerIndex + nextState.direction + nextState.players.length) % nextState.players.length;

        // Apply draws to the next player
        if (cardsToDraw > 0) {
            let currentTempState = nextState;
            const targetPlayerIndex = nextIndex;
            const targetPlayer = currentTempState.players[targetPlayerIndex];
            const newHand = [...targetPlayer.hand];
            
            for (let i = 0; i < cardsToDraw; i++) {
                const { card: drawnCard, nextState: s1, newEvents } = drawCardFromPile(currentTempState);
                events.push(...newEvents);
                if (drawnCard) {
                    newHand.push(drawnCard);
                    currentTempState = s1;
                }
            }
            
            const newPlayers = [...currentTempState.players];
            newPlayers[targetPlayerIndex] = { ...targetPlayer, hand: newHand };
            nextState = { ...currentTempState, players: newPlayers };
        }

        // Apply skip
        if (skipNext) {
            nextIndex = (nextIndex + nextState.direction + nextState.players.length) % nextState.players.length;
        }

        nextState.currentPlayerIndex = nextIndex;

        if (card.type === 'wild' || card.type === 'wildDrawFour') {
            nextState.phase = 'choosingColor';
            events.push({ type: 'chooseColorRequired', payload: { playerId } });
            // Temporarily set current player back so they can choose color
            nextState.currentPlayerIndex = playerIndex; 
        }

        if (updatedPlayers[playerIndex].hand.length === 0) {
            const roundWinnerId = player.id;
            const roundScores = Object.fromEntries(nextState.players.map((entry) => [
                entry.id, 
                entry.hand.reduce((sum, c) => sum + getCardPoints(c), 0)
            ]));
            nextState.roundWinnerId = roundWinnerId;
            nextState.phase = 'roundEnd';
            nextState.roundScores = roundScores;
        }

        return { newState: nextState, events };
    }

    if (action.type === 'chooseColor') {
        if (state.phase !== 'choosingColor') return { newState: state, events: [], error: 'No color selection required' };
        
        // After choosing color, we need to advance the turn properly. 
        // If it was a wild draw 4, the skip already happened when calculating nextIndex in playCard. 
        // Actually, we stored the nextIndex logic in `playCard`, but we overwrote `currentPlayerIndex` to allow color picking.
        // This is a bit tricky. Let's just advance the turn normally.
        
        // To properly fix this, we should have saved the intended nextIndex. 
        // For simplicity, let's just advance the turn based on direction, and account for if the top card was wildDrawFour.
        let nextIndex = (state.currentPlayerIndex + state.direction + state.players.length) % state.players.length;
        if (state.topDiscard.type === 'wildDrawFour') {
            // It skips the next player
            nextIndex = (nextIndex + state.direction + state.players.length) % state.players.length;
        }

        return {
            newState: { ...state, activeColor: action.color, phase: 'playing', currentPlayerIndex: nextIndex },
            events: [{ type: 'colorChosen', payload: { color: action.color } }],
        };
    }

    return { newState: state, events: [], error: 'Unsupported action' };
}

export function getValidActionsForPlayer(state: EngineState, playerId: string): GameAction[] {
    const playerIndex = state.players.findIndex((player) => player.id === playerId);
    if (playerIndex === -1 || state.currentPlayerIndex !== playerIndex) return [];
    const player = state.players[playerIndex];
    const validMoves = player.hand.filter((card) => isValidPlay(card, state.topDiscard, state.activeColor));
    return validMoves.map((card) => ({ type: 'playCard', cardId: card.id }));
}
