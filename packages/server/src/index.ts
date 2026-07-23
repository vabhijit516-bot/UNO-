import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import * as colyseus from 'colyseus';
const { Server } = colyseus;
import { monitor } from '@colyseus/monitor';
import { UnoRoom } from './rooms/UnoRoom.js';

const port = Number(process.env.PORT || 2567);
const app = express();
app.use(cors());
app.use(express.json());
app.use('/monitor', monitor());

const gameServer = new Server({
    server: createServer(app),
});

gameServer.define('uno_room', UnoRoom);

gameServer.listen(port);
console.log(`Listening on ws://localhost:${port}`);
