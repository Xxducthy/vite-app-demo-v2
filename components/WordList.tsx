
import React, { useState } from 'react';
import { Word, WordStatus } from '../types';
import { Trash2, Volume2, BrainCircuit, Clock, Search, Loader2, Sparkles, ArrowRight, Book, ChevronRight } from 'lucide-react';

interface WordListProps {
  words: Word[];
  onDelete: (id: string) => void;
  onEnrich: (word: Word) => void;
  onImport: (terms: string[]) => void;
  onLookup: (term: string) => void;
  onSelectWord: (word: Word) => void; // New prop
  isEnriching: boolean;
  searchTerm: string;
}

export const WordList: React.FC<WordListProps> = ({ words, onDelete, onEnrich, onLookup, onSelectWord, isEnriching, searchTerm }) => {
  const [statusFilter, setStatusFilter] = useState<WordStatus | 'all'>('all');

  const filteredWords = words.filter(w => {
    const matchesText = w.term.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || w.status === statusFilter;
    return matchesText && matchesStatus;
  });

  const playAudio = (text: string) => {
    const u = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(u);
  };

  const formatNextReview = (timestamp: number) => {
    const diff = timestamp - Date.now();
    if (diff <= 0) return 'Review Now';
    if (diff < 60 * 60 * 1000) return Math.ceil(diff / (60 * 1000)) + 'm';
    if (diff < 24 * 60 * 60 * 1000) return Math.ceil(diff / (60 * 60 * 1000)) + 'h';
    return Math.ceil(diff / (24 * 60 * 60 * 1000)) + 'd';
  };

  // Helper to get a display string for definitions
  const getDefinitionDisplay = (word: Word) => {
    // If no meanings and it's likely a new import (no phonetic either usually implies pending AI)
    if ((!word.meanings || word.meanings.length === 0)) {
        return (
            <span className="flex items-center gap-2 text-indigo-500 text-xs animate-pulse font-medium">
                <Loader2 size={12} className="animate-spin" />
                AI 正在生成考研释义...
            </span>
        );
    }
    
    // Show first definition with part of speech
    const first = word.meanings[0];
    return (
      <span>
        <span className="font-mono text-xs font-bold text-indigo-500 mr-1">{first.partOfSpeech}</span>
        {first.definition}
        {word.meanings.length > 1 && <span className="text-slate-400 text-xs ml-1">+{word.meanings.length - 1}</span>}
      </span>
    );
  };

  const getExampleDisplay = (word: Word) => {
    if (!word.meanings || word.meanings.length === 0) return "";
    return word.meanings[0].example;
  };

  return (
    <div className="flex flex-col h-full bg-white/50">
      
      {/* Toolbar */}
      <div className="p-4 border-b border-slate-100 bg-white/80 backdrop-blur sticky top-0 z-20">
        <div className="flex items-center justify-between gap-4">
           <div className="flex gap-2 overflow-x-auto no-scrollbar">
             {(['all', WordStatus.New, WordStatus.Learning, WordStatus.Mastered] as const).map((s) => (
               <button
                 key={s}
                 onClick={() => setStatusFilter(s)}
                 className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                   statusFilter === s 
                     ? 'bg-slate-900 text-white border-slate-900' 
                     : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                 }`}
               >
                 {s === 'all' ? '全部' : s === WordStatus.New ? '新词' : s === WordStatus.Learning ? '学习中' : '已掌握'}
               </button>
             ))}
           </div>
           <div className="text-xs text-slate-400 font-medium shrink-0 px-2">
              {filteredWords.length} 个单词
           </div>
        </div>
      </div>

      {/* List Content */}
      <div className="flex-grow overflow-y-auto no-scrollbar p-4 space-y-3 pb-24">
        {filteredWords.length === 0 ? (
           <div className="flex flex-col items-center justify-center h-64 text-slate-400">
             <Search size={48} className="opacity-20 mb-4" />
             <p className="mb-4 font-medium">本地词库未找到 "{searchTerm}"</p>
             
             {searchTerm && (
                 <button 
                    onClick={() => onLookup(searchTerm)}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold shadow-xl shadow-indigo-200 hover:bg-indigo-700 hover:scale-[1.02] hover:shadow-2xl transition-all flex items-center gap-2 group animate-in fade-in zoom-in duration-300"
                 >
                    <Book size={18} className="group-hover:fill-white transition-colors" />
                    查阅字典 "{searchTerm}"
                    <ArrowRight size={16} className="opacity-60" />
                 </button>
             )}
           </div>
        ) : (
          filteredWords.map(word => (
            <div 
              key={word.id} 
              onClick={() => onSelectWord(word)}
              className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md hover:border-indigo-100 transition-all group relative overflow-hidden cursor-pointer"
            >
              
              {/* Status Indicator Line */}
              <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                word.status === WordStatus.Mastered ? 'bg-emerald-400' : 
                word.status === WordStatus.Learning ? 'bg-amber-400' : 'bg-indigo-400'
              }`}></div>

              <div className="flex items-start justify-between gap-4 pl-2">
                <div className="flex-grow min-w-0">
                  <div className="flex items-baseline gap-2 mb-1">
                    <h3 className="text-xl font-bold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">{word.term}</h3>
                    {word.phonetic ? (
                        <span className="text-sm font-mono text-slate-400">{word.phonetic}</span>
                    ) : (
                        <div className="h-4 w-12 bg-slate-100 rounded animate-pulse"></div>
                    )}
                  </div>
                  <div className="text-sm text-slate-600 line-clamp-1 mb-1 font-medium h-6 flex items-center">
                    {getDefinitionDisplay(word)}
                  </div>
                  {word.meanings && word.meanings.length > 0 ? (
                      <p className="text-xs text-slate-400 line-clamp-1 opacity-80 italic">"{getExampleDisplay(word)}"</p>
                  ) : (
                      <div className="h-3 w-3/4 bg-slate-50 rounded animate-pulse mt-1"></div>
                  )}
                </div>

                <div className="flex flex-col items-end gap-3">
                   <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${
                     word.status === WordStatus.Mastered ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                     word.status === WordStatus.Learning ? 'bg-amber-50 text-amber-600 border-amber-100' :
                     'bg-indigo-50 text-indigo-600 border-indigo-100'
                   }`}>
                     {word.status === WordStatus.New ? '新词' : word.status === WordStatus.Learning ? '学习中' : '已掌握'}
                   </span>
                   
                   {word.examSource ? (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-100">
                            <span>真题</span>
                        </div>
                   ) : (
                        <div className="flex items-center gap-1 text-[10px] font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded-md">
                            <Clock size={10} />
                            {formatNextReview(word.nextReview)}
                        </div>
                   )}
                </div>
              </div>

              {/* Click Hint */}
              <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity translate-x-4 group-hover:translate-x-0 duration-300">
                  <ChevronRight className="text-indigo-200" />
              </div>

              {/* Hover Actions (Stop Propagation to prevent opening detail when clicking action) */}
              <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-50 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                <button 
                    onClick={(e) => { e.stopPropagation(); playAudio(word.term); }} 
                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="发音">
                  <Volume2 size={16} />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); onEnrich(word); }} 
                  disabled={isEnriching}
                  className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-50"
                  title="AI 重新生成"
                >
                  <BrainCircuit size={16} className={isEnriching ? "animate-pulse" : ""} />
                </button>
                <button 
                    onClick={(e) => { e.stopPropagation(); onDelete(word.id); }} 
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="删除">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
