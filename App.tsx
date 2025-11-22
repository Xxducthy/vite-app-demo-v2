
import React, { useState, useEffect, useCallback } from 'react';
import { Word, WordStatus, ViewMode, DictionaryEntry } from './types';
import { INITIAL_WORDS, AUTOCOMPLETE_DICT } from './constants';
import { Flashcard } from './components/Flashcard';
import { WordList } from './components/WordList';
import { ImportModal } from './components/ImportModal';
import { DictionaryDetail } from './components/DictionaryDetail';
import { InstallGuide } from './components/InstallGuide';
import { SettingsModal } from './components/SettingsModal'; 
import { enrichWordWithAI, batchEnrichWords } from './services/geminiService';
import { Book, List, Plus, GraduationCap, AlertCircle, Sparkles, LayoutGrid, Search, Loader2, CheckCircle2, ArrowRight, Download, Share, HelpCircle, Settings, Smartphone, Clock, TrendingUp } from 'lucide-react';

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
  const [enrichProgress, setEnrichProgress] = useState<{current: number, total: number} | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState<DictionaryEntry[]>([]);
  const [lookupTerm, setLookupTerm] = useState<string | null>(null);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // --- Derived State (The "Plan") ---
  // 1. Words due for review (Next Review Time <= Now) AND already started learning
  const dueWords = words.filter(w => w.status !== WordStatus.New && w.nextReview <= now);
  
  // 2. New words ready to learn
  const newWords = words.filter(w => w.status === WordStatus.New);

  // Priority Queue: Due Reviews -> New Words -> Future Reviews (sorted by time)
  const studyQueue = [
      ...dueWords.sort((a, b) => a.nextReview - b.nextReview),
      ...newWords
  ];

  const currentWord = studyQueue.length > 0 ? studyQueue[0] : null;
  
  const stats = {
    total: words.length,
    mastered: words.filter(w => w.status === WordStatus.Mastered).length,
    learning: words.filter(w => w.status === WordStatus.Learning).length,
    new: words.filter(w => w.status === WordStatus.New).length,
    due: dueWords.length
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
      installPrompt.prompt();
      installPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          setInstallPrompt(null);
        }
      });
    } else {
        setShowInstallGuide(true);
    }
  };

  const handleStatusChange = useCallback((id: string, actionStatus: WordStatus) => {
    setWords(prev => prev.map(w => {
      if (w.id !== id) return w;
      const currentTime = Date.now();
      let { interval, easeFactor, repetitions } = w;
      let quality = 0;
      if (actionStatus === WordStatus.New) quality = 0;
      else if (actionStatus === WordStatus.Learning) quality = 3;
      else if (actionStatus === WordStatus.Mastered) quality = 5;

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
      // Scheduling Logic
      if (quality === 0) nextReview = currentTime + 60 * 1000; 
      else if (quality === 3 && repetitions <= 1) nextReview = currentTime + 10 * 60 * 1000;
      else nextReview = currentTime + (interval * 24 * 60 * 60 * 1000);

      let newStatus = WordStatus.New;
      if (repetitions > 0) newStatus = WordStatus.Learning;
      if (interval >= 21) newStatus = WordStatus.Mastered;

      return {
        ...w, status: newStatus, interval, easeFactor, repetitions, nextReview, lastReviewed: currentTime
      };
    }));
    setNow(Date.now());
  }, []);

  const handleNext = useCallback(() => { setNow(Date.now()); }, []);
  const handleDelete = (id: string) => { setWords(prev => prev.filter(w => w.id !== id)); };

  const handleEnrichWord = async (wordToEnrich: Word) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await enrichWordWithAI(wordToEnrich.term);
      setWords(prev => prev.map(w => {
        if (w.id === wordToEnrich.id) { return { ...w, ...data }; }
        return w;
      }));
    } catch (err: any) {
      let msg = "AI 请求失败";
      if (err.message?.includes("401")) msg = "Key 无效 (401)";
      else if (err.message?.includes("Timeout")) msg = "请求超时";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async (terms: string[]) => {
    setError(null);
    const currentTime = Date.now();
    const uniqueTerms = terms.filter(t => !words.some(w => w.term.toLowerCase() === t.toLowerCase()));
    if (uniqueTerms.length === 0) return;

    const newWordsData: Word[] = uniqueTerms.map((term, idx) => {
      const localMatch = AUTOCOMPLETE_DICT.find(d => d.term.toLowerCase() === term.toLowerCase());
      return {
        id: `new-${currentTime}-${idx}-${Math.random().toString(36).substr(2, 5)}`,
        term,
        meanings: localMatch ? [{
            partOfSpeech: localMatch.pos,
            definition: localMatch.definition,
            example: "Loading...",
            translation: "正在获取例句..."
        }] : [], 
        status: WordStatus.New,
        tags: ['导入'],
        nextReview: currentTime,
        interval: 0,
        repetitions: 0,
        easeFactor: 2.5
      };
    });

    setWords(prev => [...newWordsData, ...prev]);
    if (mode === 'import') setMode('list');
    setSearchTerm('');
    setShowSearchDropdown(false);
    
    const total = newWordsData.length;
    setEnrichProgress({ current: 0, total });

    const BATCH_SIZE = 3; 
    const CONCURRENCY = 6; 
    const chunkArray = (arr: Word[], size: number) => {
        const results = [];
        for (let i = 0; i < arr.length; i += size) results.push(arr.slice(i, i + size));
        return results;
    };
    const wordChunks = chunkArray(newWordsData, BATCH_SIZE);
    let completedCount = 0;

    const processChunk = async (chunk: Word[]) => {
      try {
        const termsToFetch = chunk.map(w => w.term);
        const enrichedResults = await batchEnrichWords(termsToFetch);
        setWords(prev => prev.map(w => {
            const result = enrichedResults.find(r => r.term?.toLowerCase() === w.term.toLowerCase() || w.term.toLowerCase().includes(r.term?.toLowerCase() || ""));
            if (result && chunk.some(cw => cw.id === w.id)) return { ...w, ...result };
            return w;
        }));
      } catch (e: any) {
         setWords(prev => prev.map(w => {
             if (chunk.some(cw => cw.id === w.id)) {
                 let reason = "解析失败";
                 if (e.message?.includes("401")) reason = "Key无效";
                 else if (e.message?.includes("Timeout")) reason = "超时";
                 return {
                     ...w,
                     meanings: w.meanings.length > 0 ? w.meanings.map(m => ({ ...m, example: reason })) : [{ partOfSpeech: "?", definition: reason, example: "请检查设置", translation: "" }]
                 };
             }
             return w;
         }));
         if (e.message?.includes("401")) setError("API Key 无效");
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
          const worker = processChunk(chunk).then(() => { activeWorkers.splice(activeWorkers.indexOf(worker), 1); });
          activeWorkers.push(worker);
        }
        if (activeWorkers.length > 0) await Promise.race(activeWorkers);
      }
      setEnrichProgress(null);
    };
    runQueue();
  };

  const handleLoadSample = () => {
    const sampleTerms = ['superfluous', 'ambiguous', 'consensus', 'plausible', 'scrutiny'];
    handleImport(sampleTerms);
  };

  const handleLookup = (term: string) => {
    setLookupTerm(term);
    setMode('dictionary');
    setSearchTerm('');
    setShowSearchDropdown(false);
  };

  const handleQuickAdd = (term: string) => { handleImport([term]); };
  const handleAddToVocabulary = (newWord: Word) => { setWords(prev => [newWord, ...prev]); };

  const handleSearchChange = (text: string) => {
    setSearchTerm(text);
    if (!text.trim()) { setSearchSuggestions([]); setShowSearchDropdown(false); return; }
    const lowerText = text.toLowerCase();
    const matches = AUTOCOMPLETE_DICT.filter(entry => entry.term.toLowerCase().startsWith(lowerText)).sort((a, b) => a.term.length - b.term.length).slice(0, 6);
    setSearchSuggestions(matches);
    setShowSearchDropdown(true);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (mode !== 'study' || !currentWord) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === '1') { handleStatusChange(currentWord.id, WordStatus.New); handleNext(); } 
      else if (e.key === '2') { handleStatusChange(currentWord.id, WordStatus.Learning); handleNext(); } 
      else if (e.key === '3') { handleStatusChange(currentWord.id, WordStatus.Mastered); handleNext(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, currentWord, handleStatusChange, handleNext]);

  // --- Render Dashboard or Flashcard ---
  const renderMainContent = () => {
    // 1. Dictionary Mode
    if (mode === 'dictionary' && lookupTerm) {
        return (
            <div className="h-full bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl border border-white overflow-hidden">
                <DictionaryDetail term={lookupTerm} existingWord={words.find(w => w.term.toLowerCase() === lookupTerm.toLowerCase())} onAdd={handleAddToVocabulary} onRemove={handleDelete} onBack={() => setMode('list')} />
            </div>
        );
    }

    // 2. Import Mode
    if (mode === 'import') {
        return (
            <div className="h-full flex items-center justify-center p-4">
                <ImportModal onImport={handleImport} onLoadSample={handleLoadSample} isProcessing={enrichProgress !== null} />
            </div>
        );
    }

    // 3. List Mode
    if (mode === 'list') {
        return (
            <div className="h-full bg-white/60 backdrop-blur-md rounded-3xl shadow-sm border border-white/50 overflow-hidden">
                <WordList words={words} onDelete={handleDelete} onEnrich={handleEnrichWord} onImport={handleImport} onLookup={handleLookup} onSelectWord={(w) => {setLookupTerm(w.term); setMode('dictionary');}} isEnriching={isLoading} searchTerm={searchTerm} />
            </div>
        );
    }

    // 4. Study Mode (The Dashboard / Flashcard Switch)
    if (mode === 'study') {
        if (currentWord) {
            return (
                <div className="w-full h-full flex flex-col items-center justify-center">
                    <div className="mb-4 flex items-center gap-2 px-3 py-1 bg-slate-200/50 rounded-full text-xs font-medium text-slate-500">
                        {stats.due > 0 ? (
                            <><Clock size={12} className="text-amber-500" /> 待复习: {stats.due}</>
                        ) : (
                            <><Sparkles size={12} className="text-indigo-500" /> 学习新词</>
                        )}
                    </div>
                    <Flashcard key={currentWord.id} word={currentWord} onStatusChange={handleStatusChange} onNext={handleNext} />
                </div>
            );
        } else {
            // Dashboard / Empty State
            return (
                <div className="h-full flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in duration-300">
                    <div className="w-full max-w-sm bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white p-8 text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-400 to-purple-400"></div>
                        
                        <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-indigo-600 shadow-inner ring-4 ring-white">
                            <TrendingUp size={32} />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800 mb-2">今日计划完成!</h2>
                        <p className="text-slate-500 text-sm mb-8">目前没有急需复习的单词。您可以休息一下，或者去词表里挑一些新词来背。</p>
                        
                        <div className="grid grid-cols-3 gap-3 mb-8">
                            <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                                <div className="text-xl font-bold text-emerald-700">{stats.mastered}</div>
                                <div className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider">已掌握</div>
                            </div>
                            <div className="bg-amber-50 p-3 rounded-xl border border-amber-100">
                                <div className="text-xl font-bold text-amber-700">{stats.learning}</div>
                                <div className="text-[10px] text-amber-400 uppercase font-bold tracking-wider">学习中</div>
                            </div>
                            <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100">
                                <div className="text-xl font-bold text-indigo-700">{stats.new}</div>
                                <div className="text-[10px] text-indigo-400 uppercase font-bold tracking-wider">新词</div>
                            </div>
                        </div>

                        <button onClick={() => setMode('list')} className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:scale-[1.02] transition-transform flex items-center justify-center gap-2">
                            <List size={18} /> 浏览词表
                        </button>
                    </div>
                </div>
            );
        }
    }
    return null;
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 text-slate-900 relative selection:bg-indigo-100 selection:text-indigo-700 font-sans">
      {showInstallGuide && <InstallGuide onClose={() => setShowInstallGuide(false)} isIOS={isIOS} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      {/* Softer Background Blobs */}
      <div className="fixed top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-100/60 rounded-full blur-[80px] pointer-events-none z-0"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-purple-100/50 rounded-full blur-[80px] pointer-events-none z-0"></div>

      <header className="fixed top-0 left-0 right-0 z-50 px-4 py-3 md:py-4">
        <div className="max-w-2xl mx-auto bg-white/80 backdrop-blur-xl border border-white/60 shadow-sm rounded-2xl px-4 py-2.5 flex justify-between items-center gap-3 relative">
          
          <div className="flex items-center gap-2 shrink-0 cursor-pointer group" onClick={() => setMode('study')}>
            <div className="bg-slate-900 p-1.5 rounded-lg shadow-md group-hover:scale-105 transition-transform">
              <GraduationCap className="text-white" size={18} />
            </div>
            <span className="font-bold text-slate-800 text-sm tracking-tight hidden xs:block">考研 AI</span>
          </div>
          
          <div className="flex-1 max-w-xs relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text" 
              placeholder="Search..." 
              className="w-full pl-9 pr-3 py-1.5 bg-slate-100/80 border-none rounded-xl text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all outline-none placeholder:text-slate-400"
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => { if(searchTerm) setShowSearchDropdown(true); }}
              onBlur={() => setTimeout(() => setShowSearchDropdown(false), 250)}
              onKeyDown={(e) => { if (e.key === 'Enter' && searchTerm.trim()) handleLookup(searchTerm); }}
            />
            {showSearchDropdown && (
               <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-xl rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50 max-h-[50vh] overflow-y-auto no-scrollbar">
                  {searchSuggestions.map(s => (
                     <div key={s.term} className="px-4 py-2.5 hover:bg-slate-50 cursor-pointer border-b border-slate-50/50 flex justify-between items-center" onClick={() => handleLookup(s.term)}>
                        <div><span className="font-bold text-sm text-slate-700">{s.term}</span> <span className="text-xs text-slate-400 ml-1">{s.definition}</span></div>
                        <Plus size={14} className="text-slate-300" onClick={(e) => {e.stopPropagation(); handleQuickAdd(s.term)}}/>
                     </div>
                  ))}
               </div>
            )}
          </div>
          
          <div className="flex gap-1.5 shrink-0">
             <button onClick={() => setShowSettings(true)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600">
                <Settings size={18} />
             </button>
             <button onClick={handleInstallClick} className="p-2 bg-slate-900 text-white rounded-full hover:scale-105 transition-transform shadow-md shadow-slate-200">
                <Download size={16} />
             </button>
          </div>
        </div>
      </header>

      <main className="flex-grow relative w-full h-full overflow-hidden z-10 pt-24 pb-24 px-4">
        {error && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-white/95 border border-rose-100 text-rose-500 px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-xs font-medium animate-in fade-in slide-in-from-top-2">
            <AlertCircle size={14} /> {error} <button onClick={() => setError(null)}>×</button>
          </div>
        )}

        <div className="w-full h-full max-w-2xl mx-auto transition-all duration-500">
          {renderMainContent()}
        </div>
      </main>

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <nav className="bg-white/90 backdrop-blur-xl p-1.5 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-white flex gap-1">
          <button onClick={() => setMode('study')} className={`px-5 py-2.5 rounded-full transition-all flex items-center gap-2 text-sm font-bold ${mode === 'study' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}>
            <Book size={18} /> {mode === 'study' && 'Study'}
          </button>
          <button onClick={() => setMode('import')} className={`p-2.5 rounded-full transition-all ${mode === 'import' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:bg-slate-50'}`}>
            <Plus size={20} />
          </button>
          <button onClick={() => setMode('list')} className={`p-2.5 rounded-full transition-all ${mode === 'list' || mode === 'dictionary' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:bg-slate-50'}`}>
            <List size={20} />
          </button>
        </nav>
      </div>
    </div>
  );
};

export default App;
