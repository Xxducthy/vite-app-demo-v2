
import React from 'react';
import { Word } from '../types';
import { Activity, Zap } from 'lucide-react';

interface WordStatsProps {
  word: Word;
}

export const WordStats: React.FC<WordStatsProps> = ({ word }) => {
  // 1. Calculate Difficulty based on Ease Factor (EF)
  // Standard SM-2 EF starts at 2.5. Lower means harder.
  let difficultyLabel = '普通';
  let difficultyColor = 'text-indigo-500 bg-indigo-50 border-indigo-200 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-400';
  
  if (word.easeFactor < 2.0) {
      difficultyLabel = '困难';
      difficultyColor = 'text-rose-500 bg-rose-50 border-rose-200 dark:bg-rose-900/30 dark:border-rose-800 dark:text-rose-400';
  } else if (word.easeFactor > 2.8) {
      difficultyLabel = '简单';
      difficultyColor = 'text-emerald-500 bg-emerald-50 border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-400';
  }

  // 2. Calculate "Freshness" (Time remaining ratio)
  const now = Date.now();
  const lastReview = word.lastReviewed || (now - 1000 * 60 * 60 * 24); // Default to yesterday if new
  const nextReview = word.nextReview;
  
  // Total span between last and next
  const totalDuration = nextReview - lastReview;
  // Time passed since last review
  const timePassed = now - lastReview;
  
  // Percentage remaining (0 to 100)
  // If totalDuration is 0 (new word), it's 0%.
  let freshness = 0;
  if (totalDuration > 0) {
      freshness = Math.max(0, Math.min(100, 100 - (timePassed / totalDuration) * 100));
  }
  
  // If nextReview is in the past (overdue), freshness is 0
  if (nextReview <= now) freshness = 0;

  // 3. Format Date nicely
  const getNextReviewText = () => {
      const diff = nextReview - now;
      if (diff <= 0) return '立即复习';
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      
      if (days > 0) return `${days}天后`;
      if (hours > 0) return `${hours}小时后`;
      return '即将到期';
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                  <Activity size={20} />
              </div>
              <h3 className="font-bold text-slate-800 dark:text-white">单词体检报告</h3>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-bold border ${difficultyColor}`}>
              评价: {difficultyLabel}
          </div>
      </div>

      {/* Main Stats: Level & Streak */}
      <div className="flex gap-4 mb-6">
          <div className="flex-1 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col items-center">
              <span className="text-slate-400 text-xs font-bold uppercase mb-1">记忆等级</span>
              <div className="text-2xl font-black text-slate-800 dark:text-white flex items-baseline gap-1">
                  <span className="text-sm text-slate-400">Lv.</span>
                  {word.repetitions}
              </div>
          </div>
          <div className="flex-1 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col items-center">
              <span className="text-slate-400 text-xs font-bold uppercase mb-1">下次复习</span>
              <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                  {getNextReviewText()}
              </div>
          </div>
      </div>

      {/* Visual: Memory Freshness Bar */}
      <div className="mb-2">
          <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">
              <div className="flex items-center gap-1">
                  <Zap size={12} className={freshness > 50 ? "text-amber-500" : "text-slate-300"} fill="currentColor"/>
                  记忆鲜活度
              </div>
              <span>{Math.round(freshness)}%</span>
          </div>
          <div className="h-3 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden relative">
              {/* Background Stripes */}
              <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'linear-gradient(45deg,rgba(255,255,255,.15) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.15) 50%,rgba(255,255,255,.15) 75%,transparent 75%,transparent)', backgroundSize: '1rem 1rem' }}></div>
              
              <div 
                className={`h-full transition-all duration-1000 ease-out rounded-full ${
                    freshness > 60 ? 'bg-emerald-500' : 
                    freshness > 30 ? 'bg-amber-500' : 
                    'bg-rose-500'
                }`} 
                style={{ width: `${freshness}%` }}
              ></div>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 text-center">
              {freshness > 80 ? "记忆非常清晰，继续保持！" : 
               freshness > 30 ? "记忆正在缓慢流失..." : 
               "警报：该单词即将遗忘，请尽快复习！"}
          </p>
      </div>

    </div>
  );
};
