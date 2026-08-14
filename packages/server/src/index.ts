import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import * as colyseus from 'colyseus';
const { Server } = colyseus;
import { monitor } from '@colyseus/monitor';
import { UnoRoom } from './rooms/UnoRoom.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const port = Number(process.env.PORT || 2567);
const app = express();
app.use(cors());
app.use(express.json());
app.use('/monitor', monitor());

// Serve static React client build
const clientDistPath = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientDistPath));

const gameServer = new Server({
    server: createServer(app),
});

gameServer.define('uno_room', UnoRoom);

// Fallback to client index.html for SPA routes
app.get('*', (req, res, next) => {
    if (req.path.startsWith('/colyseus') || req.path.startsWith('/monitor')) return next();
    res.sendFile(path.join(clientDistPath, 'index.html'), (err) => {
        if (err) next();
    });
});

gameServer.listen(port);
console.log(`Server listening on port ${port}`);
