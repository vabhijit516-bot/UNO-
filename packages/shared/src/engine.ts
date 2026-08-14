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
        hasDrawnCard: false,
        roundScores: {},
        matchScores: Object.fromEntries(playerIds.map(id => [id, 0])),
        settings: resolvedSettings,
    };
}

export function applyAction(state: EngineState, playerId: string, action: GameAction): { newState: EngineState; events: GameEvent[]; error?: string } {
    // catchUno can be called at any time, by anyone, on anyone else
    if (action.type === 'catchUno') {
        const targetIndex = state.players.findIndex(p => p.id === action.targetPlayerId);
        if (targetIndex === -1) return { newState: state, events: [], error: 'Target not found' };
        if (action.targetPlayerId === playerId) return { newState: state, events: [], error: 'Cannot catch yourself' };
        
        const target = state.players[targetIndex];
        if (target.hand.length === 1 && !target.calledUno) {
            // Caught! Draw 2 cards.
            let tempState = state;
            const events: GameEvent[] = [{ type: 'unoCaught', payload: { catcher: playerId, caught: target.id } }];
            const newHand = [...target.hand];

            for (let i = 0; i < 2; i++) {
                const { card, nextState: s1, newEvents } = drawCardFromPileHelper(tempState);
                events.push(...newEvents);
                if (card) {
                    newHand.push(card);
                    tempState = s1;
                }
            }

            const updatedPlayers = [...tempState.players];
            updatedPlayers[targetIndex] = { ...target, hand: newHand };
            return { newState: { ...tempState, players: updatedPlayers }, events };
        } else {
            return { newState: state, events: [], error: 'Target is not vulnerable' };
        }
    }

    if (action.type === 'startNextRound') {
        if (state.phase !== 'roundEnd') return { newState: state, events: [], error: 'Round not over' };
        
        const deck = shuffleDeck(createDeck());
        const playerIds = state.players.map(p => p.id);
        const { hands, remaining } = dealHands(deck, playerIds.length);
        const firstCard = remaining.shift()!;
        const discardPile = [firstCard];
        const nextStarter = (state.currentPlayerIndex + 1) % state.players.length;

        const players: PlayerState[] = state.players.map((p, index) => ({
            ...p,
            hand: hands[index],
            calledUno: false
        }));

        return {
            newState: {
                ...state,
                players,
                currentPlayerIndex: nextStarter,
                direction: 1,
                drawPile: remaining,
                discardPile,
                topDiscard: firstCard,
                activeColor: firstCard.color === 'wild' ? 'red' : firstCard.color,
                phase: 'playing',
                hasDrawnCard: false,
                drawnCardId: undefined,
                roundWinnerId: undefined,
                roundScores: {}
            },
            events: [{ type: 'roundStarted' }]
        };
    }

    const playerIndex = state.players.findIndex((player) => player.id === playerId);
    if (playerIndex === -1) return { newState: state, events: [], error: 'Player not found' };
    
    // callUno can be done slightly out of turn if it's their turn next, but let's restrict to their own turn or right after they play
    if (action.type === 'callUno') {
        const updatedPlayers = [...state.players];
        updatedPlayers[playerIndex] = { ...updatedPlayers[playerIndex], calledUno: true };
        return { newState: { ...state, players: updatedPlayers }, events: [{ type: 'unoCalled', payload: { playerId } }] };
    }

    if (state.currentPlayerIndex !== playerIndex) return { newState: state, events: [], error: 'Not your turn' };

    const player = state.players[playerIndex];
    const events: GameEvent[] = [];

    // Helper to draw a card, handling reshuffle (extracted out so catchUno can use it if needed)
    // Actually, since we use it above, let's hoist it or use a separate function.
    // We already moved it, let's just keep a local alias if needed.
    const drawCardFromPile = (currentState: EngineState) => drawCardFromPileHelper(currentState);

    if (action.type === 'drawCard') {
        if (state.hasDrawnCard) return { newState: state, events: [], error: 'Already drawn this turn' };

        const { card, nextState: s1, newEvents } = drawCardFromPile(state);
        events.push(...newEvents);
        
        if (!card) {
            return { newState: state, events: [{ type: 'drawPileEmpty' }], error: 'Draw pile empty' };
        }
        
        const updatedPlayers = [...s1.players];
        updatedPlayers[playerIndex] = { ...player, hand: [...player.hand, card], calledUno: false }; // reset UNO call if they draw
        
        events.push({ type: 'cardDrawn', payload: { playerId, cardId: card.id } });
        
        return { 
            newState: { 
                ...s1, 
                players: updatedPlayers,
                hasDrawnCard: true,
                drawnCardId: card.id
            }, 
            events 
        };
    }

    if (action.type === 'passTurn') {
        if (!state.hasDrawnCard) return { newState: state, events: [], error: 'Must draw before passing' };
        
        const nextIndex = (state.currentPlayerIndex + state.direction + state.players.length) % state.players.length;
        return {
            newState: {
                ...state,
                currentPlayerIndex: nextIndex,
                hasDrawnCard: false,
                drawnCardId: undefined
            },
            events: [{ type: 'turnPassed', payload: { playerId } }]
        };
    }

    if (action.type === 'playCard') {
        if (state.hasDrawnCard && action.cardId !== state.drawnCardId) {
            return { newState: state, events: [], error: 'Can only play the drawn card' };
        }
        const card = player.hand.find((item) => item.id === action.cardId);
        if (!card) return { newState: state, events: [], error: 'Card not found' };
        if (!isValidPlay(card, state.topDiscard, state.activeColor)) return { newState: state, events: [], error: 'Invalid play' };

        const updatedPlayers = [...state.players];
        const newHand = player.hand.filter((item) => item.id !== action.cardId);
        const calledUno = newHand.length === 1 ? player.calledUno : false;
        updatedPlayers[playerIndex] = { ...player, hand: newHand, calledUno };
        
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
        nextState.hasDrawnCard = false;
        nextState.drawnCardId = undefined;

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
            
            const pointsGained = Object.values(roundScores).reduce((a,b) => a + b, 0);
            const matchScores = { ...nextState.matchScores };
            matchScores[roundWinnerId] = (matchScores[roundWinnerId] || 0) + pointsGained;

            nextState.roundWinnerId = roundWinnerId;
            nextState.roundScores = roundScores;
            nextState.matchScores = matchScores;
            
            if (matchScores[roundWinnerId] >= nextState.settings.scoreTarget) {
                nextState.phase = 'matchEnd';
                nextState.matchWinnerId = roundWinnerId;
            } else {
                nextState.phase = 'roundEnd';
            }
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
            newState: { 
                ...state, 
                activeColor: action.color, 
                phase: 'playing', 
                currentPlayerIndex: nextIndex,
                hasDrawnCard: false,
                drawnCardId: undefined
            },
            events: [{ type: 'colorChosen', payload: { color: action.color } }],
        };
    }

    return { newState: state, events: [], error: 'Unsupported action' };
}

// Hoisted Helper
function drawCardFromPileHelper(currentState: EngineState): { card: Card | undefined, nextState: EngineState, newEvents: GameEvent[] } {
    let drawPile = [...currentState.drawPile];
    let discardPile = [...currentState.discardPile];
    const localEvents: GameEvent[] = [];

    if (drawPile.length === 0) {
        if (discardPile.length <= 1) {
            return { card: undefined, nextState: currentState, newEvents: [] };
        }
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
}

export function getValidActionsForPlayer(state: EngineState, playerId: string): GameAction[] {
    const playerIndex = state.players.findIndex((player) => player.id === playerId);
    if (playerIndex === -1 || state.currentPlayerIndex !== playerIndex) return [];
    
    if (state.hasDrawnCard) {
        // Can only play the drawn card, or pass
        const drawnCard = state.players[playerIndex].hand.find(c => c.id === state.drawnCardId);
        const actions: GameAction[] = [{ type: 'passTurn' }];
        if (drawnCard && isValidPlay(drawnCard, state.topDiscard, state.activeColor)) {
            actions.push({ type: 'playCard', cardId: drawnCard.id });
        }
        return actions;
    }

    const player = state.players[playerIndex];
    const validMoves = player.hand.filter((card) => isValidPlay(card, state.topDiscard, state.activeColor));
    const actions: GameAction[] = validMoves.map((card) => ({ type: 'playCard', cardId: card.id }));
    actions.push({ type: 'drawCard' });
    return actions;
}
