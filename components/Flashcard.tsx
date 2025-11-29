
import React, { useState, useEffect, useRef } from 'react';
import { Word, WordStatus, StudyMode, ComparatorResult, EtymologyResult } from '../types';
import { Volume2, Check, X, Repeat, Lightbulb, RefreshCw, Trophy, ArrowRight, Eye, CheckCircle2, GitCompare, Sprout, Activity } from 'lucide-react';
import { ComparatorModal } from './ComparatorModal';
import { EtymologyModal } from './EtymologyModal';
import { WordStats } from './WordStats';

interface FlashcardProps {
  word: Word;
  onStatusChange: (id: string, status: WordStatus) => void;
  onNext: () => void;
  sessionAttempts: number; 
  learningStreak?: number;
  mode: StudyMode;
  extraData?: { comparator?: ComparatorResult, etymology?: EtymologyResult };
}

export const Flashcard: React.FC<FlashcardProps> = ({ word, onStatusChange, onNext, sessionAttempts, learningStreak, mode, extraData }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [touchStart, setTouchStart] = useState<{x: number, y: number} | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [spellingResult, setSpellingResult] = useState<'correct' | 'incorrect' | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Modals inside Flashcard
  const [showComparator, setShowComparator] = useState(false);
  const [showEtymology, setShowEtymology] = useState(false);
  const [showStats, setShowStats] = useState(false);

  useEffect(() => {
    setIsFlipped(false); setSwipeOffset(0); setInputValue(''); setSpellingResult(null);
    if (mode === 'spelling' && inputRef.current) setTimeout(() => inputRef.current?.focus(), 100);
  }, [word.id, mode]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (mode === 'flashcard' && e.code === 'Space') { e.preventDefault(); setIsFlipped(prev => !prev); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode]);

  const speakText = (text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US'; utterance.rate = 0.9;
    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const handleAction = (status: WordStatus) => { onStatusChange(word.id, status); onNext(); };

  const handleSpellingSubmit = (e: React.FormEvent) => {
      e.preventDefault(); if (spellingResult !== null) return;
      const input = inputValue.trim().toLowerCase(); const target = word.term.toLowerCase();
      if (input === target) { setSpellingResult('correct'); speakText(word.term); setTimeout(() => handleAction(WordStatus.Mastered), 1000); } 
      else { setSpellingResult('incorrect'); }
  };

  const handleTouchStart = (e: React.TouchEvent) => { 
      if (mode === 'spelling') return; 
      setTouchStart({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY }); 
  };

  const handleTouchMove = (e: React.TouchEvent) => { 
      if (mode === 'spelling' || !touchStart) return; 
      
      const currentX = e.targetTouches[0].clientX; 
      const currentY = e.targetTouches[0].clientY;
      const deltaX = currentX - touchStart.x; 
      const deltaY = currentY - touchStart.y;

      // Vertical scroll detection: If moving mostly vertically, let browser handle scroll
      if (Math.abs(deltaY) > Math.abs(deltaX)) {
          return;
      }

      if (Math.abs(deltaX) > 20) setSwipeOffset(deltaX); 
  };

  const handleTouchEnd = () => { if (!touchStart || mode === 'spelling') return; const threshold = 100; if (swipeOffset > threshold) handleAction(WordStatus.Mastered); else if (swipeOffset < -threshold) handleAction(WordStatus.New); setSwipeOffset(0); setTouchStart(null); };
  const rotateDeg = swipeOffset * 0.05;

  const StatusBadge = () => (
    <div className="absolute top-6 left-6 flex items-center gap-3 z-20">
        {sessionAttempts > 0 && <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-50/80 dark:bg-slate-800/80 backdrop-blur border border-slate-100 dark:border-slate-700 rounded-lg text-slate-400 dark:text-slate-500"><RefreshCw size={10} /><span className="text-[10px] font-bold font-mono">{sessionAttempts + 1}</span></div>}
        {learningStreak !== undefined && <div className="flex items-center gap-1 px-2 py-1 bg-slate-50/80 dark:bg-slate-800/80 backdrop-blur border border-slate-100 dark:border-slate-700 rounded-lg"><Trophy size={10} className={learningStreak > 0 ? "text-amber-500" : "text-slate-300 dark:text-slate-600"} /><div className="flex gap-0.5 ml-1">{[...Array(3)].map((_, i) => <div key={i} className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${i < learningStreak ? 'bg-amber-400' : 'bg-slate-200 dark:bg-slate-700'}`}></div>)}</div></div>}
    </div>
  );

  if (mode === 'spelling') {
      const maskedMeanings = word.meanings.map(m => ({ ...m, example: m.example.replace(new RegExp(word.term, 'gi'), '_____') }));
      return (
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-xl dark:shadow-none border border-slate-100 dark:border-slate-800 flex flex-col overflow-hidden relative min-h-[500px]">
              <StatusBadge />
              <div className="absolute top-6 right-6 z-20"><span className="text-[10px] font-bold uppercase text-slate-400 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 rounded-full border border-slate-100 dark:border-slate-700">Spelling</span></div>
              <div className="p-8 pt-16 flex-grow flex flex-col gap-6">
                  <div className="flex justify-center"><button onClick={() => speakText(word.term)} className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 hover:scale-105 transition-all shadow-sm"><Volume2 size={32} /></button></div>
                  <div className="space-y-4">{maskedMeanings.slice(0, 2).map((m, idx) => (<div key={idx} className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700"><div className="flex items-baseline gap-2 mb-2"><span className="text-xs font-bold text-indigo-500 dark:text-indigo-400 bg-white dark:bg-slate-700 px-1.5 py-0.5 rounded border border-indigo-100 dark:border-indigo-800">{m.partOfSpeech}</span><span className="font-bold text-slate-700 dark:text-slate-200">{m.definition}</span></div><p className="text-sm text-slate-500 dark:text-slate-400 italic font-serif">"{m.example}"</p></div>))}</div>
              </div>
              <div className={`p-6 border-t ${spellingResult === 'correct' ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800' : spellingResult === 'incorrect' ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-800' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800'}`}>
                  <form onSubmit={handleSpellingSubmit} className="relative">
                      <input ref={inputRef} type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="Type the word..." disabled={spellingResult !== null} autoComplete="off" autoCorrect="off" autoCapitalize="off" className={`w-full p-4 text-center text-xl font-bold rounded-xl border-2 outline-none transition-all ${spellingResult === 'correct' ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-800' : spellingResult === 'incorrect' ? 'border-rose-500 text-rose-600 dark:text-rose-400 bg-white dark:bg-slate-800' : 'border-slate-200 dark:border-slate-700 focus:border-indigo-500 dark:focus:border-indigo-500 text-slate-800 dark:text-white bg-white dark:bg-slate-800'}`} />
                      {spellingResult === null && inputValue.length > 0 && (<button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"><ArrowRight size={20} /></button>)}
                  </form>
                  {spellingResult === 'incorrect' && (<div className="mt-4 text-center animate-in fade-in slide-in-from-top-2"><p className="text-xs font-bold text-rose-400 uppercase mb-1">Correct Answer</p><p className="text-2xl font-black text-rose-600 dark:text-rose-400 mb-4">{word.term}</p><button onClick={() => handleAction(WordStatus.New)} className="w-full py-3 bg-rose-600 text-white rounded-xl font-bold shadow-lg hover:bg-rose-700 active:scale-95 transition-all">Continue</button></div>)}
                  {spellingResult === 'correct' && (<div className="mt-4 text-center animate-in fade-in slide-in-from-top-2"><div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold"><CheckCircle2 size={20} /> Correct!</div></div>)}
              </div>
          </div>
      );
  }

  // --- FLASHCARD MODE ---
  return (
    <>
    {showComparator && <ComparatorModal term={word.term} onClose={() => setShowComparator(false)} preloadedData={extraData?.comparator} />}
    {showEtymology && <EtymologyModal term={word.term} onClose={() => setShowEtymology(false)} preloadedData={extraData?.etymology} />}
    
    {/* Stats Modal */}
    {showStats && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in" onClick={() => setShowStats(false)}>
            <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                <WordStats word={word} />
                <button onClick={() => setShowStats(false)} className="w-full mt-4 py-3 bg-white dark:bg-slate-800 text-slate-500 font-bold rounded-xl">关闭</button>
            </div>
        </div>
    )}

    <div className="w-full max-w-lg aspect-[3/4] md:aspect-[16/10] relative cursor-pointer group perspective-1000">
      <div className={`absolute top-1/2 left-0 -translate-y-1/2 -translate-x-full z-0 transition-opacity duration-300 ${swipeOffset > 50 ? 'opacity-100' : 'opacity-0'}`}><div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm"><Check size={24} strokeWidth={3} /></div></div>
      <div className={`absolute top-1/2 right-0 -translate-y-1/2 translate-x-full z-0 transition-opacity duration-300 ${swipeOffset < -50 ? 'opacity-100' : 'opacity-0'}`}><div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 shadow-sm"><X size={24} strokeWidth={3} /></div></div>

      <div className="w-full h-full transition-transform duration-300 ease-out" style={{ transform: `translate3d(${swipeOffset}px, 0, 0) rotate(${rotateDeg}deg)`, cursor: swipeOffset !== 0 ? 'grabbing' : 'pointer' }} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} onClick={() => setIsFlipped(!isFlipped)}>
        <div className="relative w-full h-full transition-transform duration-500 transform-style-3d origin-center" style={{ transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}>
            
            {/* FRONT */}
            <div className="absolute inset-0 w-full h-full backface-hidden bg-white dark:bg-slate-900 rounded-3xl shadow-[0_15px_40px_-10px_rgba(0,0,0,0.08)] dark:shadow-none border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center p-8 overflow-hidden z-10 transition-colors">
                <div className="absolute top-0 left-8 right-8 h-1 bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 rounded-b-full opacity-60"></div>
                <StatusBadge />
                <div className="absolute top-6 right-6 z-20"><span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-slate-50/80 dark:bg-slate-800 px-2.5 py-1 rounded-full border border-slate-100 dark:border-slate-700 backdrop-blur-sm">{word.tags.includes('高频') ? 'Core' : 'Word'}</span></div>
                <div className="flex flex-col items-center text-center z-10 gap-5 w-full">
                    <h2 className="text-4xl md:text-6xl font-bold text-slate-800 dark:text-white tracking-tight leading-tight select-none">{word.term}</h2>
                    {word.phonetic && (<button onClick={(e) => { e.stopPropagation(); speakText(word.term); }} className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-full transition-all active:scale-95 group/audio border border-slate-100 dark:border-slate-800"><span className="text-base font-mono opacity-80 font-medium">{word.phonetic}</span><Volume2 size={16} className="group-hover/audio:animate-pulse" /></button>)}
                </div>
                <div className="absolute bottom-8 w-full px-10 flex justify-between items-end text-slate-300 dark:text-slate-600 opacity-0 md:opacity-100 transition-opacity">
                    <div className="flex flex-col items-center gap-1 hover:text-rose-400 transition-colors"><div className="w-8 h-8 rounded-full border-2 border-current flex items-center justify-center"><X size={14} strokeWidth={3} /></div></div>
                    <div className="flex flex-col items-center gap-1 animate-pulse text-indigo-200 dark:text-slate-700"><span className="text-[10px] font-bold uppercase tracking-[0.2em]">Click to Flip</span></div>
                    <div className="flex flex-col items-center gap-1 hover:text-emerald-400 transition-colors"><div className="w-8 h-8 rounded-full border-2 border-current flex items-center justify-center"><Check size={14} strokeWidth={3} /></div></div>
                </div>
            </div>

            {/* BACK */}
            <div className="absolute inset-0 w-full h-full backface-hidden bg-white dark:bg-slate-900 rounded-3xl shadow-[0_15px_40px_-10px_rgba(0,0,0,0.08)] dark:shadow-none border border-slate-100 dark:border-slate-800 flex flex-col overflow-hidden transition-colors" style={{ transform: 'rotateY(180deg)' }}>
                <StatusBadge />
                <div className="flex justify-between items-center px-6 py-4 pt-16 border-b border-slate-50 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm z-10">
                    <div className="flex flex-col"><h3 className="text-xl font-bold text-slate-800 dark:text-white">{word.term}</h3>{word.examSource && (<span className="text-[10px] font-bold text-amber-600/80 dark:text-amber-500 tracking-wide mt-0.5">{word.examSource}</span>)}</div>
                    
                    {/* Quick Action Buttons */}
                    <div className="flex gap-2">
                        <button onClick={(e) => { e.stopPropagation(); setShowStats(true); }} className="w-8 h-8 flex items-center justify-center bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-full hover:scale-110 transition-transform" title="记忆曲线"><Activity size={14} /></button>
                        <button onClick={(e) => { e.stopPropagation(); setShowComparator(true); }} className="w-8 h-8 flex items-center justify-center bg-orange-50 dark:bg-orange-900/20 text-orange-500 rounded-full hover:scale-110 transition-transform" title="辨析"><GitCompare size={14} /></button>
                        <button onClick={(e) => { e.stopPropagation(); setShowEtymology(true); }} className="w-8 h-8 flex items-center justify-center bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 rounded-full hover:scale-110 transition-transform" title="词源"><Sprout size={14} /></button>
                        <button onClick={(e) => { e.stopPropagation(); speakText(word.term); }} className="w-8 h-8 flex items-center justify-center bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-full transition-colors"><Volume2 size={16} /></button>
                    </div>
                </div>

                <div className="flex-grow overflow-y-auto no-scrollbar p-6 space-y-5 bg-gradient-to-b from-white to-slate-50/30 dark:from-slate-900 dark:to-slate-900/50" style={{ touchAction: 'pan-y' }}>
                    {word.meanings.map((meaning, idx) => (
                    <div key={idx} className="relative group/item">
                        <div className="flex items-baseline gap-2 mb-2"><span className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded border border-indigo-100/50 dark:border-indigo-800 font-mono">{meaning.partOfSpeech}</span><p className="text-base font-bold text-slate-800 dark:text-slate-200">{meaning.definition}</p></div>
                        <div className="pl-3 border-l-2 border-slate-100 dark:border-slate-800 group-hover/item:border-indigo-200 dark:group-hover/item:border-indigo-800 transition-colors"><p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed italic font-serif">"{meaning.example}"</p><div className="flex items-center justify-between mt-1"><p className="text-xs text-slate-400 dark:text-slate-500 font-light">{meaning.translation}</p></div></div>
                    </div>
                    ))}
                    {word.mnemonic && (<div className="bg-indigo-50/60 dark:bg-indigo-900/20 rounded-xl p-3 border border-indigo-100/60 dark:border-indigo-800"><div className="flex gap-2 items-start"><Lightbulb size={14} className="text-indigo-500 dark:text-indigo-400 mt-0.5 shrink-0" /><p className="text-xs font-medium text-indigo-800/90 dark:text-indigo-300 leading-relaxed">{word.mnemonic}</p></div></div>)}
                    <div className="h-2"></div>
                </div>

                <div className="px-6 py-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 grid grid-cols-3 gap-3 z-20">
                    <button onClick={(e) => { e.stopPropagation(); handleAction(WordStatus.New); }} className="flex flex-col items-center justify-center py-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors active:scale-95 group"><X size={20} className="text-rose-300 dark:text-rose-800 group-hover:text-rose-500 dark:group-hover:text-rose-500 mb-1 transition-colors" /><span className="text-[10px] font-bold text-rose-300 dark:text-rose-800 group-hover:text-rose-500 dark:group-hover:text-rose-500 uppercase">Forget</span></button>
                    <button onClick={(e) => { e.stopPropagation(); handleAction(WordStatus.Learning); }} className="flex flex-col items-center justify-center py-2 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors active:scale-95 group"><Repeat size={20} className="text-amber-300 dark:text-amber-800 group-hover:text-amber-500 dark:group-hover:text-amber-500 mb-1 transition-colors" /><span className="text-[10px] font-bold text-amber-300 dark:text-amber-800 group-hover:text-amber-500 dark:group-hover:text-amber-500 uppercase">Blurry</span></button>
                    <button onClick={(e) => { e.stopPropagation(); handleAction(WordStatus.Mastered); }} className="flex flex-col items-center justify-center py-2 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors active:scale-95 group"><Check size={20} className="text-emerald-300 dark:text-emerald-800 group-hover:text-emerald-500 dark:group-hover:text-emerald-500 mb-1 transition-colors" /><span className="text-[10px] font-bold text-emerald-300 dark:text-emerald-800 group-hover:text-emerald-500 dark:group-hover:text-emerald-500 uppercase">Master</span></button>
                </div>
            </div>
        </div>
      </div>
    </div>
    </>
  );
};
