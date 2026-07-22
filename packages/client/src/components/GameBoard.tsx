import { EngineState, Card } from '@uno/shared';
import { getCardImageUrl } from '../utils/cardImages';
import { motion, AnimatePresence } from 'framer-motion';

interface GameBoardProps {
    gameState: EngineState;
    localPlayerId: string;
    onPlayCard: (cardId: string) => void;
    onDrawCard: () => void;
    onCallUno: () => void;
}

export function GameBoard({ gameState, localPlayerId, onPlayCard, onDrawCard, onCallUno }: GameBoardProps) {
    const localPlayer = gameState.players.find(p => p.id === localPlayerId);
    const opponents = gameState.players.filter(p => p.id !== localPlayerId);

    const isMyTurn = gameState.players[gameState.currentPlayerIndex]?.id === localPlayerId;

    return (
        <div className="min-h-screen relative overflow-hidden bg-game-bg">
            {/* Turn Indicator */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-900/80 px-6 py-2 rounded-full border border-slate-700 backdrop-blur-sm z-50">
                <span className="text-xl font-bold font-display">
                    {isMyTurn ? <span className="text-green-400">Your Turn</span> : <span className="text-yellow-400">{gameState.players[gameState.currentPlayerIndex]?.name}'s Turn</span>}
                </span>
                <span className="ml-4 text-sm text-slate-400">Direction: {gameState.direction === 1 ? '▶' : '◀'}</span>
            </div>

            {/* Opponents */}
            <div className="absolute top-16 left-0 right-0 flex justify-center gap-12">
                {opponents.map(opp => {
                    const isOppTurn = gameState.players[gameState.currentPlayerIndex]?.id === opp.id;
                    return (
                        <div key={opp.id} className="flex flex-col items-center">
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
                <motion.div 
                    whileHover={{ scale: 1.05, y: -5 }}
                    whileTap={{ scale: 0.95 }}
                    className="relative cursor-pointer group"
                    onClick={onDrawCard}
                >
                    <img src="/img/cards/back.png" className="h-40 w-28 shadow-[0_10px_25px_rgba(0,0,0,0.5)] rounded-lg" alt="draw pile" />
                    <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors rounded-lg flex items-center justify-center">
                        <span className="opacity-0 group-hover:opacity-100 font-bold bg-black/70 px-3 py-1 rounded-full transition-opacity">DRAW</span>
                    </div>
                </motion.div>

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
            <div className="fixed bottom-8 left-8">
                <motion.img 
                    whileHover={{ scale: 1.1, opacity: 0.9 }}
                    whileTap={{ scale: 0.9 }}
                    src="/img/background/draw_button.jpeg" 
                    className="w-20 h-20 rounded-full shadow-lg cursor-pointer border-4 border-slate-800" 
                    onClick={onDrawCard} 
                    alt="draw button" 
                />
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

                            return (
                                <motion.div
                                    key={card.id}
                                    layout
                                    initial={{ y: 100, opacity: 0 }}
                                    animate={{ 
                                        y: yOffset, 
                                        rotate: rotation, 
                                        opacity: 1,
                                        zIndex: index 
                                    }}
                                    exit={{ y: -200, scale: 0.5, opacity: 0 }}
                                    whileHover={{ 
                                        y: -40, 
                                        scale: 1.15, 
                                        rotate: 0, 
                                        zIndex: 100 
                                    }}
                                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                    className="cursor-pointer -ml-8 first:ml-0 transform-origin-bottom"
                                    onClick={() => isMyTurn && onPlayCard(card.id)}
                                >
                                    <img 
                                        src={getCardImageUrl(card)}
                                        className="h-40 w-28 rounded-lg shadow-xl"
                                        alt={`${card.color} ${card.type}`}
                                    />
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}
