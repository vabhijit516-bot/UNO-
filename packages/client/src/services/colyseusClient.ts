import { Client, Room } from 'colyseus.js';

const RENDER_BACKEND_HOST = 'uno-7kc4.onrender.com';

const getWsUrl = () => {
    if (typeof window === 'undefined') return 'ws://localhost:2567';

    // 1. Check for explicit environment variable
    const envUrl = (import.meta as any).env?.VITE_WS_URL;
    if (envUrl) {
        return envUrl;
    }

    const isHttps = window.location.protocol === 'https:';
    const wsProtocol = isHttps ? 'wss:' : 'ws:';
    const hostname = window.location.hostname;

    // 2. Local development fallback
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'ws://localhost:2567';
    }

    // 3. If hosted directly on Render single-port server, use current origin
    if (hostname.includes('onrender.com')) {
        return `${wsProtocol}//${window.location.host}`;
    }

    // 4. If hosted on Vercel, Netlify, or custom domain, route WebSockets to deployed Render backend
    return `wss://${RENDER_BACKEND_HOST}`;
};

export const colyseus = new Client(getWsUrl());

export type GameRoom = Room<any>;
