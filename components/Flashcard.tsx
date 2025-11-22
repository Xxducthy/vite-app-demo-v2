
import React, { useState, useEffect, useRef } from 'react';
import { Word, WordStatus } from '../types';
import { Volume2, Check, X, Repeat, Lightbulb, BookOpenCheck } from 'lucide-react';

interface FlashcardProps {
  word: Word;
  onStatusChange: (id: string, status: WordStatus) => void;
  onNext: () => void;
}

export const Flashcard: React.FC<FlashcardProps> = ({ word, onStatusChange, onNext }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  
  // Touch/Swipe State
  const [touchStart, setTouchStart] = useState<{x: number, y: number} | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsFlipped(false);
    setSwipeOffset(0);
  }, [word.id]);

  // Listen for Spacebar to flip
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        // Prevent page scroll
        e.preventDefault();
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
    onStatusChange(word.id, status);
    onNext();
  };

  // --- Touch Handlers for Swipe ---
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart) return;
    const currentX = e.targetTouches[0].clientX;
    const currentY = e.targetTouches[0].clientY;
    
    const deltaX = currentX - touchStart.x;
    const deltaY = currentY - touchStart.y;

    // Only trigger horizontal swipe if horizontal movement is significant and dominant
    if (Math.abs(deltaX) > 20 && Math.abs(deltaX) > Math.abs(deltaY)) {
       setSwipeOffset(deltaX);
    }
  };

  const handleTouchEnd = () => {
    if (!touchStart) return;
    const threshold = 100; // px to trigger action

    if (swipeOffset > threshold) {
      // Swipe Right -> Mastered
      handleAction(WordStatus.Mastered);
    } else if (swipeOffset < -threshold) {
      // Swipe Left -> Forget/New
      handleAction(WordStatus.New);
    }
    
    // Reset
    setSwipeOffset(0);
    setTouchStart(null);
  };

  // Calculate rotation based on swipe for visual feedback
  const rotateDeg = swipeOffset * 0.05;

  return (
    // Updated Container: max-w-lg (smaller than 2xl), refined aspect ratio
    <div className="w-full max-w-lg aspect-[3/4] md:aspect-[16/10] relative cursor-pointer group perspective-1000">
      
      {/* Swipe Action Indicators (Mobile) */}
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

      <div 
        ref={cardRef}
        className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}
        style={{ 
          transform: isFlipped 
            ? `rotateY(180deg) translate(${swipeOffset}px, 0px) rotate(${rotateDeg}deg)` 
            : `translate(${swipeOffset}px, 0px) rotate(${rotateDeg}deg)`,
          cursor: swipeOffset !== 0 ? 'grabbing' : 'pointer'
        }}
        onClick={() => setIsFlipped(!isFlipped)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        
        {/* --- Front Side --- */}
        <div className="absolute w-full h-full backface-hidden bg-white rounded-3xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] border border-slate-100 flex flex-col items-center justify-center p-8 overflow-hidden relative">
           {/* Elegant Top Gradient Line */}
           <div className="absolute top-0 left-8 right-8 h-1 bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 rounded-b-full opacity-60"></div>
           
           {/* Tag */}
           <div className="absolute top-6 right-6">
             <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-slate-50/80 px-2.5 py-1 rounded-full border border-slate-100 backdrop-blur-sm">
               {word.tags.includes('高频') ? 'Core' : 'Word'}
             </span>
           </div>

          <div className="flex flex-col items-center text-center z-10 gap-5 w-full">
            {/* Word Term: Refined typography */}
            <h2 className="text-4xl md:text-6xl font-bold text-slate-800 tracking-tight leading-tight select-none">
              {word.term}
            </h2>
            
            {/* Phonetic Button */}
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

          {/* Bottom Actions Hint (Cleaner) */}
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

        {/* --- Back Side --- */}
        <div className="absolute w-full h-full backface-hidden rotate-y-180 bg-white rounded-3xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] border border-slate-100 flex flex-col overflow-hidden">
           
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
             
             {/* Meaning List */}
             {word.meanings.map((meaning, idx) => (
               <div key={idx} className="relative group/item">
                 <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100/50 font-mono">
                      {meaning.partOfSpeech}
                    </span>
                    <p className="text-base font-bold text-slate-800">
                      {meaning.definition}
                    </p>
                 </div>

                 {/* Example */}
                 <div className="pl-3 border-l-2 border-slate-100 group-hover/item:border-indigo-200 transition-colors">
                    <p className="text-sm text-slate-600 leading-relaxed italic font-serif">
                      "{meaning.example}"
                    </p>
                    <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-slate-400 font-light">{meaning.translation}</p>
                        <button 
                            onClick={(e) => { e.stopPropagation(); speakText(meaning.example); }}
                            className="text-slate-300 hover:text-indigo-500 transition-colors"
                        >
                            <Volume2 size={12} />
                        </button>
                    </div>
                 </div>
               </div>
             ))}

             {/* Mnemonic (Compact) */}
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
             <button 
               onClick={(e) => { e.stopPropagation(); handleAction(WordStatus.New); }}
               className="flex flex-col items-center justify-center py-2 rounded-xl hover:bg-rose-50 transition-colors active:scale-95 group"
             >
               <X size={20} className="text-rose-300 group-hover:text-rose-500 mb-1 transition-colors" />
               <span className="text-[10px] font-bold text-rose-300 group-hover:text-rose-500 uppercase">Forget</span>
             </button>

             <button 
               onClick={(e) => { e.stopPropagation(); handleAction(WordStatus.Learning); }}
               className="flex flex-col items-center justify-center py-2 rounded-xl hover:bg-amber-50 transition-colors active:scale-95 group"
             >
               <Repeat size={20} className="text-amber-300 group-hover:text-amber-500 mb-1 transition-colors" />
               <span className="text-[10px] font-bold text-amber-300 group-hover:text-amber-500 uppercase">Blurry</span>
             </button>

             <button 
               onClick={(e) => { e.stopPropagation(); handleAction(WordStatus.Mastered); }}
               className="flex flex-col items-center justify-center py-2 rounded-xl hover:bg-emerald-50 transition-colors active:scale-95 group"
             >
               <Check size={20} className="text-emerald-300 group-hover:text-emerald-500 mb-1 transition-colors" />
               <span className="text-[10px] font-bold text-emerald-300 group-hover:text-emerald-500 uppercase">Master</span>
             </button>
           </div>
        </div>
      </div>
    </div>
  );
};
