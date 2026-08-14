import { Client, Room } from 'colyseus.js';

const getWsUrl = () => {
    if (typeof window === 'undefined') return 'ws://localhost:2567';
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'ws://localhost:2567';
    }
    return `${protocol}//${window.location.host}`;
};

export const colyseus = new Client(getWsUrl());

export type GameRoom = Room<any>;
