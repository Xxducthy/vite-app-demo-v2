
import React, { useEffect, useState } from 'react';
import { EtymologyResult } from '../types';
import { analyzeEtymology } from '../services/geminiService';
import { X, Loader2, Network, Sprout, ArrowRight } from 'lucide-react';

interface EtymologyModalProps {
  term: string;
  onClose: () => void;
}

export const EtymologyModal: React.FC<EtymologyModalProps> = ({ term, onClose }) => {
  const [data, setData] = useState<EtymologyResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    analyzeEtymology(term)
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [term]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden border border-white/20 relative flex flex-col max-h-[85vh]">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 z-10">
          <X size={20} />
        </button>

        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-slate-800 dark:to-slate-800 p-6 pb-8 border-b border-emerald-100 dark:border-slate-700">
           <div className="flex items-center gap-3 mb-2">
               <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center">
                   <Sprout size={20} />
               </div>
               <h2 className="text-xl font-black text-slate-800 dark:text-white">词源拆解</h2>
           </div>
           <p className="text-slate-500 dark:text-slate-400 text-sm pl-13">科学记忆 <span className="font-bold text-slate-800 dark:text-white mx-1">{term}</span> 的基因密码</p>
        </div>

        <div className="flex-grow overflow-y-auto p-6">
           {loading ? (
               <div className="flex flex-col items-center justify-center h-48 space-y-4">
                   <Loader2 size={40} className="text-emerald-500 animate-spin" />
                   <p className="text-slate-400 text-sm animate-pulse">AI 正在溯源...</p>
               </div>
           ) : error ? (
               <div className="text-center py-12 text-slate-400">分析失败，请重试</div>
           ) : data ? (
               <div className="space-y-8">
                   
                   {/* Breakdown Visualizer */}
                   <div className="flex items-center justify-center gap-1 flex-wrap">
                       {data.breakdown.map((part, i) => (
                           <React.Fragment key={i}>
                               <div className="flex flex-col items-center gap-1 group cursor-default">
                                   <div className={`px-3 py-1.5 rounded-lg border-2 font-bold font-mono text-lg shadow-sm transition-transform group-hover:-translate-y-1 ${
                                       part.type === 'root' 
                                       ? 'bg-emerald-100 border-emerald-200 text-emerald-700 dark:bg-emerald-900/40 dark:border-emerald-700 dark:text-emerald-300' 
                                       : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
                                   }`}>
                                       {part.part}
                                   </div>
                                   <div className="text-[10px] uppercase font-bold text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                       {part.meaning}
                                   </div>
                               </div>
                               {i < data.breakdown.length - 1 && <div className="w-4 h-0.5 bg-slate-200 dark:bg-slate-700 mb-4"></div>}
                           </React.Fragment>
                       ))}
                   </div>

                   {/* Core Root Info */}
                   <div className="bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-800/50 text-center">
                       <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-widest mb-1">核心词根</p>
                       <p className="text-lg font-bold text-slate-800 dark:text-white mb-1">{data.root}</p>
                       <p className="text-sm text-slate-500 dark:text-slate-400 italic">" {data.rootMeaning} "</p>
                   </div>

                   {/* Cognates Tree */}
                   <div>
                       <div className="flex items-center gap-2 mb-4 text-sm font-bold text-slate-400 uppercase tracking-wider">
                           <Network size={14} /> 同根词家族
                       </div>
                       <div className="grid grid-cols-2 gap-3">
                           {data.cognates.map((item, idx) => (
                               <div key={idx} className="flex flex-col p-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl hover:border-emerald-200 dark:hover:border-emerald-800 transition-colors cursor-default">
                                   <div className="flex items-center gap-2 mb-1">
                                       <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></div>
                                       <span className="font-bold text-slate-700 dark:text-slate-200">{item.term}</span>
                                   </div>
                                   <span className="text-xs text-slate-500 dark:text-slate-400 pl-3.5">{item.definition}</span>
                               </div>
                           ))}
                       </div>
                   </div>

               </div>
           ) : null}
        </div>
      </div>
    </div>
  );
};