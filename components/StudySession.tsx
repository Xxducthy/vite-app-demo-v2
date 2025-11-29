import React, { useState, useEffect } from 'react';
import { Play, CheckCircle2, Coffee, ArrowRight, Layers, Shuffle, RotateCcw, Dumbbell, Zap, AlertTriangle, PenTool, BookOpen, Sparkles, X, Loader2 } from 'lucide-react';
import { StudyMode, ComparatorResult, EtymologyResult } from '../types';
import { AUTOCOMPLETE_DICT } from '../constants';

// Helper: Smart Dictionary Lookup with AI Vocab Priority
const findInDict = (rawText: string, aiVocab?: Array<{word: string, definition: string}>) => {
  // Clean punctuation and lowercase
  let word = rawText.toLowerCase().replace(/[^a-z]+/g, '');
  if (!word) return null;
  
  // 0. CHECK AI VOCAB FIRST (Perfect Match from Story Context)
  if (aiVocab) {
      const aiMatch = aiVocab.find(v => v.word.toLowerCase() === word);
      if (aiMatch) return { term: aiMatch.word, pos: 'AI', definition: aiMatch.definition };

      // 0.1 Check AI Vocab for Lemma match (if word is 'running', ai might have 'run')
      const aiLemmaMatch = aiVocab.find(v => word.startsWith(v.word.toLowerCase()) || v.word.toLowerCase().startsWith(word));
      if (aiLemmaMatch) return { term: aiLemmaMatch.word, pos: 'AI', definition: aiLemmaMatch.definition };
  }

  // 1. Exact match Local
  let match = AUTOCOMPLETE_DICT.find(d => d.term.toLowerCase() === word);
  if (match) return match;

  // 2. Suffix stripping for simple morphology
  const suffixes = ['ing', 'ies', 'ves', 'es', 'ed', 'ly', 's', 'd'];
  for (const suffix of suffixes) {
    if (word.endsWith(suffix)) {
      let base = word.slice(0, -suffix.length);
      
      // Check AI Vocab with base
      if (aiVocab) {
          const aiBaseMatch = aiVocab.find(v => v.word.toLowerCase() === base);
          if (aiBaseMatch) return { term: aiBaseMatch.word, pos: 'AI', definition: aiBaseMatch.definition };
      }

      // Check Local
      if (base.length > 1) {
         match = AUTOCOMPLETE_DICT.find(d => d.term.toLowerCase() === base);
         if (match) return match;
      }
      
      // Special rules reconstruction
      if (suffix === 'ies') base += 'y'; 
      if (suffix === 'ves') base += 'f'; 
      
      if (base.length > 1) {
         match = AUTOCOMPLETE_DICT.find(d => d.term.toLowerCase() === base);
         if (match) return match;
      }

      // Handle 'baked' -> 'bake' (e suffix restoration)
      if (suffix === 'ing' || suffix === 'd' || suffix === 'ed') {
         const baseE = base + 'e';
         match = AUTOCOMPLETE_DICT.find(d => d.term.toLowerCase() === baseE);
         if (match) return match;
         
         // Check AI vocab for restored E
         if (aiVocab) {
             const aiBaseEMatch = aiVocab.find(v => v.word.toLowerCase() === baseE);
             if (aiBaseEMatch) return { term: aiBaseEMatch.word, pos: 'AI', definition: aiBaseEMatch.definition };
         }
      }
    }
  }
  return null;
};

// Helper for clickable story words
const StoryWord: React.FC<{ text: string, aiVocab?: Array<{word: string, definition: string}> }> = ({ text, aiVocab }) => {
    const [showTip, setShowTip] = useState(false);
    
    // Use smart lookup with AI list priority
    const match = findInDict(text, aiVocab);
    
    // Check if it's a bolded/highlighted keyword (passed as **word**)
    const isHighlight = text.startsWith('**');
    const display = text.replace(/\*\*/g, '');

    return (
        <span className="relative inline-block mx-0.5">
            <span 
                onClick={(e) => { e.stopPropagation(); if(match) setShowTip(!showTip); }}
                className={`cursor-pointer transition-colors ${isHighlight ? 'text-purple-600 dark:text-purple-400 font-bold bg-purple-50 dark:bg-purple-900/30 px-1 rounded' : match ? 'hover:text-purple-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded px-0.5' : ''}`}
            >
                {display}
            </span>
            {showTip && match && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-slate-900 text-white text-xs p-3 rounded-xl shadow-xl z-50 whitespace-nowrap min-w-[120px] animate-in fade-in zoom-in duration-200">
                    <div className="flex items-baseline gap-2 mb-1 border-b border-white/20 pb-1">
                        <span className="font-bold text-sm">{match.term}</span> 
                        <span className="text-indigo-300 font-mono text-[10px]">{match.pos}</span>
                    </div>
                    <div className="text-slate-200 leading-tight">{match.definition}</div>
                    {/* Triangle */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900"></div>
                </div>
            )}
        </span>
    );
};

interface StudySessionProps {
  totalDue: number;
  totalWords: number; 
  onStartSession: (count: number, isCram?: boolean) => void; 
  onExit: () => void;
  isFinished?: boolean;
  onContinue?: () => void;
  onReviewAgain?: () => void;
  nextBatchSize?: number;
  sessionDirectCount?: number;
  sessionStruggleCount?: number;
  studyMode: StudyMode;
  setStudyMode: (mode: StudyMode) => void;
  completedWordTerms?: string[];
  preloadedStory?: {english: string, chinese: string, vocabulary?: Array<{word: string, definition: string}>} | null;
  isStoryLoading?: boolean;
  currentWordExtraData?: { comparator?: ComparatorResult, etymology?: EtymologyResult };
}

export const StudySession: React.FC<StudySessionProps> = ({ 
  totalDue, 
  totalWords,
  onStartSession, 
  onExit,
  isFinished,
  onContinue,
  onReviewAgain,
  nextBatchSize = 20,
  sessionDirectCount = 0,
  sessionStruggleCount = 0,
  studyMode,
  setStudyMode,
  completedWordTerms = [],
  preloadedStory,
  isStoryLoading
}) => {
  const [showStoryModal, setShowStoryModal] = useState(false);

  // Parse English Story to make it clickable
  const renderInteractiveEnglish = (text: string) => {
      // Split by spaces but keep structure
      return text.split(' ').map((chunk, i) => <StoryWord key={i} text={chunk} aiVocab={preloadedStory?.vocabulary} />);
  };

  // Parse Chinese Story for highlighting (replace **text** with styled span, NO QUOTES)
  const renderHighlightedChinese = (text: string) => {
      const parts = text.split(/(\*\*.*?\*\*)/g);
      return parts.map((part, i) => {
          if (part.startsWith('**') && part.endsWith('**')) {
              return <span key={i} className="text-purple-600 dark:text-purple-400 font-bold mx-0.5">{part.slice(2, -2)}</span>;
          }
          return part;
      });
  };

  // --- STORY MODAL ---
  if (showStoryModal) {
      return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur p-4 animate-in fade-in">
              <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2rem] shadow-2xl p-6 relative max-h-[85vh] overflow-y-auto border border-white/10">
                  <button onClick={() => setShowStoryModal(false)} className="absolute top-4 right-4 p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400">
                      <X size={20} />
                  </button>
                  
                  <div className="flex items-center gap-3 mb-6">
                      <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center text-purple-600 dark:text-purple-400">
                          <Sparkles size={24} />
                      </div>
                      <div>
                          <h2 className="text-xl font-black text-slate-800 dark:text-white">AI 助记故事</h2>
                          <p className="text-xs text-slate-500 dark:text-slate-400">点击单词可查看释义</p>
                      </div>
                  </div>

                  {isStoryLoading ? (
                      <div className="flex flex-col items-center justify-center py-12 space-y-4">
                          <Loader2 size={48} className="text-purple-600 animate-spin" />
                          <p className="font-bold text-slate-600 dark:text-slate-300 animate-pulse">AI 正在后台奋笔疾书...</p>
                      </div>
                  ) : preloadedStory ? (
                      <div className="space-y-6">
                          <div className="prose prose-slate dark:prose-invert">
                              {/* Interactive English */}
                              <p className="text-lg leading-relaxed font-serif text-slate-800 dark:text-slate-100 text-justify">
                                  {renderInteractiveEnglish(preloadedStory.english)}
                              </p>
                          </div>
                          <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                              <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">中文大意</h4>
                              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                                  {renderHighlightedChinese(preloadedStory.chinese)}
                              </p>
                          </div>
                      </div>
                  ) : (
                      <div className="text-center py-8 text-slate-400">
                          <p>生成似乎遇到了一点问题，可能是网络连接或服务繁忙。</p>
                      </div>
                  )}
                  
                  <div className="mt-8">
                       <button onClick={() => setShowStoryModal(false)} className="w-full py-3 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-xl font-bold">关闭</button>
                  </div>
              </div>
          </div>
      );
  }

  // --- SESSION COMPLETE VIEW ---
  if (isFinished) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in duration-300">
        <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-emerald-100 dark:shadow-none">
           <CheckCircle2 size={48} className="text-emerald-500 dark:text-emerald-400" />
        </div>
        
        <h2 className="text-3xl font-black text-slate-800 dark:text-white mb-2">本组闯关成功!</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-6 text-center max-w-xs">
           您已掌握这组单词。
        </p>

        {/* Stats Dashboard */}
        <div className="flex gap-4 mb-8 w-full max-w-xs">
            <div className="flex-1 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-2xl p-3 flex flex-col items-center">
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{sessionDirectCount}</span>
                <div className="flex items-center gap-1 text-[10px] text-emerald-600/70 dark:text-emerald-400/70 font-bold uppercase tracking-wide mt-1">
                    <Zap size={10} fill="currentColor" /> 秒杀通过
                </div>
            </div>
            <div className="flex-1 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-2xl p-3 flex flex-col items-center">
                <span className="text-2xl font-black text-amber-600 dark:text-amber-400">{sessionStruggleCount}</span>
                <div className="flex items-center gap-1 text-[10px] text-amber-600/70 dark:text-amber-400/70 font-bold uppercase tracking-wide mt-1">
                    <AlertTriangle size={10} fill="currentColor" /> 重点循环
                </div>
            </div>
        </div>

        <div className="flex flex-col gap-3 w-full max-w-xs">
           
           {/* AI Story Button (New) */}
           {completedWordTerms.length > 0 && (
               <button 
                  onClick={() => setShowStoryModal(true)}
                  className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-bold text-base shadow-lg shadow-purple-200 dark:shadow-none flex items-center justify-center gap-2 transition-transform active:scale-95 mb-2 relative overflow-hidden group"
               >
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-50 via-pink-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <span className="relative flex items-center gap-2">
                      {isStoryLoading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                      {isStoryLoading ? 'AI 故事生成中...' : '查看 AI 助记故事'}
                  </span>
               </button>
           )}

           {/* Priority 1: Continue to Next Batch */}
           {totalDue > 0 && onContinue && (
               <button 
                  onClick={onContinue}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-lg shadow-xl shadow-indigo-200 dark:shadow-none flex items-center justify-center gap-2 transition-transform active:scale-95 group"
                >
                  继续下一组 ({nextBatchSize}个) <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
               </button>
           )}
           
           {/* Priority 2: Review Again */}
           {onReviewAgain && (
               <button 
                  onClick={onReviewAgain}
                  className={`w-full py-3.5 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all active:scale-95 ${totalDue > 0 ? 'bg-white dark:bg-slate-800 border-2 border-indigo-100 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-700' : 'bg-amber-500 text-white shadow-lg shadow-amber-200 hover:bg-amber-600'}`}
                >
                  <RotateCcw size={18} /> {totalDue > 0 ? "再背一次本组 (巩固)" : "再背一次本组"}
               </button>
           )}
           
           <div className="h-4"></div>

           <button 
              onClick={onExit}
              className="w-full py-3 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-colors"
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
      <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white dark:border-slate-700 p-8 rounded-[2rem] shadow-2xl shadow-indigo-100 dark:shadow-none w-full max-w-sm text-center">
         
         <div className="flex justify-center mb-6">
            <div className="bg-slate-100 dark:bg-slate-700 p-1 rounded-xl flex gap-1">
                <button 
                    onClick={() => setStudyMode('flashcard')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${studyMode === 'flashcard' ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-400'}`}
                >
                    <BookOpen size={14} /> 翻卡
                </button>
                <button 
                    onClick={() => setStudyMode('spelling')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${studyMode === 'spelling' ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-400'}`}
                >
                    <PenTool size={14} /> 拼写
                </button>
            </div>
         </div>

         <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 transform -rotate-6 ${isAllCaughtUp ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-400' : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-400'}`}>
            {isAllCaughtUp ? <CheckCircle2 size={32} /> : <Layers size={32} />}
         </div>
         
         <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2">
            {isAllCaughtUp ? "今日任务已完成!" : "准备好学习了吗?"}
         </h2>
         <p className="text-slate-500 dark:text-slate-400 mb-8 font-medium">
            {isAllCaughtUp 
                ? "您已完成所有待复习单词。" 
                : <><span className="text-indigo-600 dark:text-indigo-400 font-bold text-lg">{totalDue}</span> 个单词待复习</>
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
                            className="py-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-slate-600 dark:text-slate-300 hover:text-indigo-700 dark:hover:text-indigo-400 font-bold transition-all active:scale-95 bg-white dark:bg-slate-800"
                        >
                            {num} 个
                        </button>
                    ))}
                </div>
                
                <button
                    onClick={() => onStartSession(totalDue, false)}
                    className="w-full py-4 mt-2 bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95"
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
                    className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold shadow-lg shadow-amber-200 dark:shadow-none flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                    <Shuffle size={18} />
                    随机复习 20 个
                </button>
                <button
                    onClick={() => onStartSession(totalWords, true)}
                    className="w-full py-3 bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-500 rounded-xl font-bold hover:bg-amber-50 dark:hover:bg-amber-900/20 flex items-center justify-center gap-2 transition-all active:scale-95"
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
    </div>
  );
};