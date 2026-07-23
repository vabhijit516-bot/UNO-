import { ArraySchema, MapSchema, Schema, type, filter } from '@colyseus/schema';
import { Card } from '@uno/shared';

export class CardSchema extends Schema {
    @type('string') id: string = '';
    @type('string') color: string = 'red';
    @type('string') cardType: string = 'number';
    @type('number') value: number = 0;
}

export class PlayerSchema extends Schema {
    @type('string') id: string = '';
    @type('string') name: string = '';
    @type('boolean') connected: boolean = true;
    @type('number') cardCount: number = 0;
    @type('number') score: number = 0;
    @type('boolean') calledUno: boolean = false;
    
    // @filter: only the owning player sees their hand
    @filter(function(this: PlayerSchema, client: any, value: any, root: any) { 
        return this.id === client.sessionId; 
    })
    @type([CardSchema]) hand = new ArraySchema<CardSchema>();
}

export class UnoGameState extends Schema {
    @type({ map: PlayerSchema }) players = new MapSchema<PlayerSchema>();
    @type('string') currentPlayerId: string = '';
    @type('number') direction: number = 1;
    @type('string') activeColor: string = '';
    @type(CardSchema) topDiscard = new CardSchema();
    @type('number') drawPileCount: number = 0;
    @type('string') phase: string = 'waiting';
    @type('number') turnTimeRemaining: number = 30;
    @type('string') roomCode: string = '';
    @type('boolean') hasDrawnCard: boolean = false;
    @type('string') drawnCardId: string = '';
    
    // Scores
    @type({ map: 'number' }) matchScores = new MapSchema<number>();
    @type({ map: 'number' }) roundScores = new MapSchema<number>();

    // Server-only (NOT synced — no @type decorator)
    drawPile: Card[] = [];
    fullDiscardPile: Card[] = [];
}
