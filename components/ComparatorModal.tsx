
import React, { useEffect, useState } from 'react';
import { ComparatorResult } from '../types';
import { analyzeConfusion } from '../services/geminiService';
import { X, Loader2, GitCompare, AlertTriangle, ArrowRight } from 'lucide-react';

interface ComparatorModalProps {
  term: string;
  onClose: () => void;
  preloadedData?: ComparatorResult | null;
}

export const ComparatorModal: React.FC<ComparatorModalProps> = ({ term, onClose, preloadedData }) => {
  const [data, setData] = useState<ComparatorResult | null>(preloadedData || null);
  const [loading, setLoading] = useState(!preloadedData);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (preloadedData) return; // Skip if we have data
    
    analyzeConfusion(term)
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [term, preloadedData]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden border border-white/20 relative flex flex-col max-h-[85vh]">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 z-10">
          <X size={20} />
        </button>

        <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-slate-800 dark:to-slate-800 p-6 pb-8 border-b border-orange-100 dark:border-slate-700">
           <div className="flex items-center gap-3 mb-2">
               <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-xl flex items-center justify-center">
                   <GitCompare size={20} />
               </div>
               <h2 className="text-xl font-black text-slate-800 dark:text-white">易混词辨析</h2>
           </div>
           <p className="text-slate-500 dark:text-slate-400 text-sm pl-13">针对 <span className="font-bold text-slate-800 dark:text-white mx-1">{term}</span> 的精准打击</p>
        </div>

        <div className="flex-grow overflow-y-auto p-6">
           {loading ? (
               <div className="flex flex-col items-center justify-center h-48 space-y-4">
                   <Loader2 size={40} className="text-orange-500 animate-spin" />
                   <p className="text-slate-400 text-sm animate-pulse">AI 正在分析易混淆项...</p>
               </div>
           ) : error ? (
               <div className="text-center py-12 text-slate-400">分析失败，请重试</div>
           ) : data ? (
               <div className="space-y-6">
                   {/* Target Word Highlight */}
                   <div className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">
                       <AlertTriangle size={14} /> 核心对比
                   </div>
                   
                   <div className="space-y-4">
                       <div className="border-l-4 border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 pl-4 py-3 rounded-r-xl">
                           <div className="flex justify-between items-baseline mb-1">
                               <span className="text-lg font-black text-indigo-700 dark:text-indigo-400">{data.target}</span>
                               <span className="text-xs font-bold bg-white dark:bg-slate-700 px-2 py-0.5 rounded text-indigo-500 dark:text-indigo-300">核心词</span>
                           </div>
                           <p className="text-sm text-indigo-900 dark:text-indigo-200/80 leading-relaxed font-medium">
                               {data.summary}
                           </p>
                       </div>

                       {data.confusingWords.map((word, idx) => (
                           <div key={idx} className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl p-4 shadow-sm">
                               <div className="flex items-baseline justify-between mb-2">
                                   <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{word.term}</h3>
                                   <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{word.definition}</span>
                               </div>
                               <div className="space-y-2">
                                   <div className="flex gap-2 text-sm">
                                       <span className="shrink-0 font-bold text-orange-500 text-xs uppercase mt-0.5 border border-orange-200 px-1 rounded h-fit">辨析</span>
                                       <p className="text-slate-600 dark:text-slate-300 leading-snug">{word.difference}</p>
                                   </div>
                                   <div className="flex gap-2 text-sm bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg italic text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-800">
                                       <span className="shrink-0 not-italic">📝</span>
                                       "{word.example}"
                                   </div>
                               </div>
                           </div>
                       ))}
                   </div>
               </div>
           ) : null}
        </div>
      </div>
    </div>
  );
};
