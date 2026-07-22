import { Link, Route, Routes, useParams, useNavigate } from 'react-router-dom';
import { GameBoard } from './components/GameBoard';
import { useLocalGame } from './hooks/useLocalGame';
import { useColyseusRoom } from './hooks/useColyseusRoom';
import { useState } from 'react';

function Home() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-game-bg text-slate-100 font-body p-6">
            <h1 className="text-6xl font-display font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-yellow-500">
                BLITZ Cards
            </h1>
            <p className="text-xl text-slate-400 mb-12">A Colyseus-powered UNO experience.</p>
            <div className="flex gap-6">
                <Link to="/lobby" className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-bold shadow-lg shadow-blue-500/50 transition-all hover:scale-105">
                    Play Online
                </Link>
                <Link to="/local" className="px-8 py-4 bg-green-600 hover:bg-green-500 text-white rounded-full font-bold shadow-lg shadow-green-500/50 transition-all hover:scale-105">
                    Play vs Bots
                </Link>
            </div>
        </div>
    );
}

function Lobby() {
    const navigate = useNavigate();
    const [name, setName] = useState('Player ' + Math.floor(Math.random() * 1000));
    const [roomCode, setRoomCode] = useState('');

    const handleCreate = () => {
        navigate(`/online?name=${encodeURIComponent(name)}`);
    };

    const handleJoin = () => {
        if (!roomCode) return;
        navigate(`/online?name=${encodeURIComponent(name)}&room=${encodeURIComponent(roomCode.toUpperCase())}`);
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-game-bg text-slate-100 p-8">
            <h1 className="text-5xl font-display font-bold mb-8">Online Multiplayer</h1>
            
            <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl w-full max-w-md border border-slate-700">
                <div className="mb-6">
                    <label className="block text-slate-400 mb-2">Your Name</label>
                    <input 
                        value={name} 
                        onChange={(e) => setName(e.target.value)} 
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500" 
                    />
                </div>

                <button 
                    onClick={handleCreate}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg mb-8 transition-colors"
                >
                    Create New Room
                </button>

                <div className="flex items-center gap-4 mb-8">
                    <div className="h-px bg-slate-700 flex-1"></div>
                    <span className="text-slate-500 font-bold">OR</span>
                    <div className="h-px bg-slate-700 flex-1"></div>
                </div>

                <div className="mb-4">
                    <label className="block text-slate-400 mb-2">Room Code</label>
                    <input 
                        value={roomCode} 
                        onChange={(e) => setRoomCode(e.target.value)} 
                        placeholder="e.g. AB12C"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-green-500 uppercase" 
                    />
                </div>

                <button 
                    onClick={handleJoin}
                    className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-lg transition-colors"
                >
                    Join Room
                </button>
            </div>

            <Link to="/" className="text-slate-500 hover:text-white mt-8 inline-block transition-colors">← Back Home</Link>
        </div>
    );
}

function OnlineGame() {
    const params = new URLSearchParams(window.location.search);
    const name = params.get('name') || 'Player';
    const roomCode = params.get('room') || undefined;

    const { room, gameState, localPlayerId, error, playCard, drawCard, callUno, startGame } = useColyseusRoom(roomCode, name);

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-game-bg text-white flex-col">
                <h2 className="text-2xl text-red-500 mb-4">Connection Error</h2>
                <p>{error}</p>
                <Link to="/lobby" className="mt-4 text-blue-400">Back to Lobby</Link>
            </div>
        );
    }

    if (!gameState) {
        return <div className="min-h-screen flex items-center justify-center bg-game-bg text-white text-2xl animate-pulse">Connecting to server...</div>;
    }

    if (gameState.phase === 'waiting') {
        const isHost = gameState.players[0]?.id === localPlayerId;
        
        return (
            <div className="min-h-screen flex items-center justify-center bg-game-bg text-white flex-col">
                <div className="bg-slate-800 p-12 rounded-3xl text-center max-w-lg w-full shadow-2xl border border-slate-700">
                    <h2 className="text-4xl font-display font-bold mb-2">Waiting for Players</h2>
                    <p className="text-slate-400 mb-8">Room Code: <span className="text-white font-bold text-2xl tracking-widest ml-2">{(room as any)?.state?.roomCode || '...'}</span></p>
                    
                    <div className="mb-8">
                        <h3 className="text-lg text-slate-400 mb-4 text-left border-b border-slate-700 pb-2">Players in Lobby:</h3>
                        <ul className="space-y-3">
                            {gameState.players.map((p: any) => (
                                <li key={p.id} className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center font-bold">{p.name[0]}</div>
                                    <span className={p.id === localPlayerId ? 'font-bold text-blue-400' : ''}>{p.name} {p.id === localPlayerId ? '(You)' : ''}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                    
                    {isHost ? (
                        <button 
                            onClick={startGame}
                            className="w-full bg-green-500 hover:bg-green-400 text-slate-900 font-bold py-4 rounded-xl text-xl transition-all hover:scale-105"
                        >
                            Start Game
                        </button>
                    ) : (
                        <p className="text-slate-400 italic">Waiting for host to start...</p>
                    )}
                </div>
            </div>
        );
    }

    return (
        <GameBoard 
            gameState={gameState} 
            localPlayerId={localPlayerId} 
            onPlayCard={playCard}
            onDrawCard={drawCard}
            onCallUno={callUno}
        />
    );
}

function Local() {
    // Hook automatically manages bot turns
    const { gameState, localPlayerId, playCard, drawCard, callUno } = useLocalGame(['Player 1', 'Bot 1', 'Bot 2', 'Bot 3']);

    return (
        <GameBoard 
            gameState={gameState} 
            localPlayerId={localPlayerId} 
            onPlayCard={playCard}
            onDrawCard={drawCard}
            onCallUno={callUno}
        />
    );
}

export default function App() {
    return (
        <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/lobby" element={<Lobby />} />
            <Route path="/local" element={<Local />} />
            <Route path="/online" element={<OnlineGame />} />
        </Routes>
    );
}
