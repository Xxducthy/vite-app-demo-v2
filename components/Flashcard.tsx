
import React, { useState, useEffect, useRef } from 'react';
import { Word, WordStatus } from '../types';
import { Volume2, Check, X, Repeat, Lightbulb, RefreshCw, Trophy } from 'lucide-react';

interface FlashcardProps {
  word: Word;
  onStatusChange: (id: string, status: WordStatus) => void;
  onNext: () => void;
  sessionAttempts: number; // How many times seen in this session
  repetitionCount: number; // How many consecutive correct (Streak)
}

export const Flashcard: React.FC<FlashcardProps> = ({ 
  word, 
  onStatusChange, 
  onNext,
  sessionAttempts,
  repetitionCount
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  
  // Touch/Swipe State
  const [touchStart, setTouchStart] = useState<{x: number, y: number} | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  
  // Audio Ref to prevent Garbage Collection (Critical Fix)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Reset state when word changes
  useEffect(() => {
    setIsFlipped(false);
    setSwipeOffset(0);
  }, [word.id]);

  // Listen for Spacebar to flip
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const speakText = (text: string) => {
    // 1. Cancel pending
    window.speechSynthesis.cancel();
    
    // 2. Create new utterance
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    
    // 3. Store reference to prevent GC
    utteranceRef.current = utterance;
    
    // 4. Speak
    window.speechSynthesis.speak(utterance);
  };

  const handleAction = (status: WordStatus) => {
    onStatusChange(word.id, status);
    onNext();
  };

  // --- Touch Handlers ---
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart) return;
    const currentX = e.targetTouches[0].clientX;
    const currentY = e.targetTouches[0].clientY;
    const deltaX = currentX - touchStart.x;
    const deltaY = currentY - touchStart.y;

    // Only swipe if horizontal movement is dominant
    if (Math.abs(deltaX) > 20 && Math.abs(deltaX) > Math.abs(deltaY)) {
       setSwipeOffset(deltaX);
    }
  };

  const handleTouchEnd = () => {
    if (!touchStart) return;
    const threshold = 100;
    if (swipeOffset > threshold) handleAction(WordStatus.Mastered);
    else if (swipeOffset < -threshold) handleAction(WordStatus.New);
    setSwipeOffset(0);
    setTouchStart(null);
  };

  const rotateDeg = swipeOffset * 0.05;

  // Render Status Badge (Reusable)
  const StatusBadge = () => (
    <div className="absolute top-6 left-6 flex items-center gap-3 z-20">
        {/* Session Attempts Counter (How many times recycled) */}
        <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-50/80 backdrop-blur border border-slate-100 rounded-lg text-slate-400" title="本轮循环次数">
            <RefreshCw size={10} className={sessionAttempts > 0 ? "text-indigo-500" : ""} />
            <span className="text-[10px] font-bold font-mono">{sessionAttempts + 1}</span>
        </div>

        {/* Mastery Streak Dots */}
        <div className="flex items-center gap-1 px-2 py-1 bg-slate-50/80 backdrop-blur border border-slate-100 rounded-lg" title="熟练度">
            <Trophy size={10} className={repetitionCount > 0 ? "text-amber-500" : "text-slate-300"} />
            <div className="flex gap-0.5 ml-1">
                {[...Array(3)].map((_, i) => (
                    <div 
                        key={i} 
                        className={`w-1.5 h-1.5 rounded-full ${i < repetitionCount ? 'bg-amber-400' : 'bg-slate-200'}`}
                    ></div>
                ))}
            </div>
        </div>
    </div>
  );

  return (
    // Container
    <div className="w-full max-w-lg aspect-[3/4] md:aspect-[16/10] relative cursor-pointer group perspective-1000">
      
      {/* Background Action Indicators (Fixed position relative to container) */}
      <div className={`absolute top-1/2 left-0 -translate-y-1/2 -translate-x-full z-0 transition-opacity duration-300 ${swipeOffset > 50 ? 'opacity-100' : 'opacity-0'}`}>
         <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm">
            <Check size={24} strokeWidth={3} />
         </div>
      </div>
      <div className={`absolute top-1/2 right-0 -translate-y-1/2 translate-x-full z-0 transition-opacity duration-300 ${swipeOffset < -50 ? 'opacity-100' : 'opacity-0'}`}>
         <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 shadow-sm">
            <X size={24} strokeWidth={3} />
         </div>
      </div>

      {/* LAYER 1: SWIPE WRAPPER (Handles X Translation & Tilt only) */}
      {/* This layer DOES NOT rotate Y. It only moves left/right. */}
      <div 
        className="w-full h-full transition-transform duration-300 ease-out"
        style={{ 
          transform: `translate3d(${swipeOffset}px, 0, 0) rotate(${rotateDeg}deg)`,
          cursor: swipeOffset !== 0 ? 'grabbing' : 'pointer'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => setIsFlipped(!isFlipped)}
      >
        {/* LAYER 2: FLIP WRAPPER (Handles Y Rotation only) */}
        {/* This nested layer rotates around its own center, ensuring no offset. */}
        <div 
            className="relative w-full h-full transition-transform duration-500 transform-style-3d origin-center"
            style={{ transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
        >
            {/* --- FRONT FACE --- */}
            <div className="absolute inset-0 w-full h-full backface-hidden bg-white rounded-3xl shadow-[0_15px_40px_-10px_rgba(0,0,0,0.08)] border border-slate-100 flex flex-col items-center justify-center p-8 overflow-hidden z-10">
                <div className="absolute top-0 left-8 right-8 h-1 bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 rounded-b-full opacity-60"></div>
                
                <StatusBadge />

                <div className="absolute top-6 right-6 z-20">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-slate-50/80 px-2.5 py-1 rounded-full border border-slate-100 backdrop-blur-sm">
                    {word.tags.includes('高频') ? 'Core' : 'Word'}
                    </span>
                </div>

                <div className="flex flex-col items-center text-center z-10 gap-5 w-full">
                    <h2 className="text-4xl md:text-6xl font-bold text-slate-800 tracking-tight leading-tight select-none">
                    {word.term}
                    </h2>
                    {word.phonetic && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); speakText(word.term); }}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 rounded-full transition-all active:scale-95 group/audio border border-slate-100"
                    >
                        <span className="text-base font-mono opacity-80 font-medium">{word.phonetic}</span>
                        <Volume2 size={16} className="group-hover/audio:animate-pulse" />
                    </button>
                    )}
                </div>

                <div className="absolute bottom-8 w-full px-10 flex justify-between items-end text-slate-300 opacity-0 md:opacity-100 transition-opacity">
                    <div className="flex flex-col items-center gap-1 hover:text-rose-400 transition-colors">
                        <div className="w-8 h-8 rounded-full border-2 border-current flex items-center justify-center"><X size={14} strokeWidth={3} /></div>
                    </div>
                    <div className="flex flex-col items-center gap-1 animate-pulse text-indigo-200">
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Click to Flip</span>
                    </div>
                    <div className="flex flex-col items-center gap-1 hover:text-emerald-400 transition-colors">
                        <div className="w-8 h-8 rounded-full border-2 border-current flex items-center justify-center"><Check size={14} strokeWidth={3} /></div>
                    </div>
                </div>
            </div>

            {/* --- BACK FACE --- */}
            <div 
                className="absolute inset-0 w-full h-full backface-hidden bg-white rounded-3xl shadow-[0_15px_40px_-10px_rgba(0,0,0,0.08)] border border-slate-100 flex flex-col overflow-hidden"
                style={{ transform: 'rotateY(180deg)' }}
            >
                <StatusBadge />

                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 pt-16 border-b border-slate-50 bg-white/80 backdrop-blur-sm z-10">
                    <div className="flex flex-col">
                        <h3 className="text-xl font-bold text-slate-800">{word.term}</h3>
                        {word.examSource && (
                        <span className="text-[10px] font-bold text-amber-600/80 tracking-wide mt-0.5">{word.examSource}</span>
                        )}
                    </div>
                    <button 
                        onClick={(e) => { e.stopPropagation(); speakText(word.term); }}
                        className="w-8 h-8 flex items-center justify-center bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                    >
                        <Volume2 size={16} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-grow overflow-y-auto no-scrollbar p-6 space-y-5 bg-gradient-to-b from-white to-slate-50/30">
                    {word.meanings.map((meaning, idx) => (
                    <div key={idx} className="relative group/item">
                        <div className="flex items-baseline gap-2 mb-2">
                            <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100/50 font-mono">
                            {meaning.partOfSpeech}
                            </span>
                            <p className="text-base font-bold text-slate-800">{meaning.definition}</p>
                        </div>
                        <div className="pl-3 border-l-2 border-slate-100 group-hover/item:border-indigo-200 transition-colors">
                            <p className="text-sm text-slate-600 leading-relaxed italic font-serif">"{meaning.example}"</p>
                            <div className="flex items-center justify-between mt-1">
                                <p className="text-xs text-slate-400 font-light">{meaning.translation}</p>
                                <button onClick={(e) => { e.stopPropagation(); speakText(meaning.example); }} className="text-slate-300 hover:text-indigo-500 transition-colors">
                                    <Volume2 size={12} />
                                </button>
                            </div>
                        </div>
                    </div>
                    ))}
                    {word.mnemonic && (
                    <div className="bg-indigo-50/60 rounded-xl p-3 border border-indigo-100/60">
                        <div className="flex gap-2 items-start">
                        <Lightbulb size={14} className="text-indigo-500 mt-0.5 shrink-0" />
                        <p className="text-xs font-medium text-indigo-800/90 leading-relaxed">{word.mnemonic}</p>
                        </div>
                    </div>
                    )}
                    <div className="h-2"></div>
                </div>

                {/* Action Bar */}
                <div className="px-6 py-4 bg-white border-t border-slate-100 grid grid-cols-3 gap-3 z-20">
                    <button onClick={(e) => { e.stopPropagation(); handleAction(WordStatus.New); }} className="flex flex-col items-center justify-center py-2 rounded-xl hover:bg-rose-50 transition-colors active:scale-95 group">
                        <X size={20} className="text-rose-300 group-hover:text-rose-500 mb-1 transition-colors" />
                        <span className="text-[10px] font-bold text-rose-300 group-hover:text-rose-500 uppercase">Forget</span>
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleAction(WordStatus.Learning); }} className="flex flex-col items-center justify-center py-2 rounded-xl hover:bg-amber-50 transition-colors active:scale-95 group">
                        <Repeat size={20} className="text-amber-300 group-hover:text-amber-500 mb-1 transition-colors" />
                        <span className="text-[10px] font-bold text-amber-300 group-hover:text-amber-500 uppercase">Blurry</span>
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleAction(WordStatus.Mastered); }} className="flex flex-col items-center justify-center py-2 rounded-xl hover:bg-emerald-50 transition-colors active:scale-95 group">
                        <Check size={20} className="text-emerald-300 group-hover:text-emerald-500 mb-1 transition-colors" />
                        <span className="text-[10px] font-bold text-emerald-300 group-hover:text-emerald-500 uppercase">Master</span>
                    </button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
