import { Client, Room } from 'colyseus.js';

const WS_URL = window.location.hostname === 'localhost' ? 'ws://localhost:2567' : `wss://${window.location.hostname}`;
export const colyseus = new Client(WS_URL);

export type GameRoom = Room<any>;
