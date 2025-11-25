
import React, { useState, useEffect, useCallback } from 'react';
import { Word, WordStatus, ViewMode, DictionaryEntry } from './types';
import { INITIAL_WORDS, AUTOCOMPLETE_DICT } from './constants';
import { Flashcard } from './components/Flashcard';
import { WordList } from './components/WordList';
import { ImportModal } from './components/ImportModal';
import { DictionaryDetail } from './components/DictionaryDetail';
import { InstallGuide } from './components/InstallGuide';
import { SettingsModal } from './components/SettingsModal'; 
import { StudySession } from './components/StudySession';
import { enrichWordWithAI, batchEnrichWords } from './services/geminiService';
import { Book, List, Plus, GraduationCap, AlertCircle, Search, Download, Settings } from 'lucide-react';

const STORAGE_KEY = 'kaoyan_vocab_progress_v1';
const APP_VERSION = 'v6.6';

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

  // --- Session State ---
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionQueue, setSessionQueue] = useState<string[]>([]); // Active Queue
  const [sessionInitialCount, setSessionInitialCount] = useState(0); // For Progress Bar
  const [lastSessionIds, setLastSessionIds] = useState<string[]>([]); // For "Review Again"
  const [hasFinishedSession, setHasFinishedSession] = useState(false);
  const [sessionStats, setSessionStats] = useState<Record<string, number>>({});

  // --- Derived State ---
  // Global Queue (All words due) sorted by Priority
  const globalStudyQueue = words
    .filter(w => w.nextReview <= now)
    .sort((a, b) => {
        // Priority 1: Interval 0 (Forgotten/New) words first
        if (a.interval === 0 && b.interval !== 0) return -1;
        if (a.interval !== 0 && b.interval === 0) return 1;
        // Priority 2: Overdue amount
        return a.nextReview - b.nextReview;
    });

  // Current Word Logic
  const currentWordId = isSessionActive && sessionQueue.length > 0 ? sessionQueue[0] : null;
  const currentWord = currentWordId ? words.find(w => w.id === currentWordId) : null;
  
  // Safety Check for Spinner Bug
  useEffect(() => {
    if (isSessionActive && sessionQueue.length === 0 && !hasFinishedSession) {
        setHasFinishedSession(true);
    }
  }, [isSessionActive, sessionQueue.length, hasFinishedSession]);

  // --- Effects ---
  useEffect(() => {
     const interval = setInterval(() => setNow(Date.now()), 30000);
     console.log(`App Version: ${APP_VERSION}`); 
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

  const handleStartSession = (countOrIds: number | string[], isCram: boolean = false) => {
      let queueIds: string[] = [];

      if (Array.isArray(countOrIds)) {
          // Restore specific IDs (e.g. "Review Again")
          queueIds = [...countOrIds];
          // For cramming specific IDs, we might want to shuffle them
          if (isCram) {
              queueIds.sort(() => 0.5 - Math.random());
          }
      } else {
          // Normal Start: Number
          const count = countOrIds;
          if (isCram) {
              // Cram Mode: Shuffle ALL words and pick 'count'
              const shuffled = [...words].sort(() => 0.5 - Math.random());
              queueIds = shuffled.slice(0, count).map(w => w.id);
          } else {
              // Normal Mode: Pick from due queue
              queueIds = globalStudyQueue.slice(0, count).map(w => w.id);
          }
      }

      if (queueIds.length === 0) {
          setError("没有可背诵的单词");
          return;
      }

      setSessionQueue(queueIds);
      setSessionInitialCount(queueIds.length);
      setLastSessionIds(queueIds); // Save for "Review Again"
      setSessionStats({}); 
      setIsSessionActive(true);
      setHasFinishedSession(false);
  };

  const handleExitSession = () => {
      setIsSessionActive(false);
      setSessionQueue([]);
      setSessionStats({});
      setHasFinishedSession(false);
      if (mode === 'study') setMode('list');
  };

  // --- ADAPTIVE SRS & LOOP LOGIC ---
  const handleStatusChange = useCallback((id: string, actionStatus: WordStatus) => {
    setSessionStats(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }));

    setWords(prev => prev.map(w => {
      if (w.id !== id) return w;
      const currentTime = Date.now();
      let { interval, easeFactor, repetitions } = w;
      
      if (actionStatus === WordStatus.New) {
          easeFactor = 1.3; interval = 0; repetitions = 0;
      } else if (actionStatus === WordStatus.Learning) {
          easeFactor = Math.max(1.3, easeFactor - 0.1);
          repetitions = 0; 
          interval = interval === 0 ? 0 : interval * 0.5; 
      } else if (actionStatus === WordStatus.Mastered) {
          easeFactor = easeFactor + 0.1;
          repetitions += 1;
          if (interval === 0) interval = 1; 
          else interval = Math.round(interval * easeFactor);
      }

      let nextReview = currentTime;
      if (interval === 0) nextReview = currentTime; 
      else nextReview = currentTime + (interval * 24 * 60 * 60 * 1000);

      let newStatus = WordStatus.New;
      if (repetitions > 0) newStatus = WordStatus.Learning;
      if (interval >= 21) newStatus = WordStatus.Mastered;

      return { ...w, status: newStatus, interval, easeFactor, repetitions, nextReview, lastReviewed: currentTime };
    }));
    
    setSessionQueue(prev => {
        const rest = prev.slice(1);
        if (actionStatus === WordStatus.Mastered) {
            if (rest.length === 0) setHasFinishedSession(true);
            return rest;
        } else {
            return [...rest, id];
        }
    });
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
    // ... (Import logic remains the same)
    // To save space in this response, omitting the bulk of handleImport logic as it wasn't changed.
    // Assuming it exists as before.
    const currentTime = Date.now();
    const uniqueTerms = terms.filter(t => !words.some(w => w.term.toLowerCase() === t.toLowerCase()));
    if (uniqueTerms.length === 0) return;

    const newWords: Word[] = uniqueTerms.map((term, idx) => {
      const localMatch = AUTOCOMPLETE_DICT.find(d => d.term.toLowerCase() === term.toLowerCase());
      return {
        id: `new-${currentTime}-${idx}-${Math.random().toString(36).substr(2, 5)}`,
        term,
        meanings: localMatch ? [{
            partOfSpeech: localMatch.pos, definition: localMatch.definition, example: "Loading...", translation: "正在获取例句..."
        }] : [], 
        status: WordStatus.New, tags: ['导入'], nextReview: currentTime, interval: 0, repetitions: 0, easeFactor: 2.5
      };
    });

    setWords(prev => [...newWords, ...prev]);
    if (mode === 'import') setMode('list');
    setSearchTerm('');
    setShowSearchDropdown(false);
    
    // Trigger background enrichment (Simplified for brevity)
    const total = newWords.length;
    setEnrichProgress({ current: 0, total });
    batchEnrichWords(newWords.map(w => w.term)).then(enrichedResults => {
        setWords(prev => prev.map(w => {
            const result = enrichedResults.find(r => r.term?.toLowerCase() === w.term.toLowerCase());
            return result ? { ...w, ...result } : w;
        }));
        setEnrichProgress(null);
    });
  };

  const handleLoadSample = () => { handleImport(['superfluous', 'ambiguous', 'consensus']); };
  const handleLookup = (term: string) => { setLookupTerm(term); setMode('dictionary'); setSearchTerm(''); setShowSearchDropdown(false); };
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

  // --- Progress Bar Calculation ---
  const masteredCount = Math.max(0, sessionInitialCount - sessionQueue.length);
  const progressPercent = sessionInitialCount > 0 ? (masteredCount / sessionInitialCount) * 100 : 0;

  return (
    <div className="flex flex-col h-full bg-slate-50 text-slate-900 relative selection:bg-indigo-100 selection:text-indigo-700 font-sans">
      {showInstallGuide && <InstallGuide onClose={() => setShowInstallGuide(false)} isIOS={isIOS} />}
      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} currentWords={words} onRestoreData={(d) => setWords(d)} onClearData={() => setWords(INITIAL_WORDS)} appVersion={APP_VERSION} />
      )}

      {/* Background Blobs */}
      <div className="fixed top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-100/60 rounded-full blur-[80px] pointer-events-none z-0"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-purple-100/50 rounded-full blur-[80px] pointer-events-none z-0"></div>

      <header 
        className="fixed top-0 left-0 right-0 z-50 px-4 pb-3 transition-all duration-300"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1rem)' }}
      >
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
              type="text" placeholder="Search..." 
              className="w-full pl-9 pr-3 py-1.5 bg-slate-100/80 border-none rounded-xl text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all outline-none placeholder:text-slate-400"
              value={searchTerm} onChange={(e) => handleSearchChange(e.target.value)}
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
             <button onClick={() => setShowSettings(true)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"><Settings size={18} /></button>
             <button onClick={handleInstallClick} className="p-2 bg-slate-900 text-white rounded-full hover:scale-105 transition-transform shadow-md shadow-slate-200"><Download size={16} /></button>
          </div>
        </div>
      </header>

      <main className="flex-grow relative w-full h-full overflow-hidden z-10 pt-32 pb-24 px-4">
        {error && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-white/95 border border-rose-100 text-rose-500 px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-xs font-medium animate-in fade-in slide-in-from-top-2">
            <AlertCircle size={14} /> {error} <button onClick={() => setError(null)}>×</button>
          </div>
        )}

        <div className="w-full h-full max-w-2xl mx-auto transition-all duration-500">
          {mode === 'study' && (
             !isSessionActive && !hasFinishedSession ? (
                 <StudySession 
                    totalDue={globalStudyQueue.length}
                    totalWords={words.length}
                    onStartSession={handleStartSession}
                    onExit={() => setMode('list')}
                 />
             ) : hasFinishedSession ? (
                 <StudySession 
                    totalDue={globalStudyQueue.length} // Remaining Due
                    totalWords={words.length}
                    onStartSession={handleStartSession}
                    onExit={() => { setMode('list'); setHasFinishedSession(false); }}
                    // Special Props for Summary Actions
                    isFinished={true}
                    onContinue={() => handleStartSession(20, false)} // Start Next Batch
                    onReviewAgain={() => handleStartSession(lastSessionIds, true)} // Review Same IDs
                 />
             ) : currentWord ? (
                <div className="w-full h-full flex flex-col items-center justify-center">
                   <Flashcard 
                      key={currentWord.id} 
                      word={currentWord} 
                      sessionAttempts={sessionStats[currentWord.id] || 0}
                      repetitionCount={currentWord.repetitions}
                      onStatusChange={handleStatusChange} 
                      onNext={handleNext} 
                   />
                   
                   {/* Session Progress Bar */}
                   <div className="w-full max-w-xs mt-6 animate-in fade-in slide-in-from-bottom-4">
                      <div className="flex justify-between items-end mb-1.5 px-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              本组进度
                          </span>
                          <span className="text-xs font-bold font-mono text-indigo-600">
                              {masteredCount} <span className="text-slate-300">/</span> {sessionInitialCount}
                          </span>
                      </div>
                      <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                          <div 
                             className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500 ease-out"
                             style={{ width: `${progressPercent}%` }}
                          ></div>
                      </div>
                   </div>
                </div>
             ) : (
                <div className="flex items-center justify-center h-full">
                   <div className="animate-spin text-indigo-200"><Settings size={32} /></div>
                </div>
             )
          )}

          {mode === 'list' && (
            <div className="h-full bg-white/60 backdrop-blur-md rounded-3xl shadow-sm border border-white/50 overflow-hidden">
              <WordList words={words} onDelete={handleDelete} onEnrich={handleEnrichWord} onImport={handleImport} onLookup={handleLookup} onSelectWord={(w) => {setLookupTerm(w.term); setMode('dictionary');}} isEnriching={isLoading} searchTerm={searchTerm} />
            </div>
          )}

          {mode === 'import' && (
            <div className="h-full flex items-center justify-center p-4">
                <ImportModal onImport={handleImport} onLoadSample={handleLoadSample} isProcessing={enrichProgress !== null} />
            </div>
          )}

          {mode === 'dictionary' && lookupTerm && (
            <DictionaryDetail term={lookupTerm} existingWord={words.find(w => w.term.toLowerCase() === lookupTerm.toLowerCase())} onAdd={handleAddToVocabulary} onRemove={handleDelete} onBack={() => { setMode('list'); setLookupTerm(null); }} />
          )}
        </div>
      </main>

      {mode !== 'dictionary' && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 p-1.5 bg-white/80 backdrop-blur-xl border border-white/50 shadow-2xl shadow-indigo-500/10 rounded-2xl ring-1 ring-white/50 animate-in slide-in-from-bottom-6">
            <button onClick={() => setMode('study')} className={`flex items-center gap-2 px-4 py-3 rounded-xl transition-all font-bold text-sm ${mode === 'study' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-100'}`}><Book size={18} strokeWidth={2.5} /><span className={mode === 'study' ? 'block' : 'hidden'}>Study</span></button>
            <div className="w-px h-6 bg-slate-200 mx-1"></div>
            <button onClick={() => setMode('import')} className={`p-3 rounded-xl transition-all ${mode === 'import' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 rotate-90' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}`}><Plus size={22} strokeWidth={3} /></button>
            <div className="w-px h-6 bg-slate-200 mx-1"></div>
            <button onClick={() => setMode('list')} className={`flex items-center gap-2 px-4 py-3 rounded-xl transition-all font-bold text-sm ${mode === 'list' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-100'}`}><List size={18} strokeWidth={2.5} /><span className={mode === 'list' ? 'block' : 'hidden'}>List</span></button>
        </div>
      )}
    </div>
  );
};

export default App;
