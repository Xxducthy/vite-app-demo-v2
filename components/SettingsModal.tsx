
import React, { useState, useEffect, useRef } from 'react';
import { X, Key, Database, Download, Upload, Copy, ClipboardPaste, FileText, AlertTriangle, Check } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'code' | 'file'>('code');
  const [syncString, setSyncString] = useState('');
  const [copyMsg, setCopyMsg] = useState<{type: 'success'|'error', text: string} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importMode, setImportMode] = useState<'restore' | 'merge'>('restore');

  useEffect(() => {
    setApiKey(localStorage.getItem('custom_api_key') || '');
  }, []);

  const handleSaveKey = () => {
    localStorage.setItem('custom_api_key', apiKey.trim());
    window.location.reload(); 
  };

  // --- CODE SYNC LOGIC (Base64) ---
  const handleGenerateCode = () => {
      try {
          if (!currentWords || currentWords.length === 0) {
              setCopyMsg({type: 'error', text: "没有数据"}); return;
          }
          const json = JSON.stringify(currentWords);
          // Simple compression/encoding
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
              if(confirm(`识别到 ${json.length} 个单词。\n确定要覆盖当前进度吗？`)) {
                  onRestoreData(json);
                  setSyncString('');
                  setCopyMsg({type: 'success', text: "同步成功！"});
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
            if (importMode === 'restore' && onRestoreData) onRestoreData(json);
            else if (importMode === 'merge' && onMergeData) onMergeData(json);
        } else { alert("文件格式错误"); }
      } catch (err) { alert("解析失败"); }
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
            数据同步 v2.0
        </h2>

        <div className="flex gap-2 p-1 bg-slate-100 rounded-xl mb-6">
            <button 
                onClick={() => setActiveTab('code')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'code' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
                <Copy size={14} /> 文本码 (快)
            </button>
            <button 
                onClick={() => setActiveTab('file')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'file' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
                <FileText size={14} /> 文件 (稳)
            </button>
        </div>

        <div className="space-y-8">
          
          {activeTab === 'code' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
               <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100 text-xs text-indigo-700 leading-relaxed">
                  复制乱码 -> 微信发送 -> 粘贴导入。(仅限小数据量)
               </div>
               <textarea 
                  value={syncString}
                  onChange={(e) => setSyncString(e.target.value)}
                  placeholder="在此粘贴进度码..."
                  className="w-full h-24 p-3 text-xs font-mono border border-slate-300 rounded-xl focus:border-indigo-500 outline-none bg-white resize-none"
               />
               {copyMsg && (
                   <div className={`text-xs font-bold flex items-center gap-1 ${copyMsg.type === 'success' ? 'text-emerald-600' : 'text-rose-500'}`}>
                       {copyMsg.type === 'success' ? <Check size={12}/> : <AlertTriangle size={12}/>} {copyMsg.text}
                   </div>
               )}
               <div className="grid grid-cols-2 gap-3">
                   <button onClick={handleGenerateCode} className="flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors">
                       <Copy size={14} /> 生成并复制
                   </button>
                   <button onClick={handleImportCode} className="flex items-center justify-center gap-2 bg-indigo-600 text-white py-2.5 rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors">
                       <ClipboardPaste size={14} /> 识别并导入
                   </button>
               </div>
            </div>
          )}

          {activeTab === 'file' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
               <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100 text-xs text-emerald-700 leading-relaxed">
                  生成文件 -> 微信发送 -> 选择文件。(适用于大量数据)
               </div>
               <div className="grid grid-cols-1 gap-3">
                    <button onClick={handleExport} className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors group">
                        <div className="flex items-center gap-3">
                            <div className="bg-white p-2 rounded-lg shadow-sm text-slate-600"><Download size={18} /></div>
                            <div className="text-left">
                                <div className="text-sm font-bold text-slate-700">导出备份文件</div>
                                <div className="text-[10px] text-slate-400">保存到手机/电脑</div>
                            </div>
                        </div>
                    </button>
                    <button onClick={() => handleImportClick('restore')} className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors group">
                        <div className="flex items-center gap-3">
                            <div className="bg-white p-2 rounded-lg shadow-sm text-slate-600"><Upload size={18} /></div>
                            <div className="text-left">
                                <div className="text-sm font-bold text-slate-700">导入备份文件</div>
                                <div className="text-[10px] text-slate-400">覆盖当前进度</div>
                            </div>
                        </div>
                    </button>
               </div>
               <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
            </div>
          )}

          {/* --- API Key Section --- */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
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
                className="flex-1 p-2 border border-slate-200 rounded-lg text-xs font-mono outline-none focus:border-indigo-500"
                />
                <button onClick={handleSaveKey} className="bg-slate-800 text-white px-3 rounded-lg text-xs font-bold">保存</button>
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

        </div>
      </div>
    </div>
  );
};
