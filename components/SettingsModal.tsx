
import React, { useState, useEffect, useRef } from 'react';
import { X, Key, Database, Download, Upload, Copy, ClipboardPaste, FileText, AlertTriangle, Check, Target, Moon, Sun } from 'lucide-react';
import { Word } from '../types';

// Helper: Smart Merge Strategy
// Prioritize the version with higher repetitions/interval (more progress)
const mergeWords = (localWords: Word[], importedWords: Word[]): Word[] => {
    const wordMap = new Map<string, Word>();
    
    // 1. Load local words
    localWords.forEach(w => wordMap.set(w.term.toLowerCase(), w));

    // 2. Merge imported words
    importedWords.forEach(imported => {
        const key = imported.term.toLowerCase();
        const existing = wordMap.get(key);

        if (!existing) {
            // New word, just add
            wordMap.set(key, imported);
        } else {
            // Conflict: Choose the one with better progress
            // Criteria: Higher repetitions -> Higher interval -> Later nextReview -> Last reviewed
            
            const existingScore = (existing.repetitions * 1000) + existing.interval;
            const importedScore = (imported.repetitions * 1000) + imported.interval;

            // If imported has more progress, overwrite local
            if (importedScore > existingScore) {
                wordMap.set(key, imported);
            } 
            // If scores are equal, take the one reviewed most recently
            else if (importedScore === existingScore) {
                if ((imported.lastReviewed || 0) > (existing.lastReviewed || 0)) {
                    wordMap.set(key, imported);
                }
            }
            // Otherwise keep existing
        }
    });

    return Array.from(wordMap.values());
};

interface SettingsModalProps {
  onClose: () => void;
  currentWords?: Word[];
  onRestoreData?: (words: Word[]) => void;
  onMergeData?: (words: Word[]) => void;
  onClearData?: () => void;
  appVersion?: string;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, currentWords = [], onRestoreData, onMergeData, onClearData, appVersion }) => {
  const [apiKey, setApiKey] = useState('');
  const [dailyGoal, setDailyGoal] = useState<number>(50);
  const [activeTab, setActiveTab] = useState<'code' | 'file'>('code');
  const [syncString, setSyncString] = useState('');
  const [copyMsg, setCopyMsg] = useState<{type: 'success'|'error', text: string} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importMode, setImportMode] = useState<'restore' | 'merge'>('merge'); // Default to SAFE merge
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setApiKey(localStorage.getItem('custom_api_key') || '');
    const savedGoal = localStorage.getItem('daily_word_goal');
    if (savedGoal) setDailyGoal(parseInt(savedGoal, 10));
    
    // Check dark mode
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  const handleSaveSettings = () => {
    localStorage.setItem('custom_api_key', apiKey.trim());
    localStorage.setItem('daily_word_goal', dailyGoal.toString());
    window.location.reload(); 
  };
  
  const toggleDarkMode = () => {
      const newVal = !isDark;
      setIsDark(newVal);
      if (newVal) {
          document.documentElement.classList.add('dark');
          localStorage.setItem('kaoyan_theme', 'dark');
      } else {
          document.documentElement.classList.remove('dark');
          localStorage.setItem('kaoyan_theme', 'light');
      }
  };

  // Helper to clear session state on data changes
  const clearSessionStorage = () => {
      localStorage.removeItem('kaoyan_session_state_v1');
  };

  // --- CODE SYNC LOGIC (Base64) ---
  const handleGenerateCode = () => {
      try {
          if (!currentWords || currentWords.length === 0) {
              setCopyMsg({type: 'error', text: "没有数据"}); return;
          }
          const json = JSON.stringify(currentWords);
          // Use standard encoding compatible with decodeURIComponent
          const code = btoa(unescape(encodeURIComponent(json)));
          
          if (code.length > 50000) {
              setCopyMsg({type: 'error', text: "数据量过大，请切换到“文件同步”"});
              return;
          }
          setSyncString(code);
          navigator.clipboard.writeText(code).then(() => {
              setCopyMsg({type: 'success', text: "已复制！去微信粘贴。"});
          }).catch(() => {
              setCopyMsg({type: 'success', text: "已生成，请手动复制。"});
          });
      } catch (e) {
          setCopyMsg({type: 'error', text: "生成失败"});
      }
  };

  const handleImportCode = () => {
      if (!syncString.trim()) { setCopyMsg({type: 'error', text: "请先粘贴代码"}); return; }
      try {
          const jsonStr = decodeURIComponent(escape(atob(syncString.trim())));
          const json = JSON.parse(jsonStr);
          
          if (Array.isArray(json) && onRestoreData) {
              if (importMode === 'merge') {
                  // Smart Merge for Code Import
                  const merged = mergeWords(currentWords, json);
                  if(confirm(`识别到 ${json.length} 个单词。\n智能合并后将有 ${merged.length} 个单词。\n(会自动保留背诵进度更靠前的版本)`)) {
                      onRestoreData(merged); 
                      clearSessionStorage();
                      setSyncString('');
                      setCopyMsg({type: 'success', text: "智能合并成功！"});
                  }
              } else {
                  // Full Overwrite
                  if(confirm(`识别到 ${json.length} 个单词。\n确定要覆盖当前进度吗？(本地进度将丢失)`)) {
                      onRestoreData(json);
                      clearSessionStorage();
                      setSyncString('');
                      setCopyMsg({type: 'success', text: "同步成功！"});
                  }
              }
          } else { throw new Error(); }
      } catch (e) {
          setCopyMsg({type: 'error', text: "无效的进度码"});
      }
  };

  // --- FILE LOGIC ---
  const handleExport = () => {
    if (!currentWords) return;
    const dataStr = JSON.stringify(currentWords, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const date = new Date().toISOString().slice(5, 10).replace('-', '');
    link.download = `考研进度_${date}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json)) {
            if (importMode === 'restore' && onRestoreData) {
                if(confirm(`确定要用文件中的 ${json.length} 个单词覆盖当前数据吗？`)) {
                    onRestoreData(json);
                    clearSessionStorage();
                    alert("恢复成功");
                }
            }
            else if (importMode === 'merge' && onRestoreData) {
                // Smart Merge for File Import
                const merged = mergeWords(currentWords, json);
                onRestoreData(merged);
                clearSessionStorage();
                alert(`合并成功！当前共 ${merged.length} 个单词。\n(已自动保留最高背诵进度)`);
            }
        } else { alert("文件格式错误"); }
      } catch (err) { alert("解析失败"); }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto border border-white/10 dark:border-slate-800 text-slate-900 dark:text-slate-100 transition-colors">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
          <X size={20} />
        </button>
        
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Database size={24} className="text-indigo-600 dark:text-indigo-400"/> 
            设置 & 同步
        </h2>

        {/* --- Theme Toggle --- */}
        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-xl mb-6">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-white dark:bg-slate-700 rounded-lg shadow-sm">
                    {isDark ? <Moon size={18} className="text-indigo-400" /> : <Sun size={18} className="text-amber-500" />}
                </div>
                <div className="flex flex-col">
                    <span className="text-sm font-bold">深色模式</span>
                    <span className="text-[10px] text-slate-400">适合夜间学习</span>
                </div>
            </div>
            <button 
                onClick={toggleDarkMode}
                className={`w-12 h-7 rounded-full transition-colors relative ${isDark ? 'bg-indigo-600' : 'bg-slate-300'}`}
            >
                <div className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-transform shadow-sm ${isDark ? 'left-6' : 'left-1'}`}></div>
            </button>
        </div>

        {/* Import Mode Toggle (New) */}
        <div className="bg-slate-50 dark:bg-slate-800 p-1 rounded-lg mb-4 flex">
            <button 
                onClick={() => setImportMode('merge')}
                className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${importMode === 'merge' ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-400'}`}
            >
                智能合并 (保留进度)
            </button>
            <button 
                onClick={() => setImportMode('restore')}
                className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${importMode === 'restore' ? 'bg-white dark:bg-slate-600 text-rose-500 dark:text-rose-400 shadow-sm' : 'text-slate-400'}`}
            >
                完全覆盖 (慎用)
            </button>
        </div>

        <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-6">
            <button 
                onClick={() => setActiveTab('code')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'code' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
                <Copy size={14} /> 文本码
            </button>
            <button 
                onClick={() => setActiveTab('file')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'file' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
                <FileText size={14} /> 文件
            </button>
        </div>

        <div className="space-y-8">
          
          {activeTab === 'code' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
               <div className="bg-indigo-50 dark:bg-indigo-900/30 p-3 rounded-xl border border-indigo-100 dark:border-indigo-800 text-xs text-indigo-700 dark:text-indigo-300 leading-relaxed">
                  复制乱码 &rarr; 微信发送 &rarr; 粘贴导入。(仅限小数据量)
               </div>
               <textarea 
                  value={syncString}
                  onChange={(e) => setSyncString(e.target.value)}
                  placeholder="在此粘贴进度码..."
                  className="w-full h-24 p-3 text-xs font-mono border border-slate-300 dark:border-slate-700 rounded-xl focus:border-indigo-500 outline-none bg-white dark:bg-slate-800 resize-none dark:text-slate-200"
               />
               {copyMsg && (
                   <div className={`text-xs font-bold flex items-center gap-1 ${copyMsg.type === 'success' ? 'text-emerald-600' : 'text-rose-500'}`}>
                       {copyMsg.type === 'success' ? <Check size={12}/> : <AlertTriangle size={12}/>} {copyMsg.text}
                   </div>
               )}
               <div className="grid grid-cols-2 gap-3">
                   <button onClick={handleGenerateCode} className="flex items-center justify-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                       <Copy size={14} /> 生成并复制
                   </button>
                   <button onClick={handleImportCode} className={`flex items-center justify-center gap-2 text-white py-2.5 rounded-xl text-xs font-bold transition-colors ${importMode === 'merge' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-rose-600 hover:bg-rose-700'}`}>
                       <ClipboardPaste size={14} /> {importMode === 'merge' ? '导入并合并' : '导入并覆盖'}
                   </button>
               </div>
            </div>
          )}

          {activeTab === 'file' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
               <div className="bg-emerald-50 dark:bg-emerald-900/30 p-3 rounded-xl border border-emerald-100 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 leading-relaxed">
                  生成文件 &rarr; 微信发送 &rarr; 选择文件。(适用于大量数据)
               </div>
               <div className="grid grid-cols-1 gap-3">
                    <button onClick={handleExport} className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors group">
                        <div className="flex items-center gap-3">
                            <div className="bg-white dark:bg-slate-600 p-2 rounded-lg shadow-sm text-slate-600 dark:text-slate-200"><Download size={18} /></div>
                            <div className="text-left">
                                <div className="text-sm font-bold text-slate-700 dark:text-slate-200">导出进度文件</div>
                                <div className="text-[10px] text-slate-400">完整备份 (JSON)</div>
                            </div>
                        </div>
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} className={`flex items-center justify-between px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors group ${importMode === 'merge' ? 'bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800' : 'bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/20 dark:hover:bg-rose-900/30 border-rose-200 dark:border-rose-800'}`}>
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg shadow-sm ${importMode === 'merge' ? 'bg-white dark:bg-indigo-800 text-indigo-600 dark:text-indigo-200' : 'bg-white dark:bg-rose-800 text-rose-600 dark:text-rose-200'}`}><Upload size={18} /></div>
                            <div className="text-left">
                                <div className={`text-sm font-bold ${importMode === 'merge' ? 'text-indigo-700 dark:text-indigo-200' : 'text-rose-700 dark:text-rose-200'}`}>
                                    {importMode === 'merge' ? '选择文件 (智能合并)' : '选择文件 (完全覆盖)'}
                                </div>
                                <div className={`text-[10px] ${importMode === 'merge' ? 'text-indigo-400 dark:text-indigo-300' : 'text-rose-400 dark:text-rose-300'}`}>
                                    {importMode === 'merge' ? '保留最高进度' : '警告: 覆盖现有数据'}
                                </div>
                            </div>
                        </div>
                    </button>
               </div>
               <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
            </div>
          )}

          {/* --- Settings Section --- */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
            
            {/* Daily Goal */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-wider">
                    <Target size={14} />
                    <span>每日学习目标</span>
                </div>
                <div className="flex items-center gap-2">
                    <input 
                        type="number" 
                        value={dailyGoal}
                        onChange={(e) => setDailyGoal(Number(e.target.value))}
                        min={5}
                        step={5}
                        className="w-16 p-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white rounded-lg text-xs font-mono outline-none focus:border-indigo-500 text-center"
                    />
                    <span className="text-xs text-slate-400">词</span>
                </div>
            </div>

            {/* API Key */}
            <div className="space-y-2">
                <div className="flex items-center gap-2 text-slate-400 font-bold text-xs uppercase tracking-wider">
                    <Key size={14} />
                    <span>DeepSeek API Key</span>
                </div>
                <div className="flex gap-2">
                    <input 
                    type="text" 
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-..."
                    className="flex-1 p-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white rounded-lg text-xs font-mono outline-none focus:border-indigo-500"
                    />
                    <button onClick={handleSaveSettings} className="bg-slate-800 dark:bg-indigo-600 text-white px-3 rounded-lg text-xs font-bold hover:bg-slate-700 whitespace-nowrap">
                        保存设置
                    </button>
                </div>
            </div>
          </div>

          {onClearData && (
            <div className="pt-2 text-center">
                <button 
                    onClick={() => {if(confirm("确定要清空所有背诵记录吗？")) onClearData();}}
                    className="text-[10px] text-rose-300 hover:text-rose-500 underline"
                >
                    重置所有数据
                </button>
            </div>
          )}
          
          {appVersion && (
            <div className="mt-6 text-center text-[10px] text-slate-300 font-mono">
               {appVersion}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
