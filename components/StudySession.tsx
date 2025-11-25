
import React from 'react';
import { Play, CheckCircle2, Coffee, ArrowRight, Layers, Shuffle, RotateCcw, Dumbbell } from 'lucide-react';

interface StudySessionProps {
  totalDue: number;
  totalWords: number; 
  onStartSession: (count: number, isCram?: boolean) => void; 
  onExit: () => void;
  isFinished?: boolean;
  onContinue?: () => void;
  onReviewAgain?: () => void;
}

export const StudySession: React.FC<StudySessionProps> = ({ 
  totalDue, 
  totalWords,
  onStartSession, 
  onExit,
  isFinished,
  onContinue,
  onReviewAgain
}) => {
  
  // --- SESSION COMPLETE VIEW ---
  if (isFinished) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in duration-300">
        <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-emerald-100">
           <CheckCircle2 size={48} className="text-emerald-500" />
        </div>
        
        <h2 className="text-3xl font-black text-slate-800 mb-2">本组闯关成功!</h2>
        <p className="text-slate-500 mb-10 text-center max-w-xs">
           您已掌握这组单词。接下来做什么？
        </p>

        <div className="flex flex-col gap-3 w-full max-w-xs">
           {/* Priority 1: Continue to Next Batch if available */}
           {totalDue > 0 && onContinue && (
               <button 
                  onClick={onContinue}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-lg shadow-xl shadow-indigo-200 flex items-center justify-center gap-2 transition-transform active:scale-95"
                >
                  继续下一组 <ArrowRight size={20} />
               </button>
           )}
           
           {/* Priority 2: Review the same batch again */}
           {onReviewAgain && (
               <button 
                  onClick={onReviewAgain}
                  className={`w-full py-3.5 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all active:scale-95 ${totalDue > 0 ? 'bg-white border-2 border-indigo-100 text-indigo-600 hover:bg-indigo-50' : 'bg-amber-500 text-white shadow-lg shadow-amber-200 hover:bg-amber-600'}`}
                >
                  <RotateCcw size={18} /> {totalDue > 0 ? "再背一次本组 (巩固)" : "再背一次本组"}
               </button>
           )}
           
           <div className="h-4"></div>

           <button 
              onClick={onExit}
              className="w-full py-3 bg-transparent hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-colors"
           >
              <Coffee size={16} /> 休息一会儿
           </button>
        </div>
      </div>
    );
  }

  // --- SESSION SETUP VIEW ---
  const options = [10, 20, 30, 50];
  const isAllCaughtUp = totalDue === 0;

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white/80 backdrop-blur-xl border border-white p-8 rounded-[2rem] shadow-2xl shadow-indigo-100 w-full max-w-sm text-center">
         <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 transform -rotate-6 ${isAllCaughtUp ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}>
            {isAllCaughtUp ? <CheckCircle2 size={32} /> : <Layers size={32} />}
         </div>
         
         <h2 className="text-2xl font-black text-slate-800 mb-2">
            {isAllCaughtUp ? "今日任务已完成!" : "准备好学习了吗?"}
         </h2>
         <p className="text-slate-500 mb-8 font-medium">
            {isAllCaughtUp 
                ? "您已完成所有待复习单词。" 
                : <><span className="text-indigo-600 font-bold text-lg">{totalDue}</span> 个单词待复习</>
            }
         </p>

         {!isAllCaughtUp && (
             <div className="space-y-3">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">选择本组学习数量</p>
                <div className="grid grid-cols-2 gap-3">
                    {options.map(num => (
                        <button
                            key={num}
                            onClick={() => onStartSession(num, false)}
                            className="py-3 rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 font-bold transition-all active:scale-95"
                        >
                            {num} 个
                        </button>
                    ))}
                </div>
                
                <button
                    onClick={() => onStartSession(totalDue, false)}
                    className="w-full py-4 mt-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                    <Play size={18} fill="currentColor" />
                    全部背诵 ({totalDue})
                </button>
             </div>
         )}

         {isAllCaughtUp && totalWords > 0 && (
             <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-center gap-2 justify-center text-amber-500 mb-2 opacity-80">
                    <Dumbbell size={16} />
                    <span className="text-xs font-bold uppercase tracking-widest">巩固复习模式</span>
                </div>
                <button
                    onClick={() => onStartSession(20, true)}
                    className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold shadow-lg shadow-amber-200 flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                    <Shuffle size={18} />
                    随机复习 20 个
                </button>
                <button
                    onClick={() => onStartSession(totalWords, true)}
                    className="w-full py-3 bg-white border border-amber-200 text-amber-600 rounded-xl font-bold hover:bg-amber-50 flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                    全部巩固 ({totalWords})
                </button>
             </div>
         )}
         
         {totalWords === 0 && (
             <div className="text-slate-400 text-sm py-4">
                 词库为空，请先添加单词。
             </div>
         )}

      </div>
      
      <button onClick={onExit} className="mt-8 text-slate-400 hover:text-slate-600 text-sm font-medium underline underline-offset-4">
          查看词表
      </button>
    </div>
  );
};
