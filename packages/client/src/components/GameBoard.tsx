import { EngineState, Card } from '@uno/shared';
import { getCardImageUrl } from '../utils/cardImages';
import { motion, AnimatePresence } from 'framer-motion';

interface GameBoardProps {
    gameState: EngineState;
    localPlayerId: string;
    onPlayCard: (cardId: string) => void;
    onDrawCard: () => void;
    onCallUno: () => void;
    onChooseColor?: (color: string) => void;
    onPassTurn?: () => void;
    onCatchUno?: (targetId: string) => void;
    onStartNextRound?: () => void;
}

export function GameBoard({ gameState, localPlayerId, onPlayCard, onDrawCard, onCallUno, onChooseColor, onPassTurn, onCatchUno, onStartNextRound }: GameBoardProps) {
    const localPlayer = gameState.players.find(p => p.id === localPlayerId);
    const opponents = gameState.players.filter(p => p.id !== localPlayerId);

    const isMyTurn = gameState.players[gameState.currentPlayerIndex]?.id === localPlayerId;

    return (
        <div className="min-h-screen relative overflow-hidden bg-game-bg">
            {/* Turn Indicator */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-900/80 px-8 py-3 rounded-full border border-slate-700 backdrop-blur-md z-50 shadow-2xl flex items-center gap-4">
                <span className="text-2xl font-bold font-display tracking-wider">
                    {isMyTurn ? (
                        <span className="text-green-400 animate-pulse drop-shadow-[0_0_8px_rgba(74,222,128,0.8)]">Your Turn</span>
                    ) : (
                        <span className="text-yellow-400">{gameState.players[gameState.currentPlayerIndex]?.name}'s Turn</span>
                    )}
                </span>
                <span className="text-sm bg-slate-800 px-3 py-1 rounded-full text-slate-300 font-bold border border-slate-600">
                    {gameState.direction === 1 ? '▶' : '◀'}
                </span>
            </div>

            {/* Opponents */}
            <div className="absolute top-16 left-0 right-0 flex justify-center gap-12">
                {opponents.map(opp => {
                    const isOppTurn = gameState.players[gameState.currentPlayerIndex]?.id === opp.id;
                    const isVulnerable = opp.hand.length === 1 && !opp.calledUno;

                    return (
                        <div key={opp.id} className="flex flex-col items-center relative">
                            {isVulnerable && (
                                <motion.button
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    whileHover={{ scale: 1.1 }}
                                    onClick={() => onCatchUno?.(opp.id)}
                                    className="absolute -top-10 bg-red-500 text-white font-bold px-3 py-1 rounded-full text-sm shadow-[0_0_15px_rgba(239,68,68,0.8)] z-20 animate-pulse border-2 border-white"
                                >
                                    CATCH UNO!
                                </motion.button>
                            )}
                            <motion.div 
                                animate={{ scale: isOppTurn ? 1.1 : 1, y: isOppTurn ? 10 : 0 }}
                                className={`px-4 py-1 rounded-full mb-2 z-10 font-bold ${isOppTurn ? 'bg-yellow-500 text-slate-900 shadow-[0_0_15px_rgba(234,179,8,0.5)]' : 'bg-slate-800 text-slate-300'}`}
                            >
                                {opp.name} ({opp.hand.length})
                            </motion.div>
                            <div className="flex">
                                {Array.from({ length: Math.min(opp.hand.length, 7) }).map((_, i) => (
                                    <motion.img 
                                        key={i} 
                                        src="/img/cards/back.png" 
                                        alt="Card back" 
                                        className="h-24 w-16 -ml-8 first:ml-0 shadow-lg rounded-md" 
                                        initial={{ y: -20, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{ delay: i * 0.05 }}
                                    />
                                ))}
                                {opp.hand.length > 7 && <div className="text-xs ml-2 mt-auto bg-slate-800 px-2 rounded-full">+{opp.hand.length - 7}</div>}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Center Piles */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-8 items-center">
                {gameState.hasDrawnCard && isMyTurn ? (
                    <motion.div 
                        whileHover={{ scale: 1.05, y: -5, filter: "brightness(1.1)" }}
                        whileTap={{ scale: 0.95 }}
                        className="relative cursor-pointer group flex items-center justify-center h-40 w-28 bg-slate-800 rounded-lg border-2 border-slate-600 shadow-xl"
                        onClick={onPassTurn}
                    >
                        <span className="font-bold text-slate-300 tracking-widest text-xl group-hover:text-white transition-colors">PASS</span>
                    </motion.div>
                ) : (
                    <motion.div 
                        whileHover={{ scale: 1.05, y: -5, filter: "brightness(1.1)" }}
                        whileTap={{ scale: 0.95 }}
                        className="relative cursor-pointer group"
                        onClick={onDrawCard}
                    >
                        <img src="/img/cards/back.png" className="h-40 w-28 shadow-[0_15px_35px_rgba(0,0,0,0.6)] rounded-lg border-2 border-slate-700 transition-all group-hover:border-blue-400" alt="draw pile" />
                        <div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/20 transition-colors rounded-lg flex items-center justify-center">
                            <span className="opacity-0 group-hover:opacity-100 font-bold bg-black/80 px-4 py-2 text-blue-200 rounded-full transition-opacity shadow-[0_0_15px_rgba(59,130,246,0.5)] tracking-widest">DRAW</span>
                        </div>
                    </motion.div>
                )}

                {gameState.topDiscard && (
                    <motion.div
                        key={gameState.topDiscard.id} // Re-animate when card changes
                        initial={{ scale: 0.5, rotate: -20, opacity: 0 }}
                        animate={{ scale: 1, rotate: Math.random() * 10 - 5, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 260, damping: 20 }}
                        className="relative"
                    >
                        <img 
                            src={getCardImageUrl(gameState.topDiscard)} 
                            className="h-40 w-28 shadow-[0_10px_25px_rgba(0,0,0,0.5)] rounded-lg" 
                            alt="discard pile" 
                        />
                        {/* Active Color indicator for Wild cards */}
                        {(gameState.topDiscard.type === 'wild' || gameState.topDiscard.type === 'wildDrawFour') && (
                            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full font-bold text-sm shadow-lg text-slate-900 border-2 border-slate-900" 
                                style={{ 
                                    backgroundColor: gameState.activeColor === 'red' ? '#E74C3C' : 
                                                    gameState.activeColor === 'blue' ? '#2980B9' : 
                                                    gameState.activeColor === 'green' ? '#27AE60' : 
                                                    gameState.activeColor === 'yellow' ? '#F1C40F' : 'white'
                                }}>
                                {gameState.activeColor.toUpperCase()}
                            </div>
                        )}
                    </motion.div>
                )}
            </div>

            {/* Corner Buttons */}
            <div className="fixed bottom-8 left-8 z-40">
                <motion.button 
                    whileHover={{ scale: 1.1, rotate: -5 }}
                    whileTap={{ scale: 0.9 }}
                    className="w-20 h-20 rounded-full shadow-[0_10px_25px_rgba(0,0,0,0.5)] cursor-pointer border-4 border-slate-700 bg-slate-800 flex items-center justify-center overflow-hidden relative group"
                    onClick={onDrawCard} 
                >
                    <div className="absolute inset-0 bg-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <img src="/img/background/draw_button.jpeg" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt="draw button" />
                </motion.button>
            </div>

            <div className="fixed bottom-8 right-8">
                <motion.img 
                    whileHover={{ scale: 1.1, opacity: 0.9 }}
                    whileTap={{ scale: 0.9 }}
                    src="/img/background/uno_button.png" 
                    className="w-20 h-20 rounded-full shadow-lg cursor-pointer animate-pulse-glow" 
                    onClick={onCallUno} 
                    alt="uno button" 
                />
            </div>

            {/* Local Player Hand */}
            {localPlayer && (
                <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-end justify-center perspective-1000">
                    <AnimatePresence>
                        {localPlayer.hand.map((card: Card, index: number) => {
                            // Calculate rotation for fan effect
                            const total = localPlayer.hand.length;
                            const middle = (total - 1) / 2;
                            const rotation = (index - middle) * 4;
                            const yOffset = Math.abs(index - middle) * 3;

                            // Determine if card is playable
                            let isPlayable = true;
                            if (gameState.hasDrawnCard) {
                                isPlayable = card.id === gameState.drawnCardId;
                            }
                            
                            return (
                                <motion.div
                                    key={card.id}
                                    layout
                                    initial={{ y: 100, opacity: 0 }}
                                    animate={{ 
                                        y: yOffset, 
                                        rotate: rotation, 
                                        opacity: isPlayable ? 1 : 0.5,
                                        zIndex: index 
                                    }}
                                    exit={{ y: -200, scale: 0.5, opacity: 0 }}
                                    whileHover={{ 
                                        y: isPlayable ? -40 : yOffset, 
                                        scale: isPlayable ? 1.15 : 1, 
                                        rotate: isPlayable ? 0 : rotation, 
                                        zIndex: 100 
                                    }}
                                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                    className={`${isPlayable ? 'cursor-pointer' : 'cursor-not-allowed'} -ml-8 first:ml-0 transform-origin-bottom`}
                                    onClick={() => isMyTurn && isPlayable && onPlayCard(card.id)}
                                >
                                    <img 
                                        src={getCardImageUrl(card)}
                                        className="h-40 w-28 rounded-lg shadow-[0_15px_30px_rgba(0,0,0,0.6)]"
                                        alt={`${card.color} ${card.type}`}
                                    />
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            )}

            {/* Color Picker Modal */}
            <AnimatePresence>
                {gameState.phase === 'choosingColor' && isMyTurn && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center"
                    >
                        <motion.div 
                            initial={{ scale: 0.8, y: 50 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.8, y: 50 }}
                            className="bg-slate-800 p-8 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-slate-600 max-w-md w-full text-center"
                        >
                            <h2 className="text-4xl font-display font-bold text-white mb-8 tracking-widest drop-shadow-lg">CHOOSE COLOR</h2>
                            <div className="grid grid-cols-2 gap-6">
                                {[
                                    { color: 'red', hex: '#E74C3C', glow: 'rgba(231,76,60,0.6)' },
                                    { color: 'blue', hex: '#2980B9', glow: 'rgba(41,128,185,0.6)' },
                                    { color: 'green', hex: '#27AE60', glow: 'rgba(39,174,96,0.6)' },
                                    { color: 'yellow', hex: '#F1C40F', glow: 'rgba(241,196,15,0.6)' }
                                ].map((c) => (
                                    <motion.button
                                        key={c.color}
                                        whileHover={{ scale: 1.05, filter: 'brightness(1.2)' }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => onChooseColor?.(c.color)}
                                        className="h-32 rounded-2xl border-4 border-white/20 transition-all shadow-xl font-bold text-2xl uppercase tracking-widest text-white/90 drop-shadow-md"
                                        style={{ 
                                            backgroundColor: c.hex,
                                            boxShadow: `0 10px 25px ${c.glow}`
                                        }}
                                    >
                                        {c.color}
                                    </motion.button>
                                ))}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Round/Match End Modal */}
            <AnimatePresence>
                {(gameState.phase === 'roundEnd' || gameState.phase === 'matchEnd') && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4"
                    >
                        <motion.div 
                            initial={{ scale: 0.8, y: 50 }}
                            animate={{ scale: 1, y: 0 }}
                            className="bg-slate-900 border-2 border-slate-700 p-8 rounded-3xl shadow-2xl max-w-lg w-full text-center"
                        >
                            <h2 className="text-5xl font-display font-bold text-white mb-2 drop-shadow-lg">
                                {gameState.phase === 'matchEnd' ? 'MATCH OVER!' : 'ROUND OVER!'}
                            </h2>
                            <p className="text-xl text-yellow-400 font-bold mb-8">
                                Winner: {gameState.players.find(p => p.id === (gameState.phase === 'matchEnd' ? gameState.matchWinnerId : gameState.roundWinnerId))?.name}
                            </p>
                            
                            <div className="bg-slate-800 rounded-xl p-4 mb-8">
                                <h3 className="text-slate-400 font-bold mb-4 uppercase tracking-widest text-sm border-b border-slate-700 pb-2">Scoreboard (First to 500)</h3>
                                <div className="space-y-3">
                                    {gameState.players.map(p => (
                                        <div key={p.id} className="flex justify-between items-center text-lg">
                                            <span className={p.id === localPlayerId ? 'text-blue-400 font-bold' : 'text-slate-300'}>{p.name}</span>
                                            <span className="font-mono font-bold text-white">{gameState.matchScores[p.id] || 0} pts</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {gameState.phase === 'roundEnd' && (
                                <button 
                                    onClick={onStartNextRound}
                                    className="w-full py-4 bg-green-500 hover:bg-green-400 text-slate-900 font-bold rounded-xl text-xl transition-all shadow-[0_0_20px_rgba(34,197,94,0.4)] hover:scale-105"
                                >
                                    Start Next Round
                                </button>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
