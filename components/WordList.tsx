
import React, { useState } from 'react';
import { Word, WordStatus } from '../types';
import { Trash2, Volume2, BrainCircuit, Clock, Search, Loader2, Sparkles, ArrowRight, Book, ChevronRight, Headphones } from 'lucide-react';

interface WordListProps {
  words: Word[];
  onDelete: (id: string) => void;
  onEnrich: (word: Word) => void;
  onImport: (terms: string[]) => void;
  onLookup: (term: string) => void;
  onSelectWord: (word: Word) => void;
  onPlayCommute: (words: Word[]) => void; // New prop for playing
  isEnriching: boolean;
  searchTerm: string;
}

export const WordList: React.FC<WordListProps> = ({ words, onDelete, onEnrich, onLookup, onSelectWord, onPlayCommute, isEnriching, searchTerm }) => {
  const [statusFilter, setStatusFilter] = useState<WordStatus | 'all'>('all');

  const filteredWords = words.filter(w => {
    const matchesText = w.term.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || w.status === statusFilter;
    return matchesText && matchesStatus;
  });

  const playAudio = (text: string) => {
    const u = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.name.includes("Google US English")) || 
                           voices.find(v => v.name.includes("Microsoft Zira")) ||
                           voices.find(v => v.lang === 'en-US');
    if (preferredVoice) u.voice = preferredVoice;
    
    window.speechSynthesis.speak(u);
  };

  const formatNextReview = (timestamp: number) => {
    const diff = timestamp - Date.now();
    if (diff <= 0) return 'Review Now';
    if (diff < 60 * 60 * 1000) return Math.ceil(diff / (60 * 1000)) + 'm';
    if (diff < 24 * 60 * 60 * 1000) return Math.ceil(diff / (60 * 60 * 1000)) + 'h';
    return Math.ceil(diff / (24 * 60 * 60 * 1000)) + 'd';
  };

  const getDefinitionDisplay = (word: Word) => {
    if ((!word.meanings || word.meanings.length === 0)) {
        return (
            <span className="flex items-center gap-2 text-indigo-500 text-xs animate-pulse font-medium">
                <Loader2 size={12} className="animate-spin" />
                AI 正在生成考研释义...
            </span>
        );
    }
    const first = word.meanings[0];
    return (
      <span>
        <span className="font-mono text-xs font-bold text-indigo-500 dark:text-indigo-400 mr-1">{first.partOfSpeech}</span>
        <span className="text-slate-600 dark:text-slate-300">{first.definition}</span>
        {word.meanings.length > 1 && <span className="text-slate-400 text-xs ml-1">+{word.meanings.length - 1}</span>}
      </span>
    );
  };

  const getExampleDisplay = (word: Word) => {
    if (!word.meanings || word.meanings.length === 0) return "";
    return word.meanings[0].example;
  };

  return (
    <div className="relative h-full">
      {/* Background for List Mode */}
      <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/50 dark:border-slate-800 rounded-3xl m-2 pointer-events-none"></div>

      {/* Toolbar - Absolutely positioned below App Header space */}
      <div className="absolute top-0 left-0 right-0 z-20 pt-28 pb-4 px-6 bg-gradient-to-b from-slate-50 via-slate-50 to-transparent dark:from-black dark:via-black dark:to-transparent pointer-events-none">
        <div className="pointer-events-auto flex items-center justify-between gap-4 p-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm">
           <div className="flex gap-2 overflow-x-auto no-scrollbar p-1">
             {(['all', WordStatus.New, WordStatus.Learning, WordStatus.Mastered] as const).map((s) => (
               <button
                 key={s}
                 onClick={() => setStatusFilter(s)}
                 className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                   statusFilter === s 
                     ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white' 
                     : 'bg-transparent text-slate-500 dark:text-slate-400 border-transparent hover:bg-slate-100 dark:hover:bg-slate-700'
                 }`}
               >
                 {s === 'all' ? '全部' : s === WordStatus.New ? '新词' : s === WordStatus.Learning ? '学习中' : '已掌握'}
               </button>
             ))}
           </div>
           
           {/* Commute Button (Play Filtered) */}
           {filteredWords.length > 0 && (
               <button 
                  onClick={() => onPlayCommute(filteredWords)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:scale-110 transition-transform shrink-0 mr-1"
                  title="Play Audio"
               >
                   <Headphones size={16} />
               </button>
           )}
        </div>
      </div>

      {/* List Content - Full height scrollable with top padding */}
      <div className="h-full overflow-y-auto no-scrollbar pt-48 px-4 pb-32">
        {filteredWords.length === 0 ? (
           <div className="flex flex-col items-center justify-center h-64 text-slate-400">
             <Search size={48} className="opacity-20 mb-4" />
             <p className="mb-4 font-medium">本地词库未找到 "{searchTerm}"</p>
             {searchTerm && (
                 <button 
                    onClick={() => onLookup(searchTerm)}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold shadow-xl shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 hover:scale-[1.02] hover:shadow-2xl transition-all flex items-center gap-2 group animate-in fade-in zoom-in duration-300"
                 >
                    <Book size={18} className="group-hover:fill-white transition-colors" />
                    查阅字典 "{searchTerm}"
                    <ArrowRight size={16} className="opacity-60" />
                 </button>
             )}
           </div>
        ) : (
          <div className="space-y-3">
          {filteredWords.map(word => (
            <div 
              key={word.id} 
              onClick={() => onSelectWord(word)}
              className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md hover:border-indigo-100 dark:hover:border-indigo-900 transition-all group relative overflow-hidden cursor-pointer"
            >
              <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                word.status === WordStatus.Mastered ? 'bg-emerald-400' : 
                word.status === WordStatus.Learning ? 'bg-amber-400' : 'bg-indigo-400'
              }`}></div>

              <div className="flex items-start justify-between gap-4 pl-2">
                <div className="flex-grow min-w-0">
                  <div className="flex items-baseline gap-2 mb-1">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{word.term}</h3>
                    {word.phonetic ? (
                        <span className="text-sm font-mono text-slate-400">{word.phonetic}</span>
                    ) : (
                        <div className="h-4 w-12 bg-slate-100 dark:bg-slate-700 rounded animate-pulse"></div>
                    )}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-300 line-clamp-1 mb-1 font-medium h-6 flex items-center">
                    {getDefinitionDisplay(word)}
                  </div>
                  {word.meanings && word.meanings.length > 0 ? (
                      <p className="text-xs text-slate-400 line-clamp-1 opacity-80 italic">"{getExampleDisplay(word)}"</p>
                  ) : (
                      <div className="h-3 w-3/4 bg-slate-50 dark:bg-slate-700 rounded animate-pulse mt-1"></div>
                  )}
                </div>

                <div className="flex flex-col items-end gap-3">
                   <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${
                     word.status === WordStatus.Mastered ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800' :
                     word.status === WordStatus.Learning ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-800' :
                     'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-800'
                   }`}>
                     {word.status === WordStatus.New ? '新词' : word.status === WordStatus.Learning ? '学习中' : '已掌握'}
                   </span>
                   {word.examSource ? (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-md border border-amber-100 dark:border-amber-900">
                            <span>真题</span>
                        </div>
                   ) : (
                        <div className="flex items-center gap-1 text-[10px] font-medium text-slate-400 bg-slate-50 dark:bg-slate-700 px-2 py-1 rounded-md">
                            <Clock size={10} />
                            {formatNextReview(word.nextReview)}
                        </div>
                   )}
                </div>
              </div>

              <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity translate-x-4 group-hover:translate-x-0 duration-300">
                  <ChevronRight className="text-indigo-200 dark:text-indigo-800" />
              </div>

              <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-50 dark:border-slate-700 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                <button 
                    onClick={(e) => { e.stopPropagation(); playAudio(word.term); }} 
                    className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/50 rounded-lg transition-colors" title="发音">
                  <Volume2 size={16} />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); onEnrich(word); }} 
                  disabled={isEnriching}
                  className="p-2 text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/50 rounded-lg transition-colors disabled:opacity-50"
                  title="AI 重新生成"
                >
                  <BrainCircuit size={16} className={isEnriching ? "animate-pulse" : ""} />
                </button>
                <button 
                    onClick={(e) => { e.stopPropagation(); onDelete(word.id); }} 
                    className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/50 rounded-lg transition-colors" title="删除">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
          </div>
        )}
      </div>
    </div>
  );
};