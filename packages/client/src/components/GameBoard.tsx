import { EngineState, Card, isValidPlay } from '@uno/shared';
import { getCardImageUrl } from '../utils/cardImages';
import { sfx } from '../utils/sfx';
import { motion, AnimatePresence } from 'framer-motion';
import { useMemo, useState, useEffect } from 'react';

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

export function GameBoard({ 
    gameState, 
    localPlayerId, 
    onPlayCard, 
    onDrawCard, 
    onCallUno, 
    onChooseColor, 
    onPassTurn, 
    onCatchUno, 
    onStartNextRound 
}: GameBoardProps) {
    const localPlayer = gameState.players.find(p => p.id === localPlayerId);
    const opponents = gameState.players.filter(p => p.id !== localPlayerId);

    const isMyTurn = gameState.players[gameState.currentPlayerIndex]?.id === localPlayerId;
    const isHost = gameState.players[0]?.id === localPlayerId;

    // Animation & VFX overlay states
    const [specialEffect, setSpecialEffect] = useState<{ type: string; message: string; targetId?: string } | null>(null);
    const [landingShockwave, setLandingShockwave] = useState(false);

    // Track top discard changes for play animation & sound
    useEffect(() => {
        if (!gameState.topDiscard) return;
        const card = gameState.topDiscard;

        // Trigger landing shockwave
        setLandingShockwave(true);
        const tWave = setTimeout(() => setLandingShockwave(false), 500);

        if (card.type === 'wildDrawFour') {
            sfx.playDrawFour();
            setSpecialEffect({ type: 'drawFour', message: 'DRAW +4!', targetId: gameState.players[gameState.currentPlayerIndex]?.id });
        } else if (card.type === 'drawTwo') {
            sfx.playDrawTwo();
            setSpecialEffect({ type: 'drawTwo', message: 'DRAW +2!', targetId: gameState.players[gameState.currentPlayerIndex]?.id });
        } else if (card.type === 'skip') {
            sfx.playSkip();
            setSpecialEffect({ type: 'skip', message: 'SKIP!', targetId: gameState.players[gameState.currentPlayerIndex]?.id });
        } else if (card.type === 'reverse') {
            sfx.playReverse();
            setSpecialEffect({ type: 'reverse', message: 'REVERSE!' });
        } else {
            sfx.playCardPlay();
        }

        return () => clearTimeout(tWave);
    }, [gameState.topDiscard?.id]);

    // Clear VFX state
    useEffect(() => {
        if (!specialEffect) return;
        const t = setTimeout(() => setSpecialEffect(null), 2000);
        return () => clearTimeout(t);
    }, [specialEffect]);

    // Play victory SFX on round/match end
    useEffect(() => {
        if (gameState.phase === 'roundEnd' || gameState.phase === 'matchEnd') {
            sfx.playWin();
        }
    }, [gameState.phase]);

    // Deterministic stable rotation for top discard card
    const discardRotation = useMemo(() => {
        if (!gameState.topDiscard?.id) return 0;
        const id = gameState.topDiscard.id;
        let hash = 0;
        for (let i = 0; i < id.length; i++) hash = (hash << 5) - hash + id.charCodeAt(i);
        return (Math.abs(hash) % 11) - 5;
    }, [gameState.topDiscard?.id]);

    // Opponent spatial positions
    const getOpponentLayout = (index: number, total: number) => {
        if (total === 1) return { pos: 'top-10 sm:top-14 left-1/2 -translate-x-1/2' };
        if (total === 2) {
            if (index === 0) return { pos: 'top-1/3 left-2 sm:left-12 -translate-y-1/2' };
            return { pos: 'top-1/3 right-2 sm:right-12 -translate-y-1/2' };
        }
        if (total === 3) {
            if (index === 0) return { pos: 'top-1/3 left-2 sm:left-10 -translate-y-1/2' };
            if (index === 1) return { pos: 'top-10 sm:top-14 left-1/2 -translate-x-1/2' };
            return { pos: 'top-1/3 right-2 sm:right-10 -translate-y-1/2' };
        }
        if (index === 0) return { pos: 'top-1/3 left-2 sm:left-8 -translate-y-1/2' };
        if (index === 1) return { pos: 'top-10 sm:top-14 left-1/4 -translate-x-1/2' };
        if (index === 2) return { pos: 'top-10 sm:top-14 left-1/2 -translate-x-1/2' };
        if (index === 3) return { pos: 'top-10 sm:top-14 left-3/4 -translate-x-1/2' };
        return { pos: 'top-1/3 right-2 sm:right-8 -translate-y-1/2' };
    };

    return (
        <div className="min-h-screen h-screen w-screen relative overflow-hidden bg-gradient-to-b from-[#0a2342] via-[#123e6d] to-[#08182b] select-none flex flex-col justify-between p-2 sm:p-4">
            
            {/* 3D Planet Globe Background Aura */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] sm:w-[950px] sm:h-[950px] rounded-full bg-gradient-to-b from-[#2e933c] via-[#1f6b2a] to-[#13441a] opacity-85 border-8 border-[#52c462]/30 shadow-[0_0_120px_rgba(46,147,60,0.6)] pointer-events-none z-0 overflow-hidden flex items-center justify-center">
                {/* Embedded Globe Topography & Clouds */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.25),transparent_70%)]"></div>
                <div className="text-[180px] sm:text-[280px] font-black text-white/5 tracking-widest select-none pointer-events-none">UNO</div>
                
                {/* Rotating direction arrows */}
                <motion.div 
                    animate={{ rotate: gameState.direction === 1 ? 360 : -360 }}
                    transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                    className="absolute w-[450px] h-[450px] sm:w-[650px] sm:h-[650px] rounded-full border-4 border-dashed border-yellow-400/35"
                ></motion.div>
            </div>

            {/* Header / Game Status */}
            <div className="absolute top-2 sm:top-4 left-1/2 -translate-x-1/2 bg-slate-900/95 px-4 py-1.5 sm:px-8 sm:py-2.5 rounded-full border-2 border-yellow-500/60 backdrop-blur-md z-50 shadow-[0_0_20px_rgba(234,179,8,0.4)] flex items-center gap-3">
                <span className="text-sm sm:text-xl font-bold font-display tracking-wider">
                    {isMyTurn ? (
                        <span className="text-emerald-400 animate-pulse drop-shadow-[0_0_12px_rgba(52,211,153,0.9)] flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping"></span>
                            YOUR TURN
                        </span>
                    ) : (
                        <span className="text-yellow-400">{gameState.players[gameState.currentPlayerIndex]?.name}'s Turn</span>
                    )}
                </span>
                <span className="text-xs sm:text-sm bg-slate-800 px-2.5 py-0.5 rounded-full text-slate-200 font-mono font-bold border border-slate-600">
                    {gameState.direction === 1 ? '▶ CW' : '◀ CCW'}
                </span>
            </div>

            {/* VFX Announcements / Card Power Banners */}
            <AnimatePresence>
                {specialEffect && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.4, y: -30 }}
                        animate={{ opacity: 1, scale: 1.25, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: -20 }}
                        className="fixed top-16 sm:top-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
                    >
                        <div className={`px-6 py-2 rounded-2xl font-black text-2xl sm:text-4xl shadow-2xl tracking-widest border-4 uppercase text-white flex items-center gap-3 ${
                            specialEffect.type === 'drawFour' ? 'bg-gradient-to-r from-blue-600 via-cyan-600 to-indigo-700 border-cyan-300 shadow-cyan-500/60 animate-bounce' :
                            specialEffect.type === 'drawTwo' ? 'bg-gradient-to-r from-yellow-500 via-amber-500 to-orange-600 border-yellow-200 shadow-yellow-500/60 animate-bounce' :
                            specialEffect.type === 'skip' ? 'bg-gradient-to-r from-red-600 via-rose-600 to-red-700 border-white shadow-red-500/60 animate-pulse' :
                            'bg-gradient-to-r from-purple-600 to-pink-600 border-purple-300 shadow-purple-500/60'
                        }`}>
                            {specialEffect.message}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Opponents with Active Circular Progress Ring */}
            {opponents.map((opp, index) => {
                const isOppTurn = gameState.players[gameState.currentPlayerIndex]?.id === opp.id;
                const isVulnerable = opp.hand.length === 1 && !opp.calledUno;
                const layout = getOpponentLayout(index, opponents.length);

                return (
                    <div key={opp.id} className={`absolute flex flex-col items-center z-20 ${layout.pos}`}>
                        {isVulnerable && (
                            <motion.button
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                whileHover={{ scale: 1.1 }}
                                onClick={() => {
                                    sfx.playUnoCall();
                                    onCatchUno?.(opp.id);
                                }}
                                className="absolute -top-10 bg-red-600 text-white font-black px-3 py-1 rounded-full text-xs sm:text-sm shadow-[0_0_20px_rgba(239,68,68,1)] z-30 animate-pulse border-2 border-white whitespace-nowrap cursor-pointer"
                            >
                                CATCH UNO!
                            </motion.button>
                        )}
                        
                        {/* Avatar Frame with Timer Ring */}
                        <div className="relative flex flex-col items-center">
                            {isOppTurn && (
                                <svg className="absolute -inset-2 w-16 h-16 sm:w-20 sm:h-20 animate-spin z-10 pointer-events-none" viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="45" fill="none" stroke="#F1C40F" strokeWidth="6" strokeDasharray="70 180" strokeLinecap="round" />
                                </svg>
                            )}

                            {/* Avatar Badge */}
                            <motion.div 
                                animate={{ scale: isOppTurn ? 1.12 : 1 }}
                                className={`w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center font-bold text-lg sm:text-2xl shadow-2xl border-4 transition-all relative ${
                                    isOppTurn ? 'border-yellow-400 bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-600 text-slate-900 shadow-yellow-500/60 z-20' : 'border-slate-700 bg-slate-800 text-white'
                                }`}
                            >
                                👤
                                {opp.calledUno && (
                                    <span className="absolute -bottom-1 -right-1 bg-red-600 text-white text-[10px] sm:text-xs font-black px-1.5 py-0.5 rounded-full border border-white shadow-lg animate-bounce">
                                        UNO
                                    </span>
                                )}
                            </motion.div>

                            <div className="mt-1 px-3 py-0.5 bg-slate-900/90 text-white rounded-full text-xs font-bold border border-slate-700 shadow-md">
                                {opp.name} ({opp.hand.length})
                            </div>
                        </div>

                        {/* Opponent Card Stack */}
                        <div className="flex mt-1">
                            {Array.from({ length: Math.min(opp.hand.length, 6) }).map((_, i) => (
                                <motion.div 
                                    key={`${opp.id}-card-${i}`} 
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="h-10 w-7 sm:h-16 sm:w-11 -ml-4 sm:-ml-6 first:ml-0 shadow-lg rounded-lg border border-slate-700/60 overflow-hidden relative"
                                >
                                    <img src="/img/cards/back.png" alt="Card back" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-gradient-to-b from-white/15 to-transparent pointer-events-none"></div>
                                </motion.div>
                            ))}
                            {opp.hand.length > 6 && <div className="text-[10px] sm:text-xs ml-1 mt-auto bg-slate-800 text-white px-1 rounded transform rotate-90">+{opp.hand.length - 6}</div>}
                        </div>
                    </div>
                );
            })}

            {/* Center Piles (Draw & Discard) with Shockwave & Smooth Arc Trajectories */}
            <div className="absolute top-[44%] sm:top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-4 sm:gap-10 items-center z-20">
                
                {/* Draw Pile / Pass Button */}
                {gameState.hasDrawnCard && isMyTurn ? (
                    <motion.div 
                        whileHover={{ scale: 1.05, y: -3 }}
                        whileTap={{ scale: 0.95 }}
                        className="relative cursor-pointer group flex items-center justify-center h-28 w-20 sm:h-36 sm:w-26 md:h-40 md:w-28 bg-gradient-to-b from-slate-800 to-slate-900 rounded-xl border-2 border-slate-600 shadow-2xl"
                        onClick={() => {
                            sfx.playCardPlay();
                            onPassTurn?.();
                        }}
                    >
                        <span className="font-bold text-slate-200 tracking-widest text-sm sm:text-xl group-hover:text-white transition-colors">PASS</span>
                    </motion.div>
                ) : (
                    <motion.div 
                        whileHover={{ scale: isMyTurn ? 1.06 : 1, y: isMyTurn ? -3 : 0 }}
                        whileTap={{ scale: isMyTurn ? 0.95 : 1 }}
                        className={`relative group ${isMyTurn ? 'cursor-pointer' : 'cursor-not-allowed opacity-85'}`}
                        onClick={() => {
                            if (isMyTurn) {
                                sfx.playCardDraw();
                                onDrawCard();
                            }
                        }}
                    >
                        <div className="h-28 w-20 sm:h-36 sm:w-26 md:h-40 md:w-28 shadow-[0_15px_35px_rgba(0,0,0,0.7)] rounded-xl border-2 border-slate-700 transition-all group-hover:border-blue-400 overflow-hidden relative">
                            <img src="/img/cards/back.png" className="w-full h-full object-cover" alt="draw pile" />
                            <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent pointer-events-none"></div>
                        </div>
                        {isMyTurn && (
                            <div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/20 transition-colors rounded-xl flex items-center justify-center">
                                <span className="opacity-0 group-hover:opacity-100 font-bold bg-black/80 px-2 py-1 text-blue-200 rounded-full transition-opacity shadow-[0_0_15px_rgba(59,130,246,0.5)] tracking-widest text-xs sm:text-sm">DRAW</span>
                            </div>
                        )}
                    </motion.div>
                )}

                {/* Discard Pile with Landing Shockwave Ripple */}
                {gameState.topDiscard && (
                    <div className="relative">
                        {landingShockwave && (
                            <motion.div 
                                initial={{ scale: 0.8, opacity: 0.8 }}
                                animate={{ scale: 1.6, opacity: 0 }}
                                transition={{ duration: 0.45 }}
                                className="absolute inset-0 rounded-xl border-4 border-yellow-400/80 shadow-[0_0_40px_rgba(241,196,15,0.8)] pointer-events-none z-10"
                            ></motion.div>
                        )}
                        <motion.div
                            key={gameState.topDiscard.id}
                            initial={{ scale: 0.4, y: 50, rotate: -25, opacity: 0 }}
                            animate={{ scale: 1, y: 0, rotate: discardRotation, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 320, damping: 20 }}
                            className="relative overflow-hidden rounded-xl shadow-[0_15px_35px_rgba(0,0,0,0.7)]"
                        >
                            <img 
                                src={getCardImageUrl(gameState.topDiscard)} 
                                className="h-28 w-20 sm:h-36 sm:w-26 md:h-40 md:w-28 rounded-xl object-cover" 
                                alt="discard pile" 
                            />
                            {/* Card Gloss Sheen */}
                            <div className="absolute inset-0 bg-gradient-to-b from-white/25 via-transparent to-black/20 pointer-events-none"></div>

                            {/* Active Color Badge for Wild cards */}
                            {(gameState.topDiscard.type === 'wild' || gameState.topDiscard.type === 'wildDrawFour') && (
                                <div className="absolute -bottom-3 sm:-bottom-4 left-1/2 -translate-x-1/2 px-3 py-0.5 sm:px-4 sm:py-1 rounded-full font-black text-[10px] sm:text-xs shadow-xl text-slate-900 border-2 border-slate-900 uppercase tracking-widest whitespace-nowrap" 
                                    style={{ 
                                        backgroundColor: gameState.activeColor === 'red' ? '#E74C3C' : 
                                                        gameState.activeColor === 'blue' ? '#2980B9' : 
                                                        gameState.activeColor === 'green' ? '#27AE60' : 
                                                        gameState.activeColor === 'yellow' ? '#F1C40F' : 'white'
                                    }}>
                                    {gameState.activeColor}
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </div>

            {/* Action Bar (Draw & UNO buttons placed cleanly above hand) */}
            <div className="fixed bottom-26 sm:bottom-36 left-1/2 -translate-x-1/2 w-full max-w-md px-6 flex justify-between items-center z-30 pointer-events-none">
                <motion.button 
                    whileHover={{ scale: isMyTurn ? 1.08 : 1 }}
                    whileTap={{ scale: isMyTurn ? 0.92 : 1 }}
                    className={`pointer-events-auto w-14 h-14 sm:w-20 sm:h-20 rounded-full shadow-[0_10px_25px_rgba(0,0,0,0.6)] border-2 sm:border-4 border-slate-700 bg-slate-800 flex items-center justify-center overflow-hidden relative group ${isMyTurn ? 'cursor-pointer ring-2 ring-blue-500/50' : 'cursor-not-allowed opacity-50'}`}
                    onClick={() => {
                        if (isMyTurn) {
                            sfx.playCardDraw();
                            onDrawCard();
                        }
                    }} 
                    title="Draw Card"
                >
                    <div className="absolute inset-0 bg-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <img src="/img/background/draw_button.jpeg" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt="draw button" />
                </motion.button>

                <motion.img 
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    src="/img/background/uno_button.png" 
                    className="pointer-events-auto w-14 h-14 sm:w-20 sm:h-20 rounded-full shadow-[0_10px_25px_rgba(0,0,0,0.6)] cursor-pointer animate-pulse-glow border-2 border-red-500/50" 
                    onClick={() => {
                        sfx.playUnoCall();
                        onCallUno();
                    }} 
                    alt="uno button" 
                    title="Call UNO!"
                />
            </div>

            {/* Local Player Hand & Avatar */}
            {localPlayer && (
                <div className="fixed bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center z-40 max-w-full px-2">
                    
                    {/* User Avatar Badge & Turn Ring */}
                    <div className="relative mb-1 flex items-center gap-2 bg-slate-900/90 px-3 py-1 rounded-full border border-slate-700 shadow-lg">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isMyTurn ? 'bg-emerald-500 text-slate-900' : 'bg-slate-700 text-white'}`}>
                            👤
                        </div>
                        <span className="text-xs sm:text-sm font-bold text-white truncate max-w-[120px]">{localPlayer.name}</span>
                        {localPlayer.calledUno && <span className="bg-red-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">UNO</span>}
                    </div>

                    {/* Cards Fan with Curved Arc Layout & Gloss Sheen */}
                    <div className="flex items-end justify-center perspective-1000">
                        <AnimatePresence>
                            {localPlayer.hand.map((card: Card, index: number) => {
                                const total = localPlayer.hand.length;
                                const middle = (total - 1) / 2;
                                const rotation = (index - middle) * (total > 8 ? 2.5 : 4);
                                const yOffset = Math.abs(index - middle) * (total > 8 ? 1.5 : 3);
                                const overlapMargin = total > 12 ? '-ml-10 sm:-ml-12' : total > 8 ? '-ml-8 sm:-ml-10' : '-ml-5 sm:-ml-8';

                                const isPlayable = isMyTurn && (
                                    gameState.hasDrawnCard 
                                        ? card.id === gameState.drawnCardId 
                                        : isValidPlay(card, gameState.topDiscard, gameState.activeColor)
                                );
                                
                                return (
                                    <motion.div
                                        key={card.id}
                                        layout
                                        initial={{ y: 120, scale: 0.5, opacity: 0 }}
                                        animate={{ 
                                            y: yOffset, 
                                            rotate: rotation, 
                                            opacity: isPlayable ? 1 : 0.45,
                                            zIndex: index 
                                        }}
                                        exit={{ y: -200, scale: 0.3, rotate: Math.random() * 40 - 20, opacity: 0 }}
                                        whileHover={{ 
                                            y: isPlayable ? -40 : yOffset, 
                                            scale: isPlayable ? 1.18 : 1, 
                                            rotate: isPlayable ? 0 : rotation, 
                                            zIndex: 100 
                                        }}
                                        whileTap={{ 
                                            y: isPlayable ? -40 : yOffset, 
                                            scale: isPlayable ? 1.18 : 1, 
                                            rotate: isPlayable ? 0 : rotation, 
                                            zIndex: 100 
                                        }}
                                        transition={{ type: "spring", stiffness: 340, damping: 22, delay: index * 0.03 }}
                                        className={`${isPlayable ? 'cursor-pointer' : 'cursor-not-allowed'} ${overlapMargin} first:ml-0 transform-origin-bottom relative shrink-0`}
                                        onClick={() => {
                                            if (isMyTurn && isPlayable) {
                                                onPlayCard(card.id);
                                            }
                                        }}
                                    >
                                        <div className={`h-28 w-20 sm:h-36 sm:w-26 md:h-40 md:w-28 rounded-xl overflow-hidden relative transition-all ${
                                            isPlayable 
                                                ? 'shadow-[0_12px_28px_rgba(0,0,0,0.8)] border-2 border-emerald-400/90 shadow-emerald-500/40 ring-2 ring-emerald-400/30' 
                                                : 'shadow-[0_4px_12px_rgba(0,0,0,0.6)] filter brightness-[0.7] grayscale-[15%]'
                                        }`}>
                                            <img 
                                                src={getCardImageUrl(card)}
                                                className="w-full h-full object-cover"
                                                alt={`${card.color} ${card.type}`}
                                            />
                                            {/* 3D Gloss Sheen Overlay */}
                                            <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-transparent to-black/25 pointer-events-none"></div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                </div>
            )}

            {/* 4-Quadrant Color Picker Wheel Modal */}
            <AnimatePresence>
                {gameState.phase === 'choosingColor' && isMyTurn && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4"
                    >
                        <motion.div 
                            initial={{ scale: 0.7, rotate: -20 }}
                            animate={{ scale: 1, rotate: 0 }}
                            exit={{ scale: 0.7, rotate: 20 }}
                            className="bg-slate-900 p-6 sm:p-8 rounded-full shadow-[0_0_80px_rgba(255,255,255,0.2)] border-4 border-slate-700 max-w-xs sm:max-w-sm w-full text-center relative overflow-hidden"
                        >
                            <h2 className="text-xl sm:text-2xl font-black text-white mb-4 tracking-widest drop-shadow-lg">SELECT COLOR</h2>
                            
                            {/* 4-Quadrant Color Wheel */}
                            <div className="grid grid-cols-2 gap-2 w-48 h-48 sm:w-60 sm:h-60 mx-auto rounded-full overflow-hidden border-4 border-white/30 shadow-2xl p-1 bg-slate-950">
                                {[
                                    { color: 'red', hex: '#E74C3C', label: 'RED' },
                                    { color: 'blue', hex: '#2980B9', label: 'BLUE' },
                                    { color: 'green', hex: '#27AE60', label: 'GREEN' },
                                    { color: 'yellow', hex: '#F1C40F', label: 'YELLOW' }
                                ].map((c) => (
                                    <motion.button
                                        key={c.color}
                                        whileHover={{ scale: 1.06, filter: 'brightness(1.2)' }}
                                        whileTap={{ scale: 0.94 }}
                                        onClick={() => {
                                            sfx.playColorSelect();
                                            onChooseColor?.(c.color);
                                        }}
                                        className="w-full h-full font-black text-sm sm:text-lg uppercase tracking-wider text-white shadow-inner flex items-center justify-center cursor-pointer transition-all border border-white/20"
                                        style={{ backgroundColor: c.hex }}
                                    >
                                        {c.label}
                                    </motion.button>
                                ))}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Victory / Super Win Presentation Modal */}
            <AnimatePresence>
                {(gameState.phase === 'roundEnd' || gameState.phase === 'matchEnd') && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-4"
                    >
                        <motion.div 
                            initial={{ scale: 0.8, y: 30 }}
                            animate={{ scale: 1, y: 0 }}
                            className="bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 border-4 border-yellow-500/80 p-6 sm:p-8 rounded-3xl shadow-[0_0_80px_rgba(234,179,8,0.4)] max-w-md sm:max-w-lg w-full text-center relative overflow-hidden"
                        >
                            {/* Super Win Ribbon Badge */}
                            <div className="inline-block bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 px-6 py-2 rounded-full font-black text-xl sm:text-3xl shadow-xl tracking-wider mb-4 border-2 border-white uppercase animate-bounce">
                                {gameState.phase === 'matchEnd' ? '⭐ SUPER WIN! ⭐' : '🎉 ROUND WON! 🎉'}
                            </div>

                            <p className="text-xl sm:text-2xl text-yellow-300 font-bold mb-6">
                                Winner: <span className="text-white font-black">{gameState.players.find(p => p.id === (gameState.phase === 'matchEnd' ? gameState.matchWinnerId : gameState.roundWinnerId))?.name || 'Player'}</span>
                            </p>

                            {/* Scoreboard Breakdown */}
                            <div className="bg-slate-800/90 rounded-2xl p-4 mb-6 border border-slate-700">
                                <h3 className="text-slate-400 font-bold mb-3 uppercase tracking-widest text-xs sm:text-sm border-b border-slate-700 pb-2">Round Scoreboard</h3>
                                <div className="space-y-2">
                                    {gameState.players.map(p => (
                                        <div key={p.id} className="flex justify-between items-center text-sm sm:text-lg">
                                            <span className={p.id === localPlayerId ? 'text-emerald-400 font-bold' : 'text-slate-300'}>{p.name}</span>
                                            <span className="font-mono font-bold text-yellow-400">{gameState.matchScores[p.id] || 0} pts</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {gameState.phase === 'roundEnd' && (
                                isHost ? (
                                    <button 
                                        onClick={onStartNextRound}
                                        className="w-full py-3 sm:py-4 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400 text-slate-950 font-black rounded-xl text-lg sm:text-xl transition-all shadow-[0_0_25px_rgba(34,197,94,0.5)] hover:scale-105 cursor-pointer uppercase tracking-wider"
                                    >
                                        Start Next Round
                                    </button>
                                ) : (
                                    <p className="text-slate-400 italic bg-slate-800 py-3 sm:py-4 rounded-xl text-sm sm:text-base">Waiting for host to start the next round...</p>
                                )
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
