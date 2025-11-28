
import React, { useEffect, useState } from 'react';
import { Word, WordStatus } from '../types';
import { Volume2, Plus, Loader2, BookOpenCheck, Lightbulb, ArrowLeft, Trash2, Search, AlertCircle, GitCompare, Sprout } from 'lucide-react';
import { enrichWordWithAI } from '../services/geminiService';
import { AUTOCOMPLETE_DICT } from '../constants';
import { ComparatorModal } from './ComparatorModal';
import { EtymologyModal } from './EtymologyModal';
import { WordStats } from './WordStats';

interface DictionaryDetailProps {
  term: string;
  existingWord?: Word;
  onAdd: (word: Word) => void;
  onRemove: (id: string) => void;
  onBack: () => void;
}

// ... (findInDict, WordTooltip, InteractiveSentence helpers kept same as before, omitted for brevity but presumed present)
const findInDict = (rawWord: string) => {
  let word = rawWord.toLowerCase().replace(/^[^a-z]+|[^a-z]+$/g, '').replace(/['’]s$/, '');
  if (!word) return null;
  let match = AUTOCOMPLETE_DICT.find(d => d.term.toLowerCase() === word);
  if (match) return match;
  const suffixes = ['ing', 'ies', 'ves', 'es', 'ed', 'ly', 's', 'd'];
  for (const suffix of suffixes) {
    if (word.endsWith(suffix)) {
      let base = word.slice(0, -suffix.length);
      if (suffix === 'ies') base += 'y';
      if (suffix === 'ves') base += 'f';
      if (base.length > 1) {
         match = AUTOCOMPLETE_DICT.find(d => d.term.toLowerCase() === base);
         if (match) return match;
      }
      if (suffix === 'ing' || suffix === 'd') {
         const baseE = base + 'e';
         match = AUTOCOMPLETE_DICT.find(d => d.term.toLowerCase() === baseE);
         if (match) return match;
      }
    }
  }
  return null;
};

const WordTooltip: React.FC<{ text: string }> = ({ text }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [match, setMatch] = useState<typeof AUTOCOMPLETE_DICT[0] | null>(null);
  useEffect(() => { const found = findInDict(text); setMatch(found || null); }, [text]);
  if (!match) return <span className="inline-block">{text}</span>;
  return (
    <span 
      className="relative inline-block cursor-pointer group/word border-b border-transparent hover:border-indigo-300 dark:hover:border-indigo-500 transition-colors rounded-sm mx-[1.5px]"
      onMouseEnter={() => setIsOpen(true)} onMouseLeave={() => setIsOpen(false)} onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
    >
      <span className="group-hover/word:text-indigo-700 dark:group-hover/word:text-indigo-400 transition-colors">{text}</span>
      <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[240px] bg-slate-900/95 dark:bg-white/95 text-white dark:text-slate-900 text-xs rounded-xl shadow-xl p-3 z-50 pointer-events-none transition-all duration-200 origin-bottom ${isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2'}`}>
         <div className="flex items-baseline gap-2 mb-1 border-b border-white/10 dark:border-slate-900/10 pb-1"><span className="font-bold text-sm">{match.term}</span><span className="font-mono text-[10px] text-indigo-300 dark:text-indigo-600">{match.pos}</span></div>
         <div className="text-slate-200 dark:text-slate-600 leading-tight whitespace-normal">{match.definition}</div>
         <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900/95 dark:border-t-white/95"></div>
      </div>
    </span>
  );
};

const InteractiveSentence: React.FC<{ text: string }> = ({ text }) => {
  const tokens = text.split(' ');
  return (
    <p className="text-base text-slate-600 dark:text-slate-400 font-medium italic leading-relaxed cursor-default">
      "{tokens.map((token, i) => (<React.Fragment key={i}><WordTooltip text={token} />{i < tokens.length - 1 && ' '}</React.Fragment>))}"
    </p>
  );
};

export const DictionaryDetail: React.FC<DictionaryDetailProps> = ({ term, existingWord, onAdd, onRemove, onBack }) => {
  const [previewData, setPreviewData] = useState<Partial<Word> | null>(existingWord || null);
  const [isLoading, setIsLoading] = useState(!existingWord);
  const [error, setError] = useState<string | null>(null);
  
  // New States for Modals
  const [showComparator, setShowComparator] = useState(false);
  const [showEtymology, setShowEtymology] = useState(false);

  useEffect(() => {
    if (existingWord) { setPreviewData(existingWord); setIsLoading(false); return; }
    const localMatch = AUTOCOMPLETE_DICT.find(d => d.term.toLowerCase() === term.toLowerCase());
    if (localMatch) {
        setPreviewData({
            id: `temp-local-${Date.now()}`,
            term: localMatch.term,
            meanings: [{ partOfSpeech: localMatch.pos, definition: localMatch.definition, example: "Loading...", translation: "正在联网获取考研例句..." }],
            status: WordStatus.New, tags: []
        });
    }
    const fetchPreview = async () => {
      if (!localMatch) setIsLoading(true); 
      setError(null);
      try {
        const aiData = await enrichWordWithAI(term);
        setPreviewData(prev => ({
          id: prev?.id || `temp-${Date.now()}`,
          term: aiData.term || term,
          ...aiData,
          status: WordStatus.New, tags: [], nextReview: Date.now(), interval: 0, repetitions: 0, easeFactor: 2.5
        }));
      } catch (err: any) {
        console.error("Fetch Error:", err);
        if (localMatch) {
            setPreviewData(prev => {
                if (!prev) return prev;
                return { ...prev, meanings: prev.meanings?.map(m => ({ ...m, example: "AI 联网请求失败，请检查 API Key 设置。", translation: "暂无例句" })) };
            });
        } else { setError("AI 请求超时或失败。请检查 Cloudflare 环境变量设置。"); }
      } finally { setIsLoading(false); }
    };
    fetchPreview();
  }, [term, existingWord]);

  const speakText = (text: string) => {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(u);
  };

  const handleAdd = () => {
    if (previewData) {
      const wordToAdd: Word = { ...(previewData as Word), id: existingWord?.id || `new-${Date.now()}-${previewData.term}`, tags: ['导入'] };
      onAdd(wordToAdd);
      onBack();
    }
  };

  return (
    <div className="h-full bg-white dark:bg-slate-900 flex flex-col transition-colors relative">
      {/* Modals */}
      {showComparator && previewData?.term && <ComparatorModal term={previewData.term} onClose={() => setShowComparator(false)} />}
      {showEtymology && previewData?.term && <EtymologyModal term={previewData.term} onClose={() => setShowEtymology(false)} />}

      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3 bg-white dark:bg-slate-900 sticky top-0 z-20">
        <button onClick={onBack} className="p-2 -ml-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 transition-colors">
          <ArrowLeft size={22} />
        </button>
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">词典详情</h2>
      </div>

      <div className="flex-grow overflow-y-auto no-scrollbar">
        {isLoading && !previewData ? (
          <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <Loader2 size={48} className="text-indigo-600 animate-spin" />
            <p className="text-lg font-bold text-slate-700 dark:text-slate-300">DeepSeek 正在极速查询...</p>
          </div>
        ) : error ? (
           <div className="flex flex-col items-center justify-center h-64 text-rose-500 p-6 text-center">
              <AlertCircle size={48} className="mb-4 opacity-20" />
              <p className="font-bold">{error}</p>
           </div>
        ) : previewData ? (
          <div className="p-6 pb-32 space-y-8">
             <div className="space-y-4">
                <h1 className="text-5xl font-black text-slate-900 dark:text-white tracking-tight">{previewData.term}</h1>
                <div className="flex flex-wrap gap-3 items-center">
                   {previewData.phonetic && (
                     <button onClick={() => speakText(previewData.term!)} className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                        <span className="font-mono text-lg">{previewData.phonetic}</span>
                        <Volume2 size={16} />
                     </button>
                   )}
                   {previewData.examSource && (
                      <span className="px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-xs font-bold rounded-lg border border-amber-100 dark:border-amber-900 flex items-center gap-1.5">
                        <BookOpenCheck size={14} />
                        {previewData.examSource}
                      </span>
                   )}
                </div>
                
                {/* Advanced Feature Buttons */}
                <div className="flex gap-2 pt-2">
                    <button onClick={() => setShowComparator(true)} className="flex-1 py-2.5 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border border-orange-100 dark:border-orange-800/50 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors">
                        <GitCompare size={16} /> 易混词辨析
                    </button>
                    <button onClick={() => setShowEtymology(true)} className="flex-1 py-2.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border border-emerald-100 dark:border-emerald-800/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors">
                        <Sprout size={16} /> 词源拆解
                    </button>
                </div>
             </div>

             <div className="space-y-6">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">释义与例句</h3>
                {previewData.meanings?.map((meaning, idx) => (
                   <div key={idx} className="group">
                      <div className="flex items-baseline gap-3 mb-2">
                         <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-mono text-xs font-bold rounded border border-indigo-100 dark:border-indigo-800">
                            {meaning.partOfSpeech}
                         </span>
                         <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{meaning.definition}</p>
                      </div>
                      <div className="pl-4 border-l-2 border-slate-100 dark:border-slate-800 group-hover:border-indigo-200 dark:group-hover:border-indigo-800 transition-colors ml-1">
                         {meaning.example === "Loading..." ? (
                             <div className="flex items-center gap-2 text-indigo-400 text-sm animate-pulse">
                                <Loader2 size={14} className="animate-spin" />
                                <span>AI 正在生成考研真题例句...</span>
                             </div>
                         ) : meaning.example.includes("失败") ? (
                             <div className="text-rose-400 text-sm font-medium flex items-center gap-2">
                                <AlertCircle size={14} />
                                {meaning.example}
                             </div>
                         ) : (
                             <>
                                <InteractiveSentence text={meaning.example || ""} />
                                <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">{meaning.translation}</p>
                             </>
                         )}
                      </div>
                   </div>
                ))}
             </div>

             {previewData.mnemonic && (
                <div className="bg-indigo-50/50 dark:bg-indigo-900/20 rounded-2xl p-5 border border-indigo-100/50 dark:border-indigo-900/50">
                   <h4 className="flex items-center gap-2 text-sm font-bold text-indigo-500 dark:text-indigo-400 mb-2"><Lightbulb size={16} /> 记忆辅助</h4>
                   <p className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed">{previewData.mnemonic}</p>
                </div>
             )}

             {/* SRS Stats Visualization (Only for existing words) */}
             {existingWord && (
                 <WordStats word={existingWord} />
             )}

          </div>
        ) : null}
      </div>

      <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur absolute bottom-0 left-0 right-0 z-50">
         {existingWord ? (
            <button onClick={() => onRemove(existingWord.id)} className="w-full py-3.5 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl font-bold hover:bg-rose-100 dark:hover:bg-rose-900/30 flex items-center justify-center gap-2 transition-colors">
               <Trash2 size={18} /> 移除
            </button>
         ) : (
            <button onClick={handleAdd} disabled={isLoading && !previewData} className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-xl shadow-indigo-200 dark:shadow-none flex items-center justify-center gap-2 disabled:opacity-70 transition-all">
               {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} strokeWidth={3} />} 加入背诵计划
            </button>
         )}
      </div>
    </div>
  );
};
