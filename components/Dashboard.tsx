
import React, { useMemo } from 'react';
import { StudyHistory } from '../types';
import { Trophy, Flame, Target, Play, Calendar } from 'lucide-react';

interface DashboardProps {
  history: StudyHistory;
  dailyGoal: number;
  totalWords: number;
  onStart: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ history, dailyGoal, totalWords, onStart }) => {
  
  // Helper: Get date string YYYY-MM-DD
  const getDateKey = (d: Date) => d.toISOString().split('T')[0];
  const todayKey = getDateKey(new Date());

  // Calc Today's Progress
  const todayCount = history[todayKey] || 0;
  const progressPercent = Math.min(100, (todayCount / dailyGoal) * 100);

  // Calc Streak
  const streak = useMemo(() => {
    let currentStreak = 0;
    const d = new Date();
    // Simple logic: count backwards from today
    while (true) {
        const key = getDateKey(d);
        if (history[key] && history[key] > 0) {
            currentStreak++;
            d.setDate(d.getDate() - 1);
        } else if (key === todayKey && (!history[key] || history[key] === 0)) {
            d.setDate(d.getDate() - 1);
            continue;
        } else {
            break;
        }
    }
    return currentStreak;
  }, [history, todayKey]);

  // Generate Heatmap Data
  const heatmapDays = useMemo(() => {
    const days = [];
    const today = new Date();
    const startDate = new Date();
    startDate.setDate(today.getDate() - 104); // 15 weeks * 7 = 105

    while (startDate.getDay() !== 0) {
        startDate.setDate(startDate.getDate() - 1);
    }

    const d = new Date(startDate);
    while (d <= today) {
        const key = getDateKey(d);
        const count = history[key] || 0;
        let intensity = 0;
        if (count > 0) intensity = 1;
        if (count >= dailyGoal * 0.5) intensity = 2;
        if (count >= dailyGoal) intensity = 3;
        if (count >= dailyGoal * 1.5) intensity = 4;

        days.push({ date: key, intensity });
        d.setDate(d.getDate() + 1);
    }
    return days;
  }, [history, dailyGoal]);

  return (
    <div className="w-full h-full flex flex-col p-6 pt-32 pb-32 overflow-y-auto no-scrollbar animate-in fade-in duration-500">
        
        {/* Hero Section */}
        <div className="flex justify-between items-start mb-8">
            <div>
                <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">概览</h1>
                <p className="text-slate-400 font-medium text-sm">Welcome back, Scholar.</p>
            </div>
            <div className="flex flex-col items-end">
                 <div className="flex items-center gap-1.5 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 px-3 py-1 rounded-full border border-orange-100 dark:border-orange-800">
                    <Flame size={16} fill="currentColor" />
                    <span className="font-bold font-mono">{streak}</span>
                    <span className="text-xs font-bold uppercase">Days</span>
                 </div>
            </div>
        </div>

        {/* Daily Goal Ring */}
        <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-6 shadow-xl shadow-indigo-100 dark:shadow-none border border-white dark:border-slate-700 mb-6 relative overflow-hidden transition-colors">
             <div className="flex items-center justify-between relative z-10">
                 <div>
                     <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">今日目标</p>
                     <h2 className="text-4xl font-black text-slate-800 dark:text-white">
                        {todayCount} <span className="text-lg text-slate-300 dark:text-slate-600 font-bold">/ {dailyGoal}</span>
                     </h2>
                 </div>
                 <div className="relative w-20 h-20 flex items-center justify-center">
                      <svg className="w-full h-full -rotate-90">
                          <circle cx="40" cy="40" r="32" stroke="currentColor" strokeWidth="8" fill="none" className="text-slate-100 dark:text-slate-700" />
                          <circle 
                            cx="40" cy="40" r="32" 
                            stroke="currentColor" strokeWidth="8" fill="none" 
                            strokeDasharray="200"
                            strokeDashoffset={200 - (200 * progressPercent) / 100}
                            strokeLinecap="round"
                            className="text-indigo-600 dark:text-indigo-400 transition-all duration-1000 ease-out"
                          />
                      </svg>
                      <Target size={24} className="text-indigo-600 dark:text-indigo-400 absolute" />
                 </div>
             </div>
             
             {todayCount >= dailyGoal && (
                 <div className="mt-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold px-3 py-2 rounded-xl inline-flex items-center gap-2">
                     <Trophy size={14} /> 目标已达成！
                 </div>
             )}
        </div>

        {/* Heatmap */}
        <div className="bg-white/60 dark:bg-slate-800/50 rounded-2xl p-5 border border-white dark:border-slate-700 mb-8 backdrop-blur-sm">
             <div className="flex items-center gap-2 mb-4 text-slate-400">
                <Calendar size={14} />
                <span className="text-xs font-bold uppercase tracking-wider">学习热力图</span>
             </div>
             <div className="flex flex-wrap gap-1.5 content-start">
                 {heatmapDays.map((day) => (
                     <div 
                        key={day.date}
                        title={`${day.date}: ${history[day.date] || 0} words`}
                        className={`w-3 h-3 rounded-sm transition-all ${
                            day.intensity === 0 ? 'bg-slate-200/50 dark:bg-slate-700' :
                            day.intensity === 1 ? 'bg-indigo-200 dark:bg-indigo-900' :
                            day.intensity === 2 ? 'bg-indigo-300 dark:bg-indigo-800' :
                            day.intensity === 3 ? 'bg-indigo-400 dark:bg-indigo-600' :
                            'bg-indigo-600 dark:bg-indigo-500'
                        }`}
                     ></div>
                 ))}
             </div>
        </div>

        {/* Action Button */}
        <div className="mt-auto">
            <button 
                onClick={onStart}
                className="w-full py-4 bg-slate-900 dark:bg-indigo-600 text-white rounded-2xl font-bold text-lg shadow-xl shadow-slate-300 dark:shadow-none flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all group"
            >
                <div className="w-8 h-8 rounded-full bg-indigo-500 dark:bg-white/20 flex items-center justify-center group-hover:bg-white group-hover:text-indigo-600 transition-colors">
                    <Play size={14} fill="currentColor" />
                </div>
                开始背诵 ({totalWords}词)
            </button>
        </div>
    </div>
  );
};