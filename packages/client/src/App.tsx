import { Link, Route, Routes, useParams, useNavigate, useLocation } from 'react-router-dom';
import { GameBoard } from './components/GameBoard';
import { useLocalGame } from './hooks/useLocalGame';
import { useColyseusRoom } from './hooks/useColyseusRoom';
import { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { loginWithGoogle, logout } from './services/firebase';

function Home() {
    const { user, loading } = useAuth();
    const navigate = useNavigate();

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-game-bg text-slate-100 font-body p-6">
            <h1 className="text-6xl font-display font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-yellow-500">
                BLITZ Cards
            </h1>
            <p className="text-xl text-slate-400 mb-12">A Colyseus-powered UNO experience.</p>
            
            {loading ? (
                <div className="animate-pulse text-white">Loading...</div>
            ) : (
                <div className="flex flex-col items-center gap-6">
                    {user ? (
                        <div className="flex flex-col items-center gap-4">
                            <div className="flex items-center gap-3 bg-slate-800 px-6 py-2 rounded-full border border-slate-700">
                                {user.photoURL && <img src={user.photoURL} alt="avatar" className="w-8 h-8 rounded-full" />}
                                <span className="font-bold">{user.displayName}</span>
                                <button onClick={logout} className="ml-4 text-sm text-red-400 hover:text-red-300">Logout</button>
                            </div>
                            <div className="flex gap-6 mt-4">
                                <Link to="/lobby" className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-bold shadow-lg shadow-blue-500/50 transition-all hover:scale-105">
                                    Play Online
                                </Link>
                                <Link to="/local" className="px-8 py-4 bg-green-600 hover:bg-green-500 text-white rounded-full font-bold shadow-lg shadow-green-500/50 transition-all hover:scale-105">
                                    Play vs Bots
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4 w-full max-w-xs">
                            <button 
                                onClick={loginWithGoogle} 
                                className="px-8 py-4 bg-white text-slate-900 rounded-full font-bold shadow-lg flex items-center justify-center gap-3 transition-all hover:scale-105"
                            >
                                <img src="https://www.google.com/favicon.ico" alt="Google" className="w-6 h-6" />
                                Sign in with Google
                            </button>
                            <Link to="/local" className="px-8 py-4 bg-green-600 hover:bg-green-500 text-white rounded-full font-bold shadow-lg shadow-green-500/50 transition-all hover:scale-105 text-center">
                                Play vs Bots (Offline)
                            </Link>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function Lobby() {
    const { user, loading } = useAuth();
    const navigate = useNavigate();
    const [roomCode, setRoomCode] = useState('');

    useEffect(() => {
        // If not logged in and not loading, redirect to home
        if (!loading && !user) {
            navigate('/');
        }
    }, [user, loading, navigate]);

    if (!user) return null;

    const handleCreate = () => {
        const newCode = Math.random().toString(36).substring(2, 7).toUpperCase();
        navigate(`/online?room=${newCode}`);
    };

    const handleJoin = () => {
        if (!roomCode) return;
        navigate(`/online?room=${encodeURIComponent(roomCode.toUpperCase())}`);
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-game-bg text-slate-100 p-8">
            <h1 className="text-5xl font-display font-bold mb-8">Online Multiplayer</h1>
            
            <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl w-full max-w-md border border-slate-700">
                <div className="flex items-center gap-3 mb-8 bg-slate-900 p-4 rounded-xl border border-slate-700">
                    {user.photoURL && <img src={user.photoURL} alt="avatar" className="w-12 h-12 rounded-full" />}
                    <div>
                        <div className="text-xs text-slate-400 uppercase tracking-wider">Playing As</div>
                        <div className="font-bold text-lg">{user.displayName}</div>
                    </div>
                </div>

                <button 
                    onClick={handleCreate}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl mb-8 transition-all hover:scale-[1.02] shadow-lg shadow-blue-500/20"
                >
                    Create New Room
                </button>

                <div className="flex items-center gap-4 mb-8">
                    <div className="h-px bg-slate-700 flex-1"></div>
                    <span className="text-slate-500 font-bold">OR</span>
                    <div className="h-px bg-slate-700 flex-1"></div>
                </div>

                <div className="mb-4">
                    <label className="block text-slate-400 mb-2">Join with Code</label>
                    <input 
                        value={roomCode} 
                        onChange={(e) => setRoomCode(e.target.value)} 
                        placeholder="e.g. AB12C"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-green-500 uppercase text-center tracking-widest text-xl font-bold" 
                    />
                </div>

                <button 
                    onClick={handleJoin}
                    disabled={!roomCode}
                    className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:hover:scale-100 text-white font-bold py-3 rounded-xl transition-all hover:scale-[1.02] shadow-lg shadow-green-500/20"
                >
                    Join Room
                </button>
            </div>

            <Link to="/" className="text-slate-500 hover:text-white mt-8 inline-block transition-colors">← Back Home</Link>
        </div>
    );
}

function OnlineGame() {
    const { user, loading } = useAuth();
    const navigate = useNavigate();
    const params = new URLSearchParams(window.location.search);
    const roomCode = params.get('room') || undefined;

    // Use actual user name if available, fallback otherwise
    const name = user?.displayName || 'Player';
    const { room, gameState, localPlayerId, error, playCard, drawCard, callUno, chooseColor, passTurn, catchUno, startNextRound, startGame } = useColyseusRoom(roomCode, name);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!loading && !user) {
            // Save room code to return later or just redirect
            if (roomCode) {
                // Not saving deeply yet, just redirect to home
                navigate('/');
            } else {
                navigate('/');
            }
        }
    }, [user, loading, navigate, roomCode]);

    if (loading || (!user && !error)) {
        return <div className="min-h-screen flex items-center justify-center bg-game-bg text-white">Loading...</div>;
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-game-bg text-white flex-col">
                <h2 className="text-2xl text-red-500 mb-4">Connection Error</h2>
                <p>{error}</p>
                <Link to="/lobby" className="mt-4 text-blue-400">Back to Lobby</Link>
            </div>
        );
    }

    if (!gameState || !room) {
        return <div className="min-h-screen flex items-center justify-center bg-game-bg text-white text-2xl animate-pulse">Connecting to server...</div>;
    }

    const currentRoomCode = (room.state as any).roomCode;
    const inviteLink = `${window.location.origin}/online?room=${currentRoomCode}`;

    const handleCopyInvite = () => {
        navigator.clipboard.writeText(inviteLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (gameState.phase === 'waiting') {
        const isHost = gameState.players[0]?.id === localPlayerId;
        
        return (
            <div className="min-h-screen flex items-center justify-center bg-game-bg text-white flex-col p-4">
                <div className="bg-slate-800 p-8 md:p-12 rounded-3xl text-center max-w-lg w-full shadow-2xl border border-slate-700">
                    <h2 className="text-4xl font-display font-bold mb-2">Waiting for Players</h2>
                    
                    <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 my-6 flex flex-col items-center">
                        <div className="text-sm text-slate-400 uppercase tracking-widest mb-1">Room Code</div>
                        <div className="text-4xl font-mono font-bold tracking-widest text-green-400">{currentRoomCode || '...'}</div>
                        
                        <button 
                            onClick={handleCopyInvite}
                            className="mt-4 px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-full text-sm font-bold transition-colors flex items-center gap-2"
                        >
                            {copied ? '✅ Copied Link!' : '📋 Copy Invite Link'}
                        </button>
                    </div>
                    
                    <div className="mb-8">
                        <h3 className="text-lg text-slate-400 mb-4 text-left border-b border-slate-700 pb-2">Players in Lobby ({gameState.players.length}/6):</h3>
                        <ul className="space-y-3">
                            {gameState.players.map((p: any) => (
                                <li key={p.id} className="flex items-center gap-3 bg-slate-900/50 p-2 rounded-lg">
                                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center font-bold">
                                        {/* Ideally use p.avatarUrl here if we synced it */}
                                        {p.name[0]}
                                    </div>
                                    <span className={p.id === localPlayerId ? 'font-bold text-blue-400' : ''}>{p.name} {p.id === localPlayerId ? '(You)' : ''}</span>
                                    {gameState.players[0]?.id === p.id && <span className="ml-auto text-xs bg-yellow-600/30 text-yellow-500 px-2 py-1 rounded">HOST</span>}
                                </li>
                            ))}
                        </ul>
                    </div>
                    
                    {isHost ? (
                        <button 
                            onClick={startGame}
                            disabled={gameState.players.length < 2}
                            className="w-full bg-green-500 hover:bg-green-400 disabled:opacity-50 disabled:hover:scale-100 text-slate-900 font-bold py-4 rounded-xl text-xl transition-all hover:scale-[1.02] shadow-lg shadow-green-500/20"
                        >
                            {gameState.players.length < 2 ? 'Need more players...' : 'Start Game'}
                        </button>
                    ) : (
                        <p className="text-slate-400 italic bg-slate-900/50 py-4 rounded-xl">Waiting for host to start...</p>
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
            onChooseColor={chooseColor}
            onPassTurn={passTurn}
            onCatchUno={catchUno}
            onStartNextRound={startNextRound}
        />
    );
}

function Local() {
    // Hook automatically manages bot turns
    const { gameState, localPlayerId, playCard, drawCard, callUno, chooseColor, passTurn, catchUno, startNextRound } = useLocalGame(['Player 1', 'Bot 1', 'Bot 2', 'Bot 3']);

    return (
        <GameBoard 
            gameState={gameState} 
            localPlayerId={localPlayerId} 
            onPlayCard={playCard}
            onDrawCard={drawCard}
            onCallUno={callUno}
            onChooseColor={chooseColor}
            onPassTurn={passTurn}
            onCatchUno={catchUno}
            onStartNextRound={startNextRound}
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
