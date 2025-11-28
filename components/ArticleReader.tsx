
import React, { useState, useMemo } from 'react';
import { Word, WordStatus } from '../types';
import { BookOpen, Highlighter, X, Search, ChevronRight } from 'lucide-react';

interface ArticleReaderProps {
  words: Word[];
  onLookup: (term: string) => void;
}

export const ArticleReader: React.FC<ArticleReaderProps> = ({ words, onLookup }) => {
  const [text, setText] = useState('');
  const [isReading, setIsReading] = useState(false);

  // Index vocabulary for fast lookup
  const vocabMap = useMemo(() => {
    const map = new Map<string, WordStatus>();
    words.forEach(w => map.set(w.term.toLowerCase(), w.status));
    return map;
  }, [words]);

  const handleStart = () => {
    if (text.trim()) setIsReading(true);
  };

  const renderContent = () => {
    // Split by non-word characters but keep delimiters to preserve formatting
    const parts = text.split(/([^a-zA-Z']+)/);
    
    return parts.map((part, i) => {
      // Check if it is a word
      if (/^[a-zA-Z]+$/.test(part)) {
        const lower = part.toLowerCase();
        const status = vocabMap.get(lower);
        
        let className = "cursor-pointer transition-colors px-0.5 rounded ";
        if (status === WordStatus.Mastered) className += "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200";
        else if (status === WordStatus.Learning) className += "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 hover:bg-amber-200";
        else if (status === WordStatus.New) className += "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 hover:bg-indigo-200";
        else className += "hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-indigo-600";

        return (
          <span 
            key={i} 
            className={className}
            onClick={() => onLookup(lower)}
          >
            {part}
          </span>
        );
      }
      return <span key={i} className="text-slate-500 dark:text-slate-400">{part}</span>;
    });
  };

  if (!isReading) {
    return (
      <div className="h-full flex flex-col p-6 animate-in fade-in">
         <div className="text-center mb-8 mt-4">
             <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-blue-500 dark:text-blue-400">
                 <BookOpen size={32} />
             </div>
             <h2 className="text-2xl font-black text-slate-800 dark:text-white">真题阅读助手</h2>
             <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm max-w-xs mx-auto">
                 粘贴真题文章，自动高亮已背单词。<br/>点击生词一键加入词库。
             </p>
         </div>

         <div className="flex-grow relative">
             <textarea 
                className="w-full h-full p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 resize-none outline-none focus:border-blue-500 transition-colors text-base leading-relaxed dark:text-slate-200 shadow-inner"
                placeholder="在此粘贴英语文章..."
                value={text}
                onChange={(e) => setText(e.target.value)}
             />
         </div>

         <div className="mt-6">
             <button 
                onClick={handleStart}
                disabled={!text.trim()}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-200 dark:shadow-none flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:transform-none"
             >
                 <Highlighter size={20} /> 开始精读分析
             </button>
         </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-900 animate-in fade-in slide-in-from-bottom-4">
       <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white/80 dark:bg-slate-900/80 backdrop-blur sticky top-0 z-10">
           <div className="flex items-center gap-2">
               <span className="font-bold text-slate-800 dark:text-white">阅读模式</span>
               <div className="flex gap-1 ml-2 text-[10px] font-bold uppercase">
                   <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 px-1.5 rounded">Mastered</span>
                   <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-600 px-1.5 rounded">Learning</span>
               </div>
           </div>
           <button onClick={() => setIsReading(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
               <X size={20} />
           </button>
       </div>

       <div className="flex-grow overflow-y-auto p-6 pb-24">
           <div className="prose prose-lg dark:prose-invert max-w-none leading-loose font-serif text-slate-800 dark:text-slate-300">
               <p>{renderContent()}</p>
           </div>
       </div>
       
       <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/80 dark:bg-white/90 backdrop-blur text-white dark:text-slate-900 px-4 py-2 rounded-full text-xs font-bold shadow-xl pointer-events-none opacity-80">
           点击单词可查看释义
       </div>
    </div>
  );
};
