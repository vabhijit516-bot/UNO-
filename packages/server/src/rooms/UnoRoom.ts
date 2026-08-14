import * as colyseus from 'colyseus';
const { Room } = colyseus;
type Client = colyseus.Client;
type Delayed = colyseus.Delayed;
import { ArraySchema } from '@colyseus/schema';
import { type GameAction, initializeGame, applyAction } from '@uno/shared';
import { UnoGameState, PlayerSchema, CardSchema } from './schema/GameSchema.js';

export class UnoRoom extends Room<UnoGameState> {
  maxClients = 6;
  private turnTimer!: Delayed;

  generateRoomId() {
    // Generate 5-char room code
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 5; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  onCreate(options: Record<string, unknown>) {
    const code = options.roomCode ? String(options.roomCode).toUpperCase() : this.generateRoomId();
    this.roomId = code;
    this.setState(new UnoGameState());
    this.state.roomCode = code;
    this.maxClients = Number(options.maxPlayers || 6);

    this.onMessage('startGame', (client) => {
      const host = this.state.players.get(client.sessionId);
      if (!host) return;
      const playerIds = Array.from(this.state.players.keys());
      if (playerIds.length < 2) return; // Need at least 2 players
      
      const game = initializeGame(playerIds, { maxPlayers: this.maxClients, turnTimerSeconds: 30, scoreTarget: 500 });
      this.applyStateUpdate(game);
      this.resetTurnTimer();
    });

    this.onMessage('playCard', (client, action: GameAction) => {
      this.handlePlayerAction(client.sessionId, action);
    });

    this.onMessage('drawCard', (client) => {
      this.handlePlayerAction(client.sessionId, { type: 'drawCard' });
    });

    this.onMessage('callUno', (client) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
          player.calledUno = true;
      }
    });

    this.onMessage('chooseColor', (client, action: GameAction) => {
      this.handlePlayerAction(client.sessionId, action);
    });

    this.onMessage('passTurn', (client) => {
      this.handlePlayerAction(client.sessionId, { type: 'passTurn' });
    });

    this.onMessage('catchUno', (client, action: GameAction) => {
      this.handlePlayerAction(client.sessionId, action);
    });

    this.onMessage('startNextRound', (client) => {
      this.handlePlayerAction(client.sessionId, { type: 'startNextRound' });
    });
  }

  private handlePlayerAction(playerId: string, action: GameAction) {
      const state = this.toEngineState();
      const result = applyAction(state, playerId, action);
      if (result.error) return; // Silent ignore or could send error back to client
      
      this.applyStateUpdate(result.newState);
      
      if (result.newState.currentPlayerIndex !== state.currentPlayerIndex) {
          this.resetTurnTimer();
      }
  }

  private resetTurnTimer() {
      if (this.turnTimer) {
          this.turnTimer.clear();
      }
      this.state.turnTimeRemaining = 30;

      this.turnTimer = this.clock.setTimeout(() => {
          const currentPlayerId = this.state.currentPlayerId;
          if (currentPlayerId) {
              if (this.state.hasDrawnCard) {
                  this.handlePlayerAction(currentPlayerId, { type: 'passTurn' });
              } else {
                  this.handlePlayerAction(currentPlayerId, { type: 'drawCard' });
                  // If state still hasn't advanced (player couldn't play drawn card), auto-pass turn
                  if (this.state.currentPlayerId === currentPlayerId && this.state.hasDrawnCard) {
                      this.handlePlayerAction(currentPlayerId, { type: 'passTurn' });
                  }
              }
          }
      }, 30000);
  }

  onJoin(client: Client, options: Record<string, unknown>) {
    const player = new PlayerSchema();
    player.id = client.sessionId;
    player.name = String(options.name || `Player ${this.state.players.size + 1}`);
    this.state.players.set(client.sessionId, player);
  }

  async onLeave(client: Client, consented: boolean) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    player.connected = false;

    try {
      if (consented) throw new Error("consented");
      // Allow 60s for reconnection
      await this.allowReconnection(client, 60);
      player.connected = true;
    } catch {
      this.state.players.delete(client.sessionId);
      // We should ideally handle mid-game removal in the engine (skip their turn, AI takes over, etc.)
    }
  }

  onDispose() {
    if (this.turnTimer) {
        this.turnTimer.clear();
    }
  }

  private toCardSchema(card: { id: string; color: string; type: string; value?: number }) {
    const schemaCard = new CardSchema();
    schemaCard.id = card.id;
    schemaCard.color = card.color;
    schemaCard.cardType = card.type;
    schemaCard.value = card.value ?? 0;
    return schemaCard;
  }

  private toEngineState() {
    const players = Array.from(this.state.players.values()).map((player) => ({
      id: player.id,
      name: player.name,
      hand: player.hand.map((card) => ({ id: card.id, color: card.color as any, type: card.cardType as any, value: card.value })),
      score: player.score,
      connected: player.connected,
      calledUno: player.calledUno,
    }));
    
    // Find currentPlayerIndex
    const currentPlayerIndex = Math.max(0, players.findIndex(p => p.id === this.state.currentPlayerId));

    return {
      players,
      currentPlayerIndex,
      direction: this.state.direction as 1 | -1,
      drawPile: this.state.drawPile,
      discardPile: this.state.fullDiscardPile,
      topDiscard: { id: this.state.topDiscard.id, color: this.state.topDiscard.color as any, type: this.state.topDiscard.cardType as any, value: this.state.topDiscard.value },
      activeColor: this.state.activeColor as any,
      phase: this.state.phase as any,
      turnTimerSeconds: this.state.turnTimeRemaining,
      hasDrawnCard: this.state.hasDrawnCard,
      drawnCardId: this.state.drawnCardId,
      roundWinnerId: undefined,
      roundScores: Object.fromEntries(this.state.roundScores.entries()),
      matchWinnerId: undefined,
      matchScores: Object.fromEntries(this.state.matchScores.entries()),
      settings: { maxPlayers: this.maxClients, turnTimerSeconds: 30, scoreTarget: 500, houseRules: { stacking: false, jumpIn: false, drawUntilMatch: false, sevenZeroSwap: false } },
    };
  }

  private applyStateUpdate(state: ReturnType<typeof initializeGame>) {
    this.state.phase = state.phase;
    this.state.currentPlayerId = state.players[state.currentPlayerIndex]?.id || '';
    this.state.activeColor = state.activeColor;
    this.state.topDiscard = this.toCardSchema(state.topDiscard);
    this.state.drawPileCount = state.drawPile.length;
    this.state.direction = state.direction;
    this.state.turnTimeRemaining = state.turnTimerSeconds;
    this.state.hasDrawnCard = state.hasDrawnCard;
    this.state.drawnCardId = state.drawnCardId || '';
    
    // Update scores
    this.state.roundScores.clear();
    for (const [id, score] of Object.entries(state.roundScores)) {
        this.state.roundScores.set(id, score);
    }
    this.state.matchScores.clear();
    for (const [id, score] of Object.entries(state.matchScores)) {
        this.state.matchScores.set(id, score);
    }
    
    // Update internal arrays that are not synced to clients directly
    this.state.drawPile = [...state.drawPile];
    this.state.fullDiscardPile = [...state.discardPile];

    state.players.forEach((player) => {
      const roomPlayer = this.state.players.get(player.id);
      if (!roomPlayer) return;
      roomPlayer.score = player.score;
      roomPlayer.calledUno = player.calledUno;
      roomPlayer.cardCount = player.hand.length;
      
      const newHand = new ArraySchema<CardSchema>();
      player.hand.forEach((card) => {
          newHand.push(this.toCardSchema(card));
      });
      roomPlayer.hand = newHand;
    });
  }
}
