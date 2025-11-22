
import React, { useState, useEffect } from 'react';
import { Word, WordStatus } from '../types';
import { Volume2, Check, X, Repeat, Lightbulb, Clock } from 'lucide-react';

interface FlashcardProps {
  word: Word;
  onStatusChange: (id: string, status: WordStatus) => void;
  onNext: () => void;
}

export const Flashcard: React.FC<FlashcardProps> = ({ word, onStatusChange, onNext }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  
  // Reset state when word changes
  useEffect(() => {
    setIsFlipped(false);
  }, [word.id]);

  // Helper: Haptic Feedback
  const triggerHaptic = (strong = false) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(strong ? 20 : 10);
    }
  };

  // Helper: Predict Next Review Time (Ebbinghaus Visualization)
  const getNextReviewText = (action: 'forget' | 'blurry' | 'master') => {
    if (action === 'forget') return '1m';
    if (action === 'blurry') return '10m';
    
    // Simplified SM-2 Prediction for display
    let nextInterval = 1;
    if (word.repetitions === 0) nextInterval = 1;
    else if (word.repetitions === 1) nextInterval = 6;
    else nextInterval = Math.round(word.interval * word.easeFactor);
    
    return `${nextInterval}d`;
  };

  // Listen for Spacebar to flip
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        triggerHaptic();
        setIsFlipped(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const speakText = (text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  const handleAction = (status: WordStatus) => {
    triggerHaptic(true);
    onStatusChange(word.id, status);
    onNext();
  };

  return (
    <div className="w-full max-w-lg aspect-[3/4] md:aspect-[16/10] relative cursor-pointer group perspective-1000">
      
      {/* FLIP WRAPPER */}
      <div 
        className="relative w-full h-full transition-transform duration-500 transform-style-3d origin-center"
        style={{ transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
        onClick={() => { triggerHaptic(); setIsFlipped(!isFlipped); }}
      >
        {/* --- FRONT --- */}
        <div className="absolute inset-0 w-full h-full backface-hidden bg-white rounded-3xl shadow-[0_15px_40px_-10px_rgba(0,0,0,0.08)] border border-slate-100 flex flex-col items-center justify-center p-8 overflow-hidden z-10">
            <div className="absolute top-0 left-8 right-8 h-1 bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 rounded-b-full opacity-60"></div>
            
            <div className="absolute top-6 right-6 flex gap-2">
                {word.status !== WordStatus.New && (
                    <span className="text-[10px] font-bold uppercase tracking-widest text-amber-500 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100 flex items-center gap-1">
                        <Clock size={10} /> Review
                    </span>
                )}
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
                    className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 rounded-full transition-all active:scale-95 group/audio"
                >
                    <span className="text-base font-mono opacity-80 font-medium">{word.phonetic}</span>
                    <Volume2 size={16} className="group-hover/audio:animate-pulse" />
                </button>
                )}
            </div>

            <div className="absolute bottom-8 w-full px-10 flex justify-center items-end text-indigo-200 opacity-60 md:opacity-100 transition-opacity">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] animate-pulse">Click to Flip</span>
            </div>
        </div>

        {/* --- BACK --- */}
        <div 
            className="absolute inset-0 w-full h-full backface-hidden bg-white rounded-3xl shadow-[0_15px_40px_-10px_rgba(0,0,0,0.08)] border border-slate-100 flex flex-col overflow-hidden"
            style={{ transform: 'rotateY(180deg)' }}
        >
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-50 bg-white/80 backdrop-blur-sm z-10">
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

            {/* Action Bar with Ebbinghaus Indicators */}
            <div className="px-6 py-4 bg-white border-t border-slate-100 grid grid-cols-3 gap-3 z-20">
                <button onClick={(e) => { e.stopPropagation(); handleAction(WordStatus.New); }} className="flex flex-col items-center justify-center py-2 rounded-xl hover:bg-rose-50 transition-colors active:scale-95 group">
                    <X size={20} className="text-rose-300 group-hover:text-rose-500 mb-1 transition-colors" />
                    <div className="flex items-center gap-1 mt-1">
                        <span className="text-[10px] font-bold text-rose-300 group-hover:text-rose-500 uppercase">Forget</span>
                        <span className="text-[8px] font-mono text-rose-200 group-hover:text-rose-400 bg-rose-50 px-1 rounded">{getNextReviewText('forget')}</span>
                    </div>
                </button>
                <button onClick={(e) => { e.stopPropagation(); handleAction(WordStatus.Learning); }} className="flex flex-col items-center justify-center py-2 rounded-xl hover:bg-amber-50 transition-colors active:scale-95 group">
                    <Repeat size={20} className="text-amber-300 group-hover:text-amber-500 mb-1 transition-colors" />
                    <div className="flex items-center gap-1 mt-1">
                        <span className="text-[10px] font-bold text-amber-300 group-hover:text-amber-500 uppercase">Blurry</span>
                        <span className="text-[8px] font-mono text-amber-200 group-hover:text-amber-400 bg-amber-50 px-1 rounded">{getNextReviewText('blurry')}</span>
                    </div>
                </button>
                <button onClick={(e) => { e.stopPropagation(); handleAction(WordStatus.Mastered); }} className="flex flex-col items-center justify-center py-2 rounded-xl hover:bg-emerald-50 transition-colors active:scale-95 group">
                    <Check size={20} className="text-emerald-300 group-hover:text-emerald-500 mb-1 transition-colors" />
                    <div className="flex items-center gap-1 mt-1">
                        <span className="text-[10px] font-bold text-emerald-300 group-hover:text-emerald-500 uppercase">Master</span>
                        <span className="text-[8px] font-mono text-emerald-200 group-hover:text-emerald-400 bg-emerald-50 px-1 rounded">{getNextReviewText('master')}</span>
                    </div>
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};
