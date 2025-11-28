
import React, { useState } from 'react';
import { Upload, BookOpen, Loader2, Sparkles, Zap, Volume2, Brain, Search, ScrollText } from 'lucide-react';

interface ImportModalProps {
  onImport: (terms: string[]) => void;
  onLoadSample: () => void;
  isProcessing: boolean;
}

export const ImportModal: React.FC<ImportModalProps> = ({ onImport, onLoadSample, isProcessing }) => {
  const [inputText, setInputText] = useState('');

  const handleImport = () => {
    const terms = inputText.split(/[\n,]+/).map(t => t.trim()).filter(t => t.length > 0);
    if (terms.length > 0) {
      onImport(terms);
      setInputText('');
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl shadow-indigo-200/50 dark:shadow-none border border-white dark:border-slate-800 p-6 md:p-10 relative overflow-hidden flex flex-col max-h-[80vh]">
      {/* Decorative Header */}
      <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
      
      <div className="text-center mb-6 shrink-0">
        <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4 text-indigo-600 dark:text-indigo-400 shadow-inner ring-4 ring-white dark:ring-slate-800">
          <Sparkles size={28} />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">批量极速导入</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">升级 AI 引擎：支持每次 5 个单词并发处理，速度提升 500%</p>
        
        {/* Feature Grid */}
        <div className="grid grid-cols-2 gap-3 mt-4 max-w-sm mx-auto">
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 p-2 rounded-lg border border-slate-100 dark:border-slate-700">
                <Volume2 size={14} className="text-indigo-500"/>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">国际音标</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 p-2 rounded-lg border border-slate-100 dark:border-slate-700">
                <ScrollText size={14} className="text-emerald-500"/>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">考研释义</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 p-2 rounded-lg border border-slate-100 dark:border-slate-700">
                <BookOpen size={14} className="text-amber-500"/>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">真题例句</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 p-2 rounded-lg border border-slate-100 dark:border-slate-700">
                <Brain size={14} className="text-rose-500"/>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">记忆助记符</span>
            </div>
        </div>
      </div>

      <div className="relative group flex-grow min-h-0 mb-6">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl opacity-20 group-hover:opacity-40 transition duration-500 blur"></div>
        <textarea
          className="relative w-full h-full min-h-[150px] p-5 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-0 focus:border-transparent outline-none font-mono text-base resize-none bg-white dark:bg-slate-800 dark:text-slate-200 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600 leading-relaxed"
          placeholder={`粘贴英文单词即可（支持批量），例如：\nabide\nabolish\nconspicuous\n...`}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={isProcessing}
        />
      </div>

      <div className="space-y-3 shrink-0">
        <button
          onClick={handleImport}
          disabled={!inputText.trim() || isProcessing}
          className="w-full bg-slate-900 dark:bg-indigo-600 hover:bg-indigo-600 dark:hover:bg-indigo-700 text-white py-4 rounded-xl font-bold shadow-xl shadow-slate-200 dark:shadow-none hover:shadow-indigo-200 hover:scale-[1.01] transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none group"
        >
          {isProcessing ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              <span className="animate-pulse">AI 正在极速打包解析中...</span>
            </>
          ) : (
            <>
              <Zap size={20} className="group-hover:fill-white" />
              开始智能导入
            </>
          )}
        </button>

        <button
           onClick={onLoadSample}
           className="w-full py-2 text-slate-400 dark:text-slate-500 text-xs font-medium hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center justify-center gap-1.5 group/link"
           disabled={isProcessing}
        >
          <Search size={14} className="group-hover/link:scale-110 transition-transform" />
          没有单词？加载 2024 考研高频难词示例
        </button>
      </div>
    </div>
  );
};
