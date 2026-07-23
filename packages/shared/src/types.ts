export type CardColor = 'red' | 'yellow' | 'green' | 'blue' | 'wild';
export type CardType = 'number' | 'skip' | 'reverse' | 'drawTwo' | 'wild' | 'wildDrawFour';

export interface Card {
    id: string;
    color: CardColor;
    type: CardType;
    value?: number;
}

export type GamePhase = 'waiting' | 'playing' | 'choosingColor' | 'roundEnd' | 'matchEnd';

export interface PlayCardAction {
    type: 'playCard';
    cardId: string;
}

export interface DrawCardAction {
    type: 'drawCard';
}

export interface CallUnoAction {
    type: 'callUno';
}

export interface PassTurnAction {
    type: 'passTurn';
}

export interface CatchUnoAction {
    type: 'catchUno';
    targetPlayerId: string;
}

export interface StartNextRoundAction {
    type: 'startNextRound';
}

export interface ChooseColorAction {
    type: 'chooseColor';
    color: Exclude<CardColor, 'wild'>;
}

export type GameAction =
    | PlayCardAction
    | DrawCardAction
    | CallUnoAction
    | CatchUnoAction
    | ChooseColorAction
    | PassTurnAction
    | StartNextRoundAction;

export interface GameEvent {
    type: string;
    payload?: Record<string, unknown>;
}

export interface RoomSettings {
    maxPlayers: number;
    turnTimerSeconds: number;
    scoreTarget: number;
    houseRules: HouseRules;
}

export interface HouseRules {
    stacking: boolean;
    jumpIn: boolean;
    drawUntilMatch: boolean;
    sevenZeroSwap: boolean;
}

export interface PlayerState {
    id: string;
    name: string;
    hand: Card[];
    score: number;
    connected: boolean;
    calledUno: boolean;
}

export interface EngineState {
    players: PlayerState[];
    currentPlayerIndex: number;
    direction: 1 | -1;
    drawPile: Card[];
    discardPile: Card[];
    topDiscard: Card;
    activeColor: CardColor;
    phase: GamePhase;
    turnTimerSeconds: number;
    hasDrawnCard: boolean;
    drawnCardId?: string;
    roundWinnerId?: string;
    roundScores: Record<string, number>;
    matchScores: Record<string, number>;
    matchWinnerId?: string;
    settings: RoomSettings;
}
