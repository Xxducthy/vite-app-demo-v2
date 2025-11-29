
import React, { useState, useEffect, useCallback } from 'react';
import { Word, WordStatus, ViewMode, DictionaryEntry, StudyHistory, StudyMode, ShopItem, UserCoupon, ComparatorResult, EtymologyResult } from './types';
import { INITIAL_WORDS, AUTOCOMPLETE_DICT } from './constants';
import { Flashcard } from './components/Flashcard';
import { WordList } from './components/WordList';
import { ImportModal } from './components/ImportModal';
import { DictionaryDetail } from './components/DictionaryDetail';
import { InstallGuide } from './components/InstallGuide';
import { SettingsModal } from './components/SettingsModal'; 
import { StudySession } from './components/StudySession';
import { Dashboard } from './components/Dashboard';
import { CommutePlayer } from './components/CommutePlayer';
import { LoveStore } from './components/LoveStore';
import { enrichWordWithAI, batchEnrichWords, generateStory, analyzeConfusion, analyzeEtymology } from './services/geminiService';
import { Book, List, Plus, GraduationCap, AlertCircle, Search, Settings, BookOpen, Gift } from 'lucide-react';

const STORAGE_KEY = 'kaoyan_vocab_progress_v1';
const HISTORY_KEY = 'kaoyan_study_history_v1';
const SESSION_STORAGE_KEY = 'kaoyan_session_state_v1';
const APP_VERSION = 'v8.2 (Speed)';

const App: React.FC = () => {
  // --- Data State ---
  const [words, setWords] = useState<Word[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : INITIAL_WORDS;
    } catch (e) { return INITIAL_WORDS; }
  });

  const [studyHistory, setStudyHistory] = useState<StudyHistory>(() => {
    try {
      const saved = localStorage.getItem(HISTORY_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch (e) { return {}; }
  });

  // --- Love Store State ---
  const [points, setPoints] = useState<number>(() => {
      return Number(localStorage.getItem('kaoyan_points') || 0);
  });
  
  const [inventory, setInventory] = useState<UserCoupon[]>(() => {
      try {
          return JSON.parse(localStorage.getItem('kaoyan_inventory') || '[]');
      } catch { return []; }
  });

  const DEFAULT_SHOP_ITEMS: ShopItem[] = [
      { id: 'item-1', name: '奶茶券', cost: 50, description: '请喝一杯喜欢的奶茶 (无视排队)', icon: '🧋', isCustom: false },
      { id: 'item-12', name: '叫醒服务', cost: 20, description: '明天早上打电话叫我起床，要温柔', icon: '⏰', isCustom: false },
      { id: 'item-2', name: '跑腿卡', cost: 30, description: '代取快递 / 或是去食堂买饭带回宿舍', icon: '🏃', isCustom: false },
      { id: 'item-6', name: '剥虾/水果', cost: 40, description: '吃饭时我不动手，只张嘴', icon: '🍤', isCustom: false },
      { id: 'item-5', name: '操场散步', cost: 50, description: '放下手机，陪你在操场散步/夜聊一小时', icon: '🌙', isCustom: false },
      { id: 'item-13', name: '帮背书包', cost: 50, description: '今天的书包有点重，归你了', icon: '🎒', isCustom: false },
      { id: 'item-4', name: '早起占座', cost: 60, description: '图书馆/自习室帮忙占个好位置', icon: '📚', isCustom: false },
      { id: 'item-14', name: '专属点歌', cost: 60, description: '想听什么你来唱，不许拒绝', icon: '🎤', isCustom: false },
      { id: 'item-15', name: '吹头发', cost: 80, description: '洗完澡帮我吹干头发，享受服务', icon: '💇‍♀️', isCustom: false },
      { id: 'item-3', name: '专属按摩', cost: 100, description: '自习累了？肩颈/手部按摩 20分钟', icon: '💆', isCustom: false },
      { id: 'item-18', name: '一起探店', cost: 150, description: '去一家收藏已久的网红店打卡吃好吃的', icon: '🍜', isCustom: false },
      { id: 'item-19', name: '穿情侣装', cost: 200, description: '陪我穿一天情侣装，宣示主权', icon: '👕', isCustom: false },
      { id: 'item-20', name: '手写情书', cost: 250, description: '认认真真给我写一封不少于500字的情书', icon: '💌', isCustom: false },
      { id: 'item-21', name: '通宵电影', cost: 300, description: '买好多零食，窝在一起通宵看电影/刷剧', icon: '🎬', isCustom: false },
      { id: 'item-16', name: '恐怖片护体', cost: 120, description: '陪看恐怖片，提供全程遮挡和抱抱服务', icon: '👻', isCustom: false },
      { id: 'item-7', name: '游戏带飞', cost: 150, description: '陪玩不坑，或者把把C', icon: '🎮', isCustom: false },
      { id: 'item-17', name: '专属摄影师', cost: 200, description: '出门游玩负责拍照，拍到满意为止', icon: '📸', isCustom: false },
      { id: 'item-8', name: '朋友圈特权', cost: 300, description: '发一条指定内容的朋友圈 (秀恩爱专用)', icon: '❤️', isCustom: false },
      { id: 'item-9', name: '停止冷战', cost: 600, description: '无论谁错，立刻和好，不许翻旧账', icon: '🏳️', isCustom: false },
      { id: 'item-10', name: '绝对服从券', cost: 800, description: '在合理范围内，无条件听从一个指令', icon: '👑', isCustom: false },
      { id: 'item-11', name: '神秘礼物', cost: 1000, description: '兑换一个实体小礼物 (口红/模型/周边)', icon: '🎁', isCustom: false },
      { id: 'item-22', name: '周末周边游', cost: 1500, description: '规划一次周末短途旅行，去附近的城市玩', icon: '🚄', isCustom: false },
  ];

  const [shopItems, setShopItems] = useState<ShopItem[]>(() => {
      try {
          const saved = JSON.parse(localStorage.getItem('kaoyan_shop_items') || '[]');
          return saved.length > 0 ? saved : DEFAULT_SHOP_ITEMS;
      } catch { return DEFAULT_SHOP_ITEMS; }
  });

  // --- UI State ---
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
  const [dailyGoal, setDailyGoal] = useState(50);
  
  // New: Commute Mode Playlist
  const [commutePlaylist, setCommutePlaylist] = useState<Word[] | null>(null);

  // --- Session State ---
  const [initialSessionState] = useState(() => {
    try {
      const saved = localStorage.getItem(SESSION_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch (e) { return null; }
  });

  const [isSessionActive, setIsSessionActive] = useState(initialSessionState?.isSessionActive || false);
  const [sessionQueue, setSessionQueue] = useState<string[]>(initialSessionState?.sessionQueue || []); 
  const [sessionInitialCount, setSessionInitialCount] = useState(initialSessionState?.sessionInitialCount || 0); 
  const [lastSessionIds, setLastSessionIds] = useState<string[]>(initialSessionState?.lastSessionIds || []); 
  const [hasFinishedSession, setHasFinishedSession] = useState(initialSessionState?.hasFinishedSession || false);
  const [lastBatchSize, setLastBatchSize] = useState(initialSessionState?.lastBatchSize || 20); 
  const [sessionLearningStreaks, setSessionLearningStreaks] = useState<Record<string, number>>(initialSessionState?.sessionLearningStreaks || {});
  const [sessionStats, setSessionStats] = useState<Record<string, number>>(initialSessionState?.sessionStats || {});
  const [studyMode, setStudyMode] = useState<StudyMode>(initialSessionState?.studyMode || 'flashcard');

  // --- Story Generation State ---
  const [preloadedStory, setPreloadedStory] = useState<{english: string, chinese: string} | null>(null);
  const [isStoryLoading, setIsStoryLoading] = useState(false);

  // --- Preloaded Extra Data (Etymology/Comparator) ---
  const [preloadedExtraData, setPreloadedExtraData] = useState<Record<string, { etymology?: EtymologyResult, comparator?: ComparatorResult }>>({});

  // --- Derived State ---
  const globalStudyQueue = words
    .filter(w => w.nextReview <= now)
    .sort((a, b) => {
        if (a.interval === 0 && b.interval !== 0) return -1;
        if (a.interval !== 0 && b.interval === 0) return 1;
        return a.nextReview - b.nextReview;
    });

  const currentWordId = isSessionActive && sessionQueue.length > 0 ? sessionQueue[0] : null;
  const currentWord = currentWordId ? words.find(w => w.id === currentWordId) : null;
  
  // Safety Check & Session Finish Logic
  useEffect(() => {
    if (isSessionActive && sessionQueue.length === 0 && !hasFinishedSession) {
        setHasFinishedSession(true);
        // Bonus for finishing session
        setPoints(p => p + 50);
    }
  }, [isSessionActive, sessionQueue.length, hasFinishedSession]);

  // --- Effects ---
  useEffect(() => {
     const interval = setInterval(() => setNow(Date.now()), 30000);
     const goal = localStorage.getItem('daily_word_goal');
     if (goal) setDailyGoal(parseInt(goal, 10));
     
     // Initialize Dark Mode from LocalStorage
     const theme = localStorage.getItem('kaoyan_theme');
     if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
         document.documentElement.classList.add('dark');
     } else {
         document.documentElement.classList.remove('dark');
     }

     return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(words));
  }, [words]);

  useEffect(() => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(studyHistory));
  }, [studyHistory]);

  // --- Love Store Effects ---
  useEffect(() => { localStorage.setItem('kaoyan_points', points.toString()); }, [points]);
  useEffect(() => { localStorage.setItem('kaoyan_inventory', JSON.stringify(inventory)); }, [inventory]);
  useEffect(() => { localStorage.setItem('kaoyan_shop_items', JSON.stringify(shopItems)); }, [shopItems]);

  useEffect(() => {
      const sessionState = {
          isSessionActive,
          sessionQueue,
          sessionInitialCount,
          lastSessionIds,
          hasFinishedSession,
          lastBatchSize,
          sessionLearningStreaks,
          sessionStats,
          studyMode
      };
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionState));
  }, [isSessionActive, sessionQueue, sessionInitialCount, lastSessionIds, hasFinishedSession, lastBatchSize, sessionLearningStreaks, sessionStats, studyMode]);

  useEffect(() => {
    const handler = (e: any) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // --- Handlers ---
  const updateHistory = () => {
      const today = new Date().toISOString().split('T')[0];
      setStudyHistory(prev => ({
          ...prev,
          [today]: (prev[today] || 0) + 1
      }));
  };

  const handleStartSession = (countOrIds: number | string[], isCram: boolean = false) => {
      let queueIds: string[] = [];

      if (Array.isArray(countOrIds)) {
          queueIds = [...countOrIds];
          if (isCram) queueIds.sort(() => 0.5 - Math.random());
      } else {
          const count = countOrIds;
          setLastBatchSize(count);
          if (isCram) {
              queueIds = [...words].sort(() => 0.5 - Math.random()).slice(0, count).map(w => w.id);
          } else {
              queueIds = globalStudyQueue.slice(0, count).map(w => w.id);
          }
      }

      if (queueIds.length === 0) { setError("没有可背诵的单词"); return; }

      setSessionQueue(queueIds);
      setSessionInitialCount(queueIds.length);
      setLastSessionIds(queueIds); 
      setSessionStats({}); 
      setSessionLearningStreaks({}); 
      setIsSessionActive(true);
      setHasFinishedSession(false);

      // --- Background Generation (Story & Pre-fetching) ---
      const terms = queueIds.map(id => words.find(w => w.id === id)?.term).filter(Boolean) as string[];
      if (terms.length > 0) {
          // 1. Start Story Generation
          setIsStoryLoading(true);
          setPreloadedStory(null);
          generateStory(terms)
            .then(story => {
                setPreloadedStory(story);
            })
            .catch(err => {
                console.warn("Background story generation failed", err);
                setPreloadedStory(null);
            })
            .finally(() => {
                setIsStoryLoading(false);
            });
          
          // 2. Start Advanced Data Pre-fetching
          setPreloadedExtraData({}); // Clear old cache
          terms.forEach(term => {
              // Etymology
              analyzeEtymology(term).then(res => {
                  setPreloadedExtraData(prev => ({
                      ...prev,
                      [term]: { ...prev[term], etymology: res }
                  }));
              }).catch(() => {});

              // Confusion
              analyzeConfusion(term).then(res => {
                  setPreloadedExtraData(prev => ({
                      ...prev,
                      [term]: { ...prev[term], comparator: res }
                  }));
              }).catch(() => {});
          });
      }
  };

  const handleExitSession = () => {
      setIsSessionActive(false);
      setSessionQueue([]);
      setSessionStats({});
      setSessionLearningStreaks({});
      setHasFinishedSession(false);
      setPreloadedStory(null);
      setIsStoryLoading(false);
      setPreloadedExtraData({});
  };

  // --- Love Store Handlers ---
  const handlePurchase = (item: ShopItem) => {
      if (points >= item.cost) {
          if (confirm(`确定花费 ${item.cost} 积分兑换 "${item.name}" 吗？`)) {
              setPoints(prev => prev - item.cost);
              const newCoupon: UserCoupon = {
                  id: `coupon-${Date.now()}`,
                  itemId: item.id,
                  name: item.name,
                  description: item.description,
                  icon: item.icon,
                  purchasedAt: Date.now(),
                  isUsed: false
              };
              setInventory(prev => [newCoupon, ...prev]);
          }
      }
  };

  const handleUseCoupon = (id: string) => {
      if (confirm("确定要现在使用这张券吗？(使用后将变为核销状态)")) {
          setInventory(prev => prev.map(c => c.id === id ? { ...c, isUsed: true, usedAt: Date.now() } : c));
      }
  };

  const handleAddCustomItem = (name: string, cost: number, desc: string) => {
      const newItem: ShopItem = {
          id: `custom-${Date.now()}`,
          name,
          cost,
          description: desc,
          icon: '💖',
          isCustom: true
      };
      setShopItems(prev => [newItem, ...prev]);
  };

  const handleDeleteItem = (id: string) => {
      if (confirm("确定要下架这个商品吗？")) {
          setShopItems(prev => prev.filter(i => i.id !== id));
      }
  };

  const handleStatusChange = useCallback((id: string, actionStatus: WordStatus) => {
    updateHistory();
    setSessionStats(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }));

    // Award Points on Mastery
    if (actionStatus === WordStatus.Mastered) {
        setPoints(p => p + 10);
    }

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

      let nextReview = interval === 0 ? currentTime : currentTime + (interval * 24 * 60 * 60 * 1000);
      let newStatus = repetitions > 0 ? WordStatus.Learning : WordStatus.New;
      if (interval >= 21) newStatus = WordStatus.Mastered;

      return { ...w, status: newStatus, interval, easeFactor, repetitions, nextReview, lastReviewed: currentTime };
    }));
    
    const currentStreak = sessionLearningStreaks[id];
    const isInPenaltyLoop = currentStreak !== undefined; 

    if (actionStatus === WordStatus.Mastered) {
        if (isInPenaltyLoop) {
            const newStreak = currentStreak + 1;
            setSessionLearningStreaks(prev => ({ ...prev, [id]: newStreak }));
            if (newStreak >= 3) {
                setSessionQueue(prev => {
                    const rest = prev.slice(1);
                    if (rest.length === 0) setHasFinishedSession(true);
                    return rest;
                });
            } else {
                setSessionQueue(prev => [...prev.slice(1), id]);
            }
        } else {
            setSessionQueue(prev => {
                const rest = prev.slice(1);
                if (rest.length === 0) setHasFinishedSession(true);
                return rest;
            });
        }
    } else {
        setSessionLearningStreaks(prev => ({ ...prev, [id]: 0 }));
        setSessionQueue(prev => [...prev.slice(1), id]);
    }
    
    setNow(Date.now());
  }, [sessionLearningStreaks]);

  const handleNext = useCallback(() => { setNow(Date.now()); }, []);
  const handleDelete = (id: string) => { setWords(prev => prev.filter(w => w.id !== id)); };

  const handleEnrichWord = async (wordToEnrich: Word) => {
    setIsLoading(true); setError(null);
    try {
      const data = await enrichWordWithAI(wordToEnrich.term);
      setWords(prev => prev.map(w => w.id === wordToEnrich.id ? { ...w, ...data } : w));
    } catch (err: any) {
      setError(err.message?.includes("401") ? "Key 无效" : "请求失败");
    } finally { setIsLoading(false); }
  };

  const handleImport = async (terms: string[]) => {
    const currentTime = Date.now();
    const uniqueTerms = terms.filter(t => !words.some(w => w.term.toLowerCase() === t.toLowerCase()));
    if (uniqueTerms.length === 0) return;

    const newWords: Word[] = uniqueTerms.map((term, idx) => {
      const localMatch = AUTOCOMPLETE_DICT.find(d => d.term.toLowerCase() === term.toLowerCase());
      return {
        id: `new-${currentTime}-${idx}-${Math.random().toString(36).substr(2, 5)}`,
        term,
        meanings: localMatch ? [{ partOfSpeech: localMatch.pos, definition: localMatch.definition, example: "Loading...", translation: "..." }] : [], 
        status: WordStatus.New, tags: ['导入'], nextReview: currentTime, interval: 0, repetitions: 0, easeFactor: 2.5
      };
    });

    setWords(prev => [...newWords, ...prev]);
    if (mode === 'import') setMode('list');
    setSearchTerm(''); setShowSearchDropdown(false);
    
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
    setSearchSuggestions(AUTOCOMPLETE_DICT.filter(entry => entry.term.toLowerCase().startsWith(lowerText)).sort((a, b) => a.term.length - b.term.length).slice(0, 6));
    setShowSearchDropdown(true);
  };

  const handleClearData = () => {
      setWords(INITIAL_WORDS);
      setStudyHistory({});
      localStorage.removeItem(SESSION_STORAGE_KEY);
      localStorage.removeItem(HISTORY_KEY);
      handleExitSession();
  };

  const handleCommutePlay = (playlist: Word[]) => {
      setCommutePlaylist(playlist);
  };

  const masteredCount = Math.max(0, sessionInitialCount - sessionQueue.length);
  const progressPercent = sessionInitialCount > 0 ? (masteredCount / sessionInitialCount) * 100 : 0;
  const struggleCount = Object.keys(sessionLearningStreaks).length;
  const directCount = Math.max(0, sessionInitialCount - struggleCount);
  const lastSessionWords = lastSessionIds.map(id => words.find(w => w.id === id)?.term).filter(Boolean) as string[];

  const [showSetup, setShowSetup] = useState(false);
  const finalHandleExit = () => { handleExitSession(); setShowSetup(false); };

  // Prepare data for current card
  const currentWordTerm = currentWord?.term;
  const currentExtraData = currentWordTerm ? preloadedExtraData[currentWordTerm] : undefined;

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-black text-slate-900 dark:text-slate-100 relative selection:bg-indigo-100 selection:text-indigo-700 font-sans transition-colors">
      {commutePlaylist && <CommutePlayer playlist={commutePlaylist} onClose={() => setCommutePlaylist(null)} />}
      {showInstallGuide && <InstallGuide onClose={() => setShowInstallGuide(false)} isIOS={isIOS} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} currentWords={words} onRestoreData={(d) => setWords(d)} onClearData={handleClearData} appVersion={APP_VERSION} />}

      <div className="fixed top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-100/60 dark:bg-indigo-900/20 rounded-full blur-[80px] pointer-events-none z-0"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-purple-100/50 dark:bg-purple-900/20 rounded-full blur-[80px] pointer-events-none z-0"></div>

      <header className="fixed top-0 left-0 right-0 z-50 px-4 pb-3 transition-all duration-300" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1rem)' }}>
        <div className="max-w-2xl mx-auto bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-800 shadow-sm rounded-2xl px-4 py-2.5 flex justify-between items-center gap-3 relative">
          <div className="flex items-center gap-2 shrink-0 cursor-pointer group" onClick={() => { setMode('study'); setShowSetup(false); }}>
            <div className="bg-slate-900 dark:bg-indigo-600 p-1.5 rounded-lg shadow-md group-hover:scale-105 transition-transform"><GraduationCap className="text-white" size={18} /></div>
            <span className="font-bold text-slate-800 dark:text-white text-sm tracking-tight hidden xs:block">考研 AI</span>
          </div>
          <div className="flex-1 max-w-xs relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input type="text" placeholder="Search..." className="w-full pl-9 pr-3 py-1.5 bg-slate-100/80 dark:bg-slate-800 border-none rounded-xl text-sm outline-none focus:bg-white dark:focus:bg-slate-700 transition-all text-slate-900 dark:text-slate-100" value={searchTerm} onChange={(e) => handleSearchChange(e.target.value)} onFocus={() => { if(searchTerm) setShowSearchDropdown(true); }} onBlur={() => setTimeout(() => setShowSearchDropdown(false), 250)} onKeyDown={(e) => { if (e.key === 'Enter' && searchTerm.trim()) handleLookup(searchTerm); }} />
            {showSearchDropdown && (
               <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-xl shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden z-50 max-h-[50vh] overflow-y-auto">
                  {searchSuggestions.map(s => (
                     <div key={s.term} className="px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer border-b border-slate-50/50 dark:border-slate-800 flex justify-between items-center" onClick={() => handleLookup(s.term)}>
                        <div><span className="font-bold text-sm text-slate-700 dark:text-slate-200">{s.term}</span> <span className="text-xs text-slate-400 ml-1">{s.definition}</span></div>
                        <Plus size={14} className="text-slate-300" onClick={(e) => {e.stopPropagation(); handleQuickAdd(s.term)}}/>
                     </div>
                  ))}
               </div>
            )}
          </div>
          <div className="flex gap-1.5 shrink-0">
             <button onClick={() => setShowSettings(true)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><Settings size={18} /></button>
          </div>
        </div>
      </header>

      <main className="flex-grow relative w-full h-full overflow-hidden z-10 pt-32 pb-24 px-4">
        {error && <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-white/95 border border-rose-100 text-rose-500 px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-xs font-medium animate-in fade-in slide-in-from-top-2"><AlertCircle size={14} /> {error} <button onClick={() => setError(null)}>×</button></div>}

        <div className="w-full h-full max-w-2xl mx-auto transition-all duration-500">
          {mode === 'study' && (
             isSessionActive || hasFinishedSession ? (
                 hasFinishedSession ? (
                    <StudySession 
                        totalDue={globalStudyQueue.length}
                        totalWords={words.length}
                        onStartSession={handleStartSession}
                        onExit={finalHandleExit}
                        isFinished={true}
                        nextBatchSize={lastBatchSize}
                        sessionDirectCount={directCount}
                        sessionStruggleCount={struggleCount}
                        onContinue={() => handleStartSession(lastBatchSize, false)}
                        onReviewAgain={() => handleStartSession(lastSessionIds, true)}
                        studyMode={studyMode}
                        setStudyMode={setStudyMode}
                        completedWordTerms={lastSessionWords}
                        preloadedStory={preloadedStory} 
                        isStoryLoading={isStoryLoading} 
                    />
                 ) : currentWord ? (
                    <div className="w-full h-full flex flex-col items-center justify-center">
                        <Flashcard 
                            key={currentWord.id} 
                            word={currentWord} 
                            sessionAttempts={sessionStats[currentWord.id] || 0}
                            learningStreak={sessionLearningStreaks[currentWord.id]}
                            onStatusChange={handleStatusChange} 
                            onNext={handleNext} 
                            mode={studyMode}
                            extraData={currentExtraData}
                        />
                        <div className="w-full max-w-xs mt-6 animate-in fade-in slide-in-from-bottom-4">
                            <div className="flex justify-between items-end mb-1.5 px-1">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">本组进度</span>
                                <span className="text-xs font-bold font-mono text-indigo-600 dark:text-indigo-400">{masteredCount} <span className="text-slate-300 dark:text-slate-600">/</span> {sessionInitialCount}</span>
                            </div>
                            <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500 ease-out" style={{ width: `${progressPercent}%` }}></div>
                            </div>
                        </div>
                    </div>
                 ) : <div className="flex items-center justify-center h-full"><div className="animate-spin text-indigo-200"><Settings size={32} /></div></div>
             ) : showSetup ? (
                 <StudySession 
                    totalDue={globalStudyQueue.length}
                    totalWords={words.length}
                    onStartSession={handleStartSession}
                    onExit={() => setShowSetup(false)}
                    studyMode={studyMode}
                    setStudyMode={setStudyMode}
                 />
             ) : (
                 <Dashboard 
                    history={studyHistory}
                    dailyGoal={dailyGoal}
                    totalWords={words.length}
                    onStart={() => setShowSetup(true)}
                 />
             )
          )}

          {mode === 'list' && (
            <div className="h-full bg-white/60 dark:bg-slate-900/60 backdrop-blur-md rounded-3xl shadow-sm border border-white/50 dark:border-slate-800 overflow-hidden">
              <WordList 
                words={words} 
                onDelete={handleDelete} 
                onEnrich={handleEnrichWord} 
                onImport={handleImport} 
                onLookup={handleLookup} 
                onSelectWord={(w) => {setLookupTerm(w.term); setMode('dictionary');}} 
                onPlayCommute={handleCommutePlay}
                isEnriching={isLoading} 
                searchTerm={searchTerm} 
              />
            </div>
          )}

          {mode === 'import' && (
            <div className="h-full flex items-center justify-center p-4">
                <ImportModal onImport={handleImport} onLoadSample={handleLoadSample} isProcessing={enrichProgress !== null} />
            </div>
          )}

          {mode === 'store' && (
              <div className="h-full bg-white/60 dark:bg-slate-900/60 backdrop-blur-md rounded-3xl shadow-sm border border-white/50 dark:border-slate-800 overflow-hidden">
                  <LoveStore 
                    points={points}
                    shopItems={shopItems}
                    inventory={inventory}
                    onPurchase={handlePurchase}
                    onUseCoupon={handleUseCoupon}
                    onAddCustomItem={handleAddCustomItem}
                    onDeleteItem={handleDeleteItem}
                  />
              </div>
          )}

          {mode === 'dictionary' && lookupTerm && (
            <DictionaryDetail term={lookupTerm} existingWord={words.find(w => w.term.toLowerCase() === lookupTerm.toLowerCase())} onAdd={handleAddToVocabulary} onRemove={handleDelete} onBack={() => { setMode('list'); setLookupTerm(null); }} />
          )}
        </div>
      </main>

      {mode !== 'dictionary' && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 p-1.5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/50 dark:border-slate-800 shadow-2xl shadow-indigo-500/10 dark:shadow-none rounded-2xl ring-1 ring-white/50 dark:ring-slate-800 animate-in slide-in-from-bottom-6">
            <button onClick={() => {setMode('study'); setShowSetup(false);}} className={`flex items-center gap-2 px-4 py-3 rounded-xl transition-all font-bold text-sm ${mode === 'study' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}><Book size={18} strokeWidth={2.5} /><span className={mode === 'study' ? 'block' : 'hidden'}>Study</span></button>
            <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-1"></div>
            <button onClick={() => setMode('import')} className={`p-3 rounded-xl transition-all ${mode === 'import' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none rotate-90' : 'text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30'}`}><Plus size={22} strokeWidth={3} /></button>
            <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-1"></div>
            <button onClick={() => setMode('list')} className={`flex items-center gap-2 px-4 py-3 rounded-xl transition-all font-bold text-sm ${mode === 'list' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}><List size={18} strokeWidth={2.5} /><span className={mode === 'list' ? 'block' : 'hidden'}>List</span></button>
            <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-1"></div>
            <button onClick={() => setMode('store')} className={`flex items-center gap-2 px-4 py-3 rounded-xl transition-all font-bold text-sm ${mode === 'store' ? 'bg-pink-500 text-white shadow-lg' : 'text-slate-400 hover:bg-pink-50 dark:hover:bg-pink-900/20 hover:text-pink-500'}`}><Gift size={18} strokeWidth={2.5} /><span className={mode === 'store' ? 'block' : 'hidden'}>Store</span></button>
        </div>
      )}
    </div>
  );
};

export default App;
