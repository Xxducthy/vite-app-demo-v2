
import React from 'react';
import { Play, CheckCircle2, Coffee, ArrowRight, Layers } from 'lucide-react';

interface StudySessionProps {
  totalDue: number;
  onStartSession: (count: number) => void;
  onExit: () => void;
  // For Summary View
  isFinished?: boolean;
  onContinue?: () => void;
}

export const StudySession: React.FC<StudySessionProps> = ({ 
  totalDue, 
  onStartSession, 
  onExit,
  isFinished,
  onContinue 
}) => {
  
  // --- SESSION COMPLETE VIEW ---
  if (isFinished) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in duration-300">
        <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-emerald-100">
           <CheckCircle2 size={48} className="text-emerald-500" />
        </div>
        
        <h2 className="text-3xl font-black text-slate-800 mb-2">本组完成!</h2>
        <p className="text-slate-500 mb-10 text-center max-w-xs">
           休息一下，或者继续下一组单词的学习。
        </p>

        <div className="flex flex-col gap-4 w-full max-w-xs">
           {totalDue > 0 ? (
               <button 
                  onClick={onContinue}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-lg shadow-xl shadow-indigo-200 flex items-center justify-center gap-2 transition-transform active:scale-95"
                >
                  继续下一组 <ArrowRight size={20} />
               </button>
           ) : (
               <div className="text-center py-2 text-indigo-600 font-bold bg-indigo-50 rounded-xl">
                   🎉 今日任务全部完成！
               </div>
           )}
           
           <button 
              onClick={onExit}
              className="w-full py-4 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-2xl font-bold flex items-center justify-center gap-2 transition-colors"
           >
              <Coffee size={20} /> 结束学习
           </button>
        </div>
      </div>
    );
  }

  // --- SESSION SETUP VIEW ---
  const options = [10, 20, 30, 50];

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white/80 backdrop-blur-xl border border-white p-8 rounded-[2rem] shadow-2xl shadow-indigo-100 w-full max-w-sm text-center">
         <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-indigo-600 transform -rotate-6">
            <Layers size={32} />
         </div>
         
         <h2 className="text-2xl font-black text-slate-800 mb-2">准备好学习了吗?</h2>
         <p className="text-slate-500 mb-8 font-medium">
            当前共有 <span className="text-indigo-600 font-bold text-lg">{totalDue}</span> 个单词待复习
         </p>

         <div className="space-y-3">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">选择本组学习数量</p>
            <div className="grid grid-cols-2 gap-3">
                {options.map(num => (
                    <button
                        key={num}
                        onClick={() => onStartSession(num)}
                        disabled={totalDue === 0}
                        className="py-3 rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 font-bold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {num} 个
                    </button>
                ))}
            </div>
            
            <button
                onClick={() => onStartSession(totalDue)}
                disabled={totalDue === 0}
                className="w-full py-4 mt-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
            >
                <Play size={18} fill="currentColor" />
                全部背诵 ({totalDue})
            </button>
         </div>
      </div>
      
      <button onClick={onExit} className="mt-8 text-slate-400 hover:text-slate-600 text-sm font-medium underline underline-offset-4">
          查看词表
      </button>
    </div>
  );
};
