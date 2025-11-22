
import React, { useState, useEffect, useCallback } from 'react';
import { Word, WordStatus, ViewMode, DictionaryEntry } from './types';
import { INITIAL_WORDS, AUTOCOMPLETE_DICT } from './constants';
import { Flashcard } from './components/Flashcard';
import { WordList } from './components/WordList';
import { ImportModal } from './components/ImportModal';
import { DictionaryDetail } from './components/DictionaryDetail';
import { InstallGuide } from './components/InstallGuide';
import { enrichWordWithAI, batchEnrichWords } from './services/geminiService';
import { Book, List, Plus, GraduationCap, AlertCircle, Sparkles, LayoutGrid, Search, Loader2, CheckCircle2, ArrowRight, Download, Share, HelpCircle, Settings, Smartphone } from 'lucide-react';

const STORAGE_KEY = 'kaoyan_vocab_progress_v1';

const App: React.FC = () => {
  // --- State ---
  const [words, setWords] = useState<Word[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error("Failed to load from local storage", e);
    }
    return INITIAL_WORDS;
  });

  const [mode, setMode] = useState<ViewMode>('study');
  const [now, setNow] = useState(Date.now());
  const [isLoading, setIsLoading] = useState(false);
  
  // AI Progress State
  const [enrichProgress, setEnrichProgress] = useState<{current: number, total: number} | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState<DictionaryEntry[]>([]);
  
  // Dictionary Preview State
  const [lookupTerm, setLookupTerm] = useState<string | null>(null);

  // PWA Install Prompt State
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);

  // --- Derived State (SRS Queue) ---
  const studyQueue = words
    .filter(w => w.nextReview <= now)
    .sort((a, b) => a.nextReview - b.nextReview);

  const currentWord = studyQueue.length > 0 ? studyQueue[0] : null;
  
  const stats = {
    total: words.length,
    mastered: words.filter(w => w.status === WordStatus.Mastered).length,
    learning: words.filter(w => w.status === WordStatus.Learning).length,
    new: words.filter(w => w.status === WordStatus.New).length,
  };

  // --- Effects ---
  useEffect(() => {
     const interval = setInterval(() => setNow(Date.now()), 30000);
     return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(words));
    } catch (e) {
      console.error("Failed to save to local storage", e);
    }
  }, [words]);

  // Detect Install Prompt and iOS
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);

    const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIosDevice);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // --- Handlers ---
  const handleInstallClick = () => {
    if (installPrompt) {
      // Android/Desktop: Trigger native prompt
      installPrompt.prompt();
      installPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          setInstallPrompt(null);
        }
      });
    } else {
        // iOS or already installed: Show guide
        setShowInstallGuide(true);
    }
  };

  const handleStatusChange = useCallback((id: string, actionStatus: WordStatus) => {
    setWords(prev => prev.map(w => {
      if (w.id !== id) return w;

      const currentTime = Date.now();
      let { interval, easeFactor, repetitions } = w;
      let quality = 0;

      if (actionStatus === WordStatus.New) quality = 0; // Forget
      else if (actionStatus === WordStatus.Learning) quality = 3; // Hard/Blurry
      else if (actionStatus === WordStatus.Mastered) quality = 5; // Easy

      if (quality < 3) {
        repetitions = 0;
        interval = 0;
      } else {
        if (repetitions === 0) interval = 1;
        else if (repetitions === 1) interval = 6;
        else interval = Math.round(interval * easeFactor);
        repetitions++;
      }

      easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
      if (easeFactor < 1.3) easeFactor = 1.3;

      let nextReview = currentTime;
      if (quality === 0) nextReview = currentTime; 
      else if (quality === 3 && repetitions <= 1) nextReview = currentTime + 10 * 60 * 1000;
      else nextReview = currentTime + (interval * 24 * 60 * 60 * 1000);

      let newStatus = WordStatus.New;
      if (repetitions > 0) newStatus = WordStatus.Learning;
      if (interval >= 21) newStatus = WordStatus.Mastered;

      return {
        ...w,
        status: newStatus,
        interval,
        easeFactor,
        repetitions,
        nextReview,
        lastReviewed: currentTime
      };
    }));
    setNow(Date.now());
  }, []);

  const handleNext = useCallback(() => {
    setNow(Date.now());
  }, []);

  const handleDelete = (id: string) => {
    setWords(prev => prev.filter(w => w.id !== id));
  };

  const handleEnrichWord = async (wordToEnrich: Word) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await enrichWordWithAI(wordToEnrich.term);
      setWords(prev => prev.map(w => {
        if (w.id === wordToEnrich.id) {
          return { ...w, ...data };
        }
        return w;
      }));
    } catch (err: any) {
      if (err.message?.includes("API Key")) {
          setError("未配置 API Key。请在托管平台设置环境变量 (VITE_API_KEY)。");
      } else {
          setError("AI 请求失败。请检查 DeepSeek 余额或网络连接。");
      }
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // --- OPTIMIZED BULK IMPORT (BATCH PROCESSING + INSTANT LOCAL) ---
  const handleImport = async (terms: string[]) => {
    setError(null);
    const currentTime = Date.now();
    
    const uniqueTerms = terms.filter(t => !words.some(w => w.term.toLowerCase() === t.toLowerCase()));
    
    if (uniqueTerms.length === 0) return;

    // 1. Create initial words (Instant Pre-fill from Local Dict)
    const newWords: Word[] = uniqueTerms.map((term, idx) => {
      const localMatch = AUTOCOMPLETE_DICT.find(d => d.term.toLowerCase() === term.toLowerCase());
      return {
        id: `new-${currentTime}-${idx}-${Math.random().toString(36).substr(2, 5)}`,
        term,
        meanings: localMatch ? [{
            partOfSpeech: localMatch.pos,
            definition: localMatch.definition,
            example: "Waiting for AI...",
            translation: "等待 AI 生成例句..."
        }] : [], 
        status: WordStatus.New,
        tags: ['导入'],
        nextReview: currentTime,
        interval: 0,
        repetitions: 0,
        easeFactor: 2.5
      };
    });

    setWords(prev => [...newWords, ...prev]);
    if (mode === 'import') {
        setMode('list');
    }
    
    setSearchTerm('');
    setShowSearchDropdown(false);
    
    const total = newWords.length;
    setEnrichProgress({ current: 0, total });

    // 2. Batch Processing Configuration (Speed Optimized)
    const BATCH_SIZE = 3; // Smaller chunks for faster initial feedback
    const CONCURRENCY = 6; // Higher concurrency to maximize throughput

    const chunkArray = (arr: Word[], size: number) => {
        const results = [];
        for (let i = 0; i < arr.length; i += size) {
            results.push(arr.slice(i, i + size));
        }
        return results;
    };

    const wordChunks = chunkArray(newWords, BATCH_SIZE);
    let completedCount = 0;

    const processChunk = async (chunk: Word[]) => {
      try {
        const termsToFetch = chunk.map(w => w.term);
        const enrichedResults = await batchEnrichWords(termsToFetch);
        
        setWords(prev => prev.map(w => {
            const result = enrichedResults.find(r => r.term?.toLowerCase() === w.term.toLowerCase() || w.term.toLowerCase().includes(r.term?.toLowerCase() || ""));
            if (result && chunk.some(cw => cw.id === w.id)) {
                return { ...w, ...result };
            }
            return w;
        }));
      } catch (e: any) {
         // Error Fallback: Don't leave it hanging
         setWords(prev => prev.map(w => {
             if (chunk.some(cw => cw.id === w.id)) {
                 return {
                     ...w,
                     meanings: w.meanings.map(m => ({ ...m, example: "解析失败: 请检查 API Key" }))
                 };
             }
             return w;
         }));
         setError("部分单词解析失败，请检查 DeepSeek API Key。");
      } finally {
        completedCount += chunk.length;
        setEnrichProgress({ current: Math.min(completedCount, total), total });
      }
    };

    const runQueue = async () => {
      const queue = [...wordChunks];
      const activeWorkers: Promise<void>[] = [];
      while (queue.length > 0 || activeWorkers.length > 0) {
        while (queue.length > 0 && activeWorkers.length < CONCURRENCY) {
          const chunk = queue.shift()!;
          const worker = processChunk(chunk).then(() => {
            activeWorkers.splice(activeWorkers.indexOf(worker), 1);
          });
          activeWorkers.push(worker);
        }
        if (activeWorkers.length > 0) await Promise.race(activeWorkers);
      }
      setEnrichProgress(null);
    };

    runQueue();
  };

  const handleLoadSample = () => {
    const sampleTerms = ['superfluous', 'ambiguous', 'consensus', 'plausible', 'scrutiny', 'mitigate', 'paradox', 'dilemma', 'pragmatic', 'aesthetic'];
    handleImport(sampleTerms);
  };

  const handleLookup = (term: string) => {
    setLookupTerm(term);
    setMode('dictionary');
    setSearchTerm('');
    setShowSearchDropdown(false);
  };

  const handleQuickAdd = (term: string) => {
      handleImport([term]);
  };

  const handleAddToVocabulary = (newWord: Word) => {
    setWords(prev => [newWord, ...prev]);
  };

  const handleSearchChange = (text: string) => {
    setSearchTerm(text);
    if (!text.trim()) {
      setSearchSuggestions([]);
      setShowSearchDropdown(false);
      return;
    }

    const lowerText = text.toLowerCase();
    const matches = AUTOCOMPLETE_DICT
        .filter(entry => entry.term.toLowerCase().startsWith(lowerText))
        .sort((a, b) => a.term.length - b.term.length)
        .slice(0, 6);
    
    setSearchSuggestions(matches);
    setShowSearchDropdown(true);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (mode !== 'study' || !currentWord) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === '1') {
        handleStatusChange(currentWord.id, WordStatus.New);
        handleNext();
      } else if (e.key === '2') {
        handleStatusChange(currentWord.id, WordStatus.Learning);
        handleNext();
      } else if (e.key === '3') {
        handleStatusChange(currentWord.id, WordStatus.Mastered);
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, currentWord, handleStatusChange, handleNext]);


  return (
    <div className="flex flex-col h-full bg-pattern text-slate-900 relative selection:bg-indigo-100 selection:text-indigo-700">
      
      {showInstallGuide && (
          <InstallGuide onClose={() => setShowInstallGuide(false)} isIOS={isIOS} />
      )}

      <div className="fixed top-[-20%] left-[-10%] w-[600px] h-[600px] bg-indigo-200/40 rounded-full blur-3xl pointer-events-none z-0 mix-blend-multiply opacity-70"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-emerald-100/50 rounded-full blur-3xl pointer-events-none z-0 mix-blend-multiply opacity-70"></div>
      <div className="fixed top-[20%] right-[20%] w-[300px] h-[300px] bg-rose-100/40 rounded-full blur-3xl pointer-events-none z-0 mix-blend-multiply opacity-70"></div>

      <header className="fixed top-0 left-0 right-0 z-50 px-4 py-4 md:px-6">
        <div className="max-w-5xl mx-auto bg-white/70 backdrop-blur-xl border border-white/50 shadow-sm rounded-2xl px-4 py-3 flex justify-between items-center gap-4 relative">
          
          <div className="flex items-center gap-3 shrink-0 cursor-pointer" onClick={() => setMode('study')}>
            <div className="bg-gradient-to-tr from-indigo-600 to-indigo-500 p-2 rounded-xl shadow-lg shadow-indigo-200 hidden sm:block">
              <GraduationCap className="text-white" size={20} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800 leading-none hidden xs:block">考研 AI</h1>
              <div className="flex items-center gap-1 mt-1 hidden xs:flex">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">DeepSeek CN</p>
              </div>
            </div>
          </div>
          
          <div className="flex-1 max-w-md relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
            <input 
              type="text" 
              placeholder="智能查词..." 
              className="w-full pl-9 pr-4 py-2 bg-slate-100/50 border-none rounded-xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all outline-none"
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => {
                  if(searchTerm) setShowSearchDropdown(true);
              }}
              onBlur={() => setTimeout(() => setShowSearchDropdown(false), 250)}
              onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchTerm.trim()) {
                      handleLookup(searchTerm);
                  }
              }}
            />

            {showSearchDropdown && (
               <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-xl rounded-xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-50 max-h-[60vh] overflow-y-auto no-scrollbar">
                  <div className="py-1">
                     {searchSuggestions.map(suggestion => {
                        const existingWord = words.find(w => w.term.toLowerCase() === suggestion.term.toLowerCase());
                        return (
                           <div 
                             key={suggestion.term} 
                             className="px-4 py-3 border-b border-slate-50 hover:bg-indigo-50 cursor-pointer group transition-colors flex items-center justify-between"
                             onMouseDown={(e) => e.preventDefault()} 
                             onClick={() => handleLookup(suggestion.term)}
                           >
                             <div className="flex flex-col flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{suggestion.term}</span>
                                    <span className="text-xs font-mono text-indigo-500 bg-indigo-50 px-1.5 rounded border border-indigo-100/50">{suggestion.pos}</span>
                                </div>
                                <span className="text-xs text-slate-400 mt-0.5 truncate max-w-[180px]">{suggestion.definition}</span>
                             </div>

                             {existingWord ? (
                                 <div className="flex items-center gap-1 text-emerald-600 text-[10px] font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
                                     <CheckCircle2 size={12} />
                                     <span>已添加</span>
                                 </div>
                             ) : (
                                 <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleQuickAdd(suggestion.term);
                                    }}
                                    className="p-1.5 rounded-lg hover:bg-indigo-100 text-slate-400 hover:text-indigo-600 transition-all"
                                    title="快速导入"
                                 >
                                     <Plus size={16} strokeWidth={3} />
                                 </button>
                             )}
                           </div>
                        );
                     })}

                     {searchTerm && (
                         <div 
                            className="px-4 py-3 hover:bg-indigo-50 cursor-pointer group flex items-center justify-between bg-slate-50/50"
                            onMouseDown={(e) => e.preventDefault()} 
                            onClick={() => handleLookup(searchTerm)}
                         >
                            <div className="flex items-center gap-3">
                                <div className="bg-indigo-100 text-indigo-600 p-1.5 rounded-lg">
                                    <Search size={16} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-indigo-600">AI 深度查询 "{searchTerm}"</span>
                                    <span className="text-[10px] text-slate-400">联网获取音标、释义、真题例句...</span>
                                </div>
                            </div>
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleQuickAdd(searchTerm);
                                }}
                                className="p-1.5 rounded-lg hover:bg-indigo-100 text-indigo-400 hover:text-indigo-600 transition-all"
                            >
                                <Plus size={16} strokeWidth={3} />
                            </button>
                         </div>
                     )}
                  </div>
               </div>
            )}
          </div>
          
          <div className="flex gap-2 shrink-0 items-center">
             <button 
                onClick={handleInstallClick}
                className="flex items-center gap-1.5 bg-slate-900 text-white px-3 py-2 rounded-xl text-xs font-bold hover:bg-slate-800 transition-all shadow-md shadow-slate-200 active:scale-95"
             >
                <Smartphone size={14} />
                <span className="hidden xs:inline">安装 App</span>
             </button>

             <div className="hidden md:flex gap-6 ml-2">
                <div className="text-center">
                  <div className="text-xs text-slate-400 font-medium mb-0.5">已掌握</div>
                  <div className="text-sm font-bold text-emerald-600">{stats.mastered}</div>
                </div>
             </div>
             <div className="md:hidden flex items-center gap-1.5 bg-slate-100/50 px-3 py-1.5 rounded-lg border border-slate-200/50">
               <CheckCircle2 size={14} className="text-emerald-500" />
               <span className="text-xs font-bold text-slate-700">{stats.mastered}</span>
             </div>
          </div>
        </div>
      </header>

      <main className="flex-grow relative w-full h-full overflow-hidden z-10 pt-24 pb-28 px-4">
        {error && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-white/90 backdrop-blur border border-rose-100 text-rose-600 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-bounce">
            <div className="bg-rose-100 p-1 rounded-full"><AlertCircle size={16} /></div>
            <span className="text-sm font-medium">{error}</span>
            <button className="ml-2 text-slate-400 hover:text-slate-600" onClick={() => setError(null)}>×</button>
          </div>
        )}

        {enrichProgress && (
           <div className="fixed bottom-28 right-4 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl shadow-indigo-500/20 flex items-center gap-3 animate-in slide-in-from-bottom-4 duration-300 border border-slate-800">
             <Loader2 size={18} className="animate-spin text-indigo-400" />
             <div className="flex flex-col">
               <span className="text-xs font-bold text-indigo-200 uppercase tracking-wider">AI 解析中</span>
               <span className="text-sm font-medium">
                 处理第 {enrichProgress.current} / {enrichProgress.total} 个单词...
               </span>
             </div>
           </div>
        )}

        <div className="w-full h-full max-w-5xl mx-auto transition-all duration-500 ease-in-out">
          {mode === 'study' && (
            currentWord ? (
              <div className="w-full h-full flex flex-col items-center justify-center perspective-1000">
                <Flashcard 
                  key={currentWord.id} 
                  word={currentWord} 
                  onStatusChange={handleStatusChange}
                  onNext={handleNext}
                />
                <div className="mt-6 flex flex-col items-center gap-2">
                  <div className="bg-white/40 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/50 text-slate-500 text-xs font-medium shadow-sm">
                    今日剩余: <span className="font-bold text-indigo-600">{studyQueue.length}</span> 个单词
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full animate-in fade-in zoom-in duration-500">
                <div className="bg-white p-8 md:p-12 rounded-3xl shadow-2xl shadow-indigo-100 text-center border border-slate-50 max-w-md mx-auto relative overflow-hidden group">
                  <div className="text-7xl mb-6 relative z-10 animate-bounce delay-100">🎉</div>
                  <h2 className="text-3xl font-bold text-slate-800 mb-3 relative z-10">任务完成!</h2>
                  <p className="text-slate-500 mb-8 leading-relaxed relative z-10">
                    今日任务已全部完成。<br/>
                    休息一下，明天再来挑战！
                  </p>
                  <button 
                    onClick={() => setMode('list')} 
                    className="relative z-10 w-full py-3.5 bg-slate-900 text-white rounded-2xl font-semibold shadow-xl shadow-slate-200 hover:shadow-2xl hover:scale-[1.02] transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <LayoutGrid size={18} />
                    浏览词汇表
                  </button>
                </div>
              </div>
            )
          )}

          {mode === 'list' && (
            <div className="h-full bg-white/80 backdrop-blur-md rounded-3xl shadow-xl border border-white/60 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
              <WordList 
                words={words} 
                onDelete={handleDelete} 
                onEnrich={handleEnrichWord}
                onImport={(terms) => handleImport(terms)}
                onLookup={(term) => handleLookup(term)}
                onSelectWord={(word) => {
                   setLookupTerm(word.term);
                   setMode('dictionary');
                }}
                isEnriching={isLoading}
                searchTerm={searchTerm}
              />
            </div>
          )}

          {mode === 'import' && (
            <div className="h-full flex items-center justify-center animate-in fade-in zoom-in duration-300">
              <div className="w-full max-w-2xl">
                <ImportModal 
                  onImport={handleImport} 
                  onLoadSample={handleLoadSample}
                  isProcessing={enrichProgress !== null}
                />
              </div>
            </div>
          )}

          {mode === 'dictionary' && lookupTerm && (
             <div className="h-full bg-white/80 backdrop-blur-md rounded-3xl shadow-xl border border-white/60 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                 <DictionaryDetail 
                    term={lookupTerm}
                    existingWord={words.find(w => w.term.toLowerCase() === lookupTerm.toLowerCase())}
                    onAdd={handleAddToVocabulary}
                    onRemove={handleDelete}
                    onBack={() => setMode('list')}
                 />
             </div>
          )}
        </div>
      </main>

      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
        <nav className="bg-slate-900/90 backdrop-blur-xl text-slate-400 rounded-full p-1.5 shadow-2xl shadow-slate-900/20 border border-slate-700/50 flex items-center gap-1">
          
          <button 
            onClick={() => setMode('study')}
            className={`relative px-6 py-3 rounded-full transition-all duration-300 flex items-center gap-2 ${
              mode === 'study' 
                ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/40 font-semibold' 
                : 'hover:text-white hover:bg-white/10'
            }`}
          >
            <Book size={20} strokeWidth={2.5} />
            {mode === 'study' && <span className="text-sm animate-in fade-in slide-in-from-left-2 duration-300">背诵</span>}
          </button>
          
          <div className="w-px h-6 bg-slate-700/50 mx-1"></div>

          <button 
             onClick={() => setMode('import')}
             className={`relative p-3 rounded-full transition-all duration-300 ${
               mode === 'import' 
                 ? 'bg-white text-slate-900 shadow-lg font-semibold' 
                 : 'hover:text-white hover:bg-white/10'
             }`}
             title="添加"
          >
            <Plus size={22} strokeWidth={2.5} />
          </button>

          <button 
            onClick={() => setMode('list')}
            className={`relative p-3 rounded-full transition-all duration-300 ${
              (mode === 'list' || mode === 'dictionary')
                ? 'bg-white text-slate-900 shadow-lg font-semibold' 
                : 'hover:text-white hover:bg-white/10'
            }`}
            title="词表"
          >
            <List size={22} strokeWidth={2.5} />
          </button>
        </nav>
      </div>
    </div>
  );
};

export default App;
