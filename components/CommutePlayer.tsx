
import React, { useState, useEffect, useRef } from 'react';
import { Word } from '../types';
import { Play, Pause, SkipForward, SkipBack, X, Headphones, Minimize2, Maximize2, Volume2 } from 'lucide-react';

interface CommutePlayerProps {
  playlist: Word[];
  onClose: () => void;
}

export const CommutePlayer: React.FC<CommutePlayerProps> = ({ playlist, onClose }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const timeoutRef = useRef<any>(null);

  const currentWord = playlist[currentIndex];

  useEffect(() => {
    // Auto start when mounted
    if (playlist.length > 0) {
        playSequence(currentIndex);
    }
    return () => {
        window.speechSynthesis.cancel();
        clearTimeout(timeoutRef.current);
    };
  }, []);

  const speak = (text: string, lang: string = 'en-US', rate: number = 0.9): Promise<void> => {
    return new Promise((resolve) => {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = lang;
        u.rate = rate;
        u.onend = () => resolve();
        u.onerror = () => resolve(); // Fail safe
        utteranceRef.current = u;
        window.speechSynthesis.speak(u);
    });
  };

  const playSequence = async (index: number) => {
      if (index >= playlist.length) {
          setIsPlaying(false);
          return;
      }

      setIsPlaying(true);
      setCurrentIndex(index);
      const w = playlist[index];

      // 1. Speak Word (2 times)
      await speak(w.term, 'en-US', 0.8);
      await new Promise(r => setTimeout(r, 500));
      await speak(w.term, 'en-US', 0.8);
      
      // 2. Spell it out (Optional, skipping for flow)
      
      // 3. Definition (Try Chinese if supported, else English)
      await new Promise(r => setTimeout(r, 800));
      const def = w.meanings[0]?.definition || "No definition";
      // Detect if Chinese voice is likely available or just use browser default
      await speak(def, 'zh-CN', 1.0);

      // 4. Example
      await new Promise(r => setTimeout(r, 800));
      const ex = w.meanings[0]?.example;
      if (ex && ex.length < 100) { // Only short examples
          await speak(ex, 'en-US', 0.9);
      }

      // Wait before next
      timeoutRef.current = setTimeout(() => {
          playSequence(index + 1);
      }, 1500);
  };

  const togglePlay = () => {
      if (isPlaying) {
          window.speechSynthesis.cancel();
          clearTimeout(timeoutRef.current);
          setIsPlaying(false);
      } else {
          playSequence(currentIndex);
      }
  };

  const handleNext = () => {
      window.speechSynthesis.cancel();
      clearTimeout(timeoutRef.current);
      playSequence((currentIndex + 1) % playlist.length);
  };

  const handlePrev = () => {
      window.speechSynthesis.cancel();
      clearTimeout(timeoutRef.current);
      playSequence((currentIndex - 1 + playlist.length) % playlist.length);
  };

  if (!currentWord) return null;

  // Minimized View
  if (isMinimized) {
      return (
          <div className="fixed bottom-24 right-4 z-[60] bg-slate-900 dark:bg-black text-white p-3 rounded-full shadow-2xl flex items-center gap-3 border border-slate-700 animate-in slide-in-from-bottom-10">
              <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center animate-pulse-slow">
                  <Headphones size={20} />
              </div>
              <div className="flex flex-col w-24">
                  <span className="text-xs font-bold truncate">{currentWord.term}</span>
                  <span className="text-[10px] text-slate-400 truncate">{isPlaying ? 'Playing...' : 'Paused'}</span>
              </div>
              <button onClick={togglePlay} className="p-1 hover:text-indigo-400">
                  {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
              </button>
              <button onClick={() => setIsMinimized(false)} className="p-1 hover:text-indigo-400">
                  <Maximize2 size={16} />
              </button>
          </div>
      );
  }

  // Full Screen View
  return (
      <div className="fixed inset-0 z-[60] bg-slate-900/95 dark:bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center text-white animate-in fade-in slide-in-from-bottom-full duration-300">
          <button onClick={onClose} className="absolute top-6 left-6 p-2 bg-white/10 rounded-full hover:bg-white/20">
              <X size={24} />
          </button>
          <button onClick={() => setIsMinimized(true)} className="absolute top-6 right-6 p-2 bg-white/10 rounded-full hover:bg-white/20">
              <Minimize2 size={24} />
          </button>

          <div className="w-full max-w-sm px-8 flex flex-col items-center">
              {/* Album Art Placeholder */}
              <div className="w-64 h-64 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[2rem] shadow-2xl shadow-indigo-500/30 flex items-center justify-center mb-12 relative overflow-hidden group">
                   <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
                   <Headphones size={80} className={`text-white/80 transition-transform duration-700 ${isPlaying ? 'scale-110' : 'scale-100'}`} />
                   {isPlaying && (
                       <div className="absolute bottom-6 flex gap-1">
                           {[1,2,3,4,5].map(i => (
                               <div key={i} className="w-1 bg-white/60 rounded-full animate-music-bar" style={{ height: '20px', animationDelay: `${i * 0.1}s` }}></div>
                           ))}
                       </div>
                   )}
              </div>

              {/* Text Info */}
              <div className="text-center mb-12 space-y-2">
                  <h2 className="text-4xl font-black tracking-tight">{currentWord.term}</h2>
                  <p className="text-lg text-slate-400 font-medium">{currentWord.phonetic}</p>
                  <p className="text-sm text-slate-500 mt-2 line-clamp-1">{currentWord.meanings[0]?.definition}</p>
              </div>

              {/* Progress Bar (Fake for now) */}
              <div className="w-full h-1.5 bg-white/10 rounded-full mb-12 overflow-hidden">
                  <div className="h-full bg-indigo-500 w-1/3 animate-progress-indeterminate"></div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-10">
                  <button onClick={handlePrev} className="text-slate-400 hover:text-white transition-colors">
                      <SkipBack size={32} />
                  </button>
                  <button 
                    onClick={togglePlay}
                    className="w-20 h-20 bg-white text-slate-900 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/10"
                  >
                      {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
                  </button>
                  <button onClick={handleNext} className="text-slate-400 hover:text-white transition-colors">
                      <SkipForward size={32} />
                  </button>
              </div>
              
              <p className="mt-12 text-xs text-slate-600 font-medium uppercase tracking-widest">
                  Commute Mode • {currentIndex + 1} / {playlist.length}
              </p>
          </div>
      </div>
  );
};
