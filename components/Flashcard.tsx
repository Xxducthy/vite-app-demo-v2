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
       // Prevent scrolling when swiping horizontally
       if (e.cancelable) {
         // e.preventDefault() logic often needs passive: false listener, 
         // but React synthetic events make this harder. 
         // Relying on UI movement to indicate swipe.
       }
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
  const opacityLeft = Math.min(Math.abs(Math.min(0, swipeOffset)) / 150, 1); // Fade in 'Forget' overlay
  const opacityRight = Math.min(Math.max(0, swipeOffset) / 150, 1); // Fade in 'Mastered' overlay

  return (
    <div className="w-full max-w-2xl aspect-[4/5] md:aspect-[3/2] relative cursor-pointer group perspective-1000">
      
      {/* Swipe Action Indicators (Mobile) */}
      <div className={`absolute top-1/2 left-4 -translate-y-1/2 z-0 transition-opacity duration-300 ${swipeOffset > 50 ? 'opacity-100' : 'opacity-0'}`}>
         <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-lg border-4 border-white">
            <Check size={32} strokeWidth={3} />
         </div>
      </div>
      <div className={`absolute top-1/2 right-4 -translate-y-1/2 z-0 transition-opacity duration-300 ${swipeOffset < -50 ? 'opacity-100' : 'opacity-0'}`}>
         <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 shadow-lg border-4 border-white">
            <X size={32} strokeWidth={3} />
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
        <div className="absolute w-full h-full backface-hidden bg-white rounded-[2.5rem] shadow-2xl shadow-indigo-100/50 border border-white flex flex-col items-center justify-center p-8 md:p-12 overflow-hidden">
           {/* Decorative */}
           <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400"></div>
           <div className="absolute top-8 right-8 flex flex-col items-end gap-2">
             <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
               {word.tags.includes('高频') ? 'Core 500' : 'Custom'}
             </span>
           </div>

          <div className="flex flex-col items-center text-center z-10 gap-6">
            <h2 className="text-5xl md:text-7xl font-black text-slate-800 tracking-tighter leading-tight select-none">
              {word.term}
            </h2>
            
            {word.phonetic && (
              <button 
                onClick={(e) => { e.stopPropagation(); speakText(word.term); }}
                className="flex items-center gap-3 px-5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-2xl transition-all active:scale-95 group/audio"
              >
                <span className="text-xl font-mono tracking-wide opacity-80">{word.phonetic}</span>
                <Volume2 size={20} className="group-hover/audio:animate-pulse" />
              </button>
            )}
          </div>

          {/* Swipe Hints */}
          <div className="absolute bottom-10 w-full px-12 flex justify-between text-slate-300 opacity-0 md:opacity-100 transition-opacity">
             <div className="flex flex-col items-center gap-1">
                <X size={20} />
                <span className="text-[10px] font-bold uppercase">Forget</span>
             </div>
             <div className="flex flex-col items-center gap-1 animate-pulse text-indigo-300">
                <span className="text-[10px] font-bold uppercase tracking-widest">点击 / Space</span>
             </div>
             <div className="flex flex-col items-center gap-1">
                <Check size={20} />
                <span className="text-[10px] font-bold uppercase">Master</span>
             </div>
          </div>
          
          {/* Mobile hint */}
          <div className="absolute bottom-8 md:hidden text-slate-300 text-[10px] font-medium animate-pulse">
             左右滑动切换 • 点击翻转
          </div>
        </div>

        {/* --- Back Side --- */}
        <div className="absolute w-full h-full backface-hidden rotate-y-180 bg-white rounded-[2.5rem] shadow-2xl shadow-indigo-200/40 border border-white flex flex-col overflow-hidden">
           
           {/* Header (Mini) */}
           <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-white/50 backdrop-blur-md z-10">
              <div className="flex flex-col">
                <div className="flex items-baseline gap-3">
                  <h3 className="text-2xl font-bold text-slate-800">{word.term}</h3>
                  <span className="text-sm font-mono text-slate-400">{word.phonetic}</span>
                </div>
                {word.examSource && (
                  <div className="flex items-center gap-1.5 mt-1 text-amber-600 bg-amber-50 w-fit px-2 py-0.5 rounded-md border border-amber-100/50">
                    <BookOpenCheck size={10} />
                    <span className="text-[10px] font-bold tracking-wide">{word.examSource}</span>
                  </div>
                )}
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); speakText(word.term); }}
                className="p-2 bg-slate-50 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
              >
                <Volume2 size={20} />
              </button>
           </div>

           {/* Scrollable Content Area */}
           <div className="flex-grow overflow-y-auto no-scrollbar p-6 space-y-6">
             
             {/* Mnemonic Section (New) */}
             {word.mnemonic && (
               <div className="bg-indigo-50/80 rounded-xl p-4 border border-indigo-100 relative overflow-hidden">
                 <div className="absolute top-0 left-0 w-1 h-full bg-indigo-400"></div>
                 <div className="flex gap-3">
                   <div className="mt-0.5 text-indigo-500 bg-white p-1.5 rounded-lg shadow-sm h-fit">
                     <Lightbulb size={16} fill="currentColor" className="opacity-20" />
                     <Lightbulb size={16} className="absolute top-1.5 left-1.5" />
                   </div>
                   <div>
                     <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">记忆辅助</h4>
                     <p className="text-sm font-medium text-indigo-900 leading-relaxed">{word.mnemonic}</p>
                   </div>
                 </div>
               </div>
             )}

             {word.meanings.map((meaning, idx) => (
               <div key={idx} className="relative">
                 {idx > 0 && <div className="w-full h-px bg-slate-100 my-4"></div>}
                 
                 {/* Definition Row */}
                 <div className="flex items-start gap-3 mb-3">
                    <span className="px-2 py-0.5 bg-slate-800 text-white text-xs font-bold rounded-md font-mono mt-1 shadow-sm">
                      {meaning.partOfSpeech}
                    </span>
                    <p className="text-lg font-bold text-slate-800 leading-snug">
                      {meaning.definition}
                    </p>
                 </div>

                 {/* Example Block */}
                 <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-100/80 group/ex">
                    <div className="flex gap-2 items-start">
                      <div className="flex-grow">
                        <p className="text-[15px] text-slate-600 leading-relaxed mb-1.5 font-medium font-serif italic">
                          "{meaning.example}"
                        </p>
                        <p className="text-sm text-slate-400 font-light">
                          {meaning.translation}
                        </p>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); speakText(meaning.example); }}
                        className="mt-1 p-1.5 text-slate-300 hover:text-indigo-600 hover:bg-white rounded-lg transition-all"
                      >
                        <Volume2 size={16} />
                      </button>
                    </div>
                 </div>
               </div>
             ))}

             <div className="h-4"></div>
           </div>

           {/* Action Bar (Fixed at bottom) */}
           <div className="p-6 bg-white border-t border-slate-100 grid grid-cols-3 gap-4 z-20 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)]">
             
             <button 
               onClick={(e) => { e.stopPropagation(); handleAction(WordStatus.New); }}
               className="group flex flex-col items-center justify-center py-3 rounded-2xl hover:bg-rose-50 transition-colors active:scale-95 relative"
               title="快捷键: 1 (或左滑)"
             >
               <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-500 flex items-center justify-center mb-1 shadow-sm group-hover:shadow-md transition-all">
                 <X size={20} strokeWidth={3} />
               </div>
               <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">忘记</span>
             </button>

             <button 
               onClick={(e) => { e.stopPropagation(); handleAction(WordStatus.Learning); }}
               className="group flex flex-col items-center justify-center py-3 rounded-2xl hover:bg-amber-50 transition-colors active:scale-95 relative"
               title="快捷键: 2"
             >
               <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mb-1 shadow-sm group-hover:shadow-md transition-all">
                 <Repeat size={20} strokeWidth={3} />
               </div>
               <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">模糊</span>
             </button>

             <button 
               onClick={(e) => { e.stopPropagation(); handleAction(WordStatus.Mastered); }}
               className="group flex flex-col items-center justify-center py-3 rounded-2xl hover:bg-emerald-50 transition-colors active:scale-95 relative"
               title="快捷键: 3 (或右滑)"
             >
               <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-1 shadow-sm group-hover:shadow-md transition-all">
                 <Check size={20} strokeWidth={3} />
               </div>
               <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">认识</span>
             </button>

           </div>
        </div>
      </div>
    </div>
  );
};