import React, { useState, useEffect, useRef } from 'react';
import { X, Key, AlertTriangle, Database, Copy, Check, ClipboardPaste, ArrowRightLeft, Loader2, Trash2 } from 'lucide-react';
import { Word } from '../types';

interface SettingsModalProps {
  onClose: () => void;
  currentWords?: Word[];
  onRestoreData?: (words: Word[]) => void;
  onMergeData?: (words: Word[]) => void;
  onClearData?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, currentWords, onRestoreData, onMergeData, onClearData }) => {
  const [apiKey, setApiKey] = useState('');
  
  // Sync State
  const [syncString, setSyncString] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // File Import State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importMode, setImportMode] = useState<'restore' | 'merge'>('restore');

  useEffect(() => {
    setApiKey(localStorage.getItem('custom_api_key') || '');
  }, []);

  const handleSaveKey = () => {
    localStorage.setItem('custom_api_key', apiKey.trim());
    window.location.reload(); 
  };

  // --- TEXT CODE SYNC LOGIC (Offline / No-VPN) ---
  
  const handleGenerateCode = () => {
      setIsProcessing(true);
      setErrorMsg(null);
      setCopySuccess(false);
      setSyncString('');

      // Use setTimeout to allow UI to render the spinner before the main thread blocks on JSON.stringify
      setTimeout(() => {
        try {
            if (!currentWords || currentWords.length === 0) {
                throw new Error("当前没有数据可导出");
            }
            // 1. Stringify
            const json = JSON.stringify(currentWords);
            // 2. Encode to Base64 (Handle Unicode strings correctly)
            const code = btoa(unescape(encodeURIComponent(json)));
            
            setSyncString(code);
        } catch (e: any) {
            setErrorMsg(e.message || "生成失败：数据量过大");
        } finally {
            setIsProcessing(false);
        }
      }, 100);
  };

  const handleCopyCode = async () => {
      if (!syncString) return;
      try {
          await navigator.clipboard.writeText(syncString);
          setCopySuccess(true);
          setTimeout(() => setCopySuccess(false), 2000);
      } catch (e) {
          setErrorMsg("复制失败，请手动全选复制");
      }
  };

  const handleImportCode = () => {
      if (!syncString.trim()) {
          setErrorMsg("请先粘贴进度码");
          return;
      }
      
      setIsProcessing(true);
      setErrorMsg(null);

      setTimeout(() => {
        try {
            // 1. Decode
            const jsonStr = decodeURIComponent(escape(atob(syncString.trim())));
            const json = JSON.parse(jsonStr);
            
            if (Array.isArray(json) && onRestoreData) {
                // Small delay to ensure processing state renders before confirm dialog
                setTimeout(() => {
                    if (confirm(`解析成功！包含 ${json.length} 个单词。\n确定要覆盖当前进度吗？`)) {
                        onRestoreData(json);
                        setSyncString(''); // Clear after success
                    }
                    setIsProcessing(false);
                }, 100);
            } else {
                throw new Error("格式错误");
            }
        } catch (e) {
            setErrorMsg("无效的进度码，请确保复制完整");
            setIsProcessing(false);
        }
      }, 100);
  };

  // --- FILE LOGIC ---
  const handleExport = () => {
    if (!currentWords) return;
    const dataStr = JSON.stringify(currentWords, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `kaoyan_vocab_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportClick = (mode: 'restore' | 'merge') => {
    setImportMode(mode);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json)) {
            if (json.length > 0 && (!json[0].id && !json[0].term)) { alert("格式警告：未知结构"); return; }
            if (importMode === 'restore' && onRestoreData) onRestoreData(json);
            else if (importMode === 'merge' && onMergeData) onMergeData(json);
        } else { alert("格式错误：非数组"); }
      } catch (err) { alert("文件解析失败"); }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
          <X size={20} />
        </button>
        
        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Database size={24} className="text-indigo-600"/> 
            数据同步与管理
        </h2>

        <div className="space-y-8">
          
          {/* --- Code Sync Section (Domestic Friendly) --- */}
          <div className="space-y-4 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm uppercase tracking-wider">
                    <ArrowRightLeft size={16} />
                    <span>进度码同步 (无需梯子)</span>
                </div>
             </div>
             
             <p className="text-xs text-slate-500 leading-relaxed">
                无需联网。生成代码后，通过微信/QQ发给自己，在另一台设备粘贴导入。
             </p>

             <div className="relative">
                 <textarea 
                    value={syncString}
                    onChange={(e) => setSyncString(e.target.value)}
                    placeholder="在此处粘贴进度码，或点击下方生成..."
                    className="w-full h-24 p-3 text-xs font-mono border border-slate-300 rounded-xl focus:border-indigo-500 outline-none bg-white resize-none"
                 />
                 {syncString && (
                     <button 
                        onClick={() => setSyncString('')}
                        className="absolute top-2 right-2 text-slate-300 hover:text-slate-500"
                     >
                         <X size={14} />
                     </button>
                 )}
             </div>

             {errorMsg && (
                 <div className="text-xs text-rose-500 font-bold flex items-center gap-1">
                     <AlertTriangle size={12} /> {errorMsg}
                 </div>
             )}

             <div className="grid grid-cols-2 gap-3">
                 <button 
                    onClick={handleGenerateCode} 
                    disabled={isProcessing}
                    className="flex items-center justify-center gap-2 bg-white text-slate-700 border border-slate-200 py-2 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                    {isProcessing && !syncString ? <Loader2 size={14} className="animate-spin"/> : null}
                    {isProcessing && !syncString ? '生成中...' : '生成本机进度码'}
                 </button>
                 
                 <button 
                    onClick={handleImportCode} 
                    disabled={isProcessing || !syncString}
                    className="flex items-center justify-center gap-2 bg-indigo-600 text-white py-2 rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                    {isProcessing && syncString ? <Loader2 size={14} className="animate-spin text-white"/> : <ClipboardPaste size={14} />} 
                    {isProcessing && syncString ? '解析中...' : '读取并导入'}
                 </button>
             </div>
             
             {/* Copy Button (Only visible if there is text) */}
             {syncString && !isProcessing && (
                 <button 
                    onClick={handleCopyCode}
                    className={`w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                        copySuccess ? 'bg-emerald-500 text-white' : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'
                    }`}
                 >
                    {copySuccess ? <><Check size={14} /> 已复制</> : <><Copy size={14} /> 复制进度码 (发给微信文件助手)</>}
                 </button>
             )}
          </div>

          {/* --- File Backup Section --- */}
          <div className="space-y-3 pt-2">
             <div className="flex items-center gap-2 text-slate-400 font-bold text-xs uppercase tracking-wider">
                <Database size={14} />
                <span>备用方式：文件备份</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <button onClick={handleExport} className="py-2 bg-slate-50 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-100 border border-slate-200">导出 JSON</button>
                <button onClick={() => handleImportClick('restore')} className="py-2 bg-slate-50 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-100 border border-slate-200">导入 JSON</button>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
            </div>
          </div>

          {/* --- API Key Section --- */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <div className="flex items-center gap-2 text-slate-400 font-bold text-xs uppercase tracking-wider">
                <Key size={14} />
                <span>API Key</span>
            </div>
            <div className="flex gap-2">
                <input 
                type="text" 
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="flex-1 p-2 border border-slate-200 rounded-lg text-xs font-mono outline-none focus:border-indigo-500"
                />
                <button onClick={handleSaveKey} className="bg-slate-800 text-white px-3 rounded-lg text-xs font-bold">保存</button>
            </div>
          </div>

          {onClearData && (
            <div className="pt-4 border-t border-slate-100 text-center">
                <button 
                    onClick={() => {if(confirm("确定要清空？")) onClearData();}}
                    className="text-xs text-rose-400 hover:text-rose-600 flex items-center justify-center gap-1 mx-auto"
                >
                    <Trash2 size={12} /> 危险：重置所有数据
                </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};