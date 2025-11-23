import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Key, AlertTriangle, Database, Download, Upload, RefreshCw, Trash2, Cloud, Copy, Check, Settings } from 'lucide-react';
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
  
  // Cloud Sync State
  const [syncCode, setSyncCode] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<{type: 'success' | 'error', text: string} | null>(null);
  
  // File Import State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importMode, setImportMode] = useState<'restore' | 'merge'>('restore');

  useEffect(() => {
    setApiKey(localStorage.getItem('custom_api_key') || '');
    setSyncCode(localStorage.getItem('kaoyan_sync_code') || '');
  }, []);

  const handleSaveKey = () => {
    localStorage.setItem('custom_api_key', apiKey.trim());
    window.location.reload(); 
  };

  // --- CLOUD SYNC LOGIC (JSONBlob) ---
  const API_BASE = 'https://jsonblob.com/api/jsonBlob';

  const handleCreateSyncCode = async () => {
      setIsSyncing(true);
      setSyncMsg(null);
      try {
          // Create a new blob with current words
          const response = await fetch(API_BASE, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
              body: JSON.stringify(currentWords || [])
          });
          
          if (response.ok) {
              const location = response.headers.get('Location');
              if (location) {
                  const newCode = location.split('/').pop(); // Extract ID
                  if (newCode) {
                      setSyncCode(newCode);
                      localStorage.setItem('kaoyan_sync_code', newCode);
                      setSyncMsg({ type: 'success', text: '同步码已生成！请在另一台设备输入此码。' });
                  }
              }
          } else {
              throw new Error('创建失败');
          }
      } catch (e) {
          setSyncMsg({ type: 'error', text: '无法连接云服务，请检查网络。' });
      } finally {
          setIsSyncing(false);
      }
  };

  const handleCloudUpload = async () => {
      if (!syncCode) { setSyncMsg({ type: 'error', text: '请先生成或输入同步码' }); return; }
      setIsSyncing(true);
      setSyncMsg(null);
      try {
          const response = await fetch(`${API_BASE}/${syncCode}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
              body: JSON.stringify(currentWords || [])
          });
          if (response.ok) {
              localStorage.setItem('kaoyan_sync_code', syncCode);
              setSyncMsg({ type: 'success', text: '上传成功！进度已保存到云端。' });
          } else {
              setSyncMsg({ type: 'error', text: '上传失败，同步码可能无效。' });
          }
      } catch (e) {
          setSyncMsg({ type: 'error', text: '网络错误，上传失败。' });
      } finally {
          setIsSyncing(false);
      }
  };

  const handleCloudDownload = async () => {
      if (!syncCode) { setSyncMsg({ type: 'error', text: '请先输入同步码' }); return; }
      setIsSyncing(true);
      setSyncMsg(null);
      try {
          const response = await fetch(`${API_BASE}/${syncCode}`, {
              method: 'GET',
              headers: { 'Accept': 'application/json' }
          });
          if (response.ok) {
              const json = await response.json();
              if (Array.isArray(json) && onRestoreData) {
                  localStorage.setItem('kaoyan_sync_code', syncCode);
                  // Confirm before overwriting
                  if (confirm(`云端找到 ${json.length} 个单词。\n确定要覆盖当前本机的进度吗？`)) {
                      onRestoreData(json); 
                      setSyncMsg({ type: 'success', text: '同步成功！' });
                  } else {
                      setSyncMsg({ type: 'success', text: '已取消覆盖。' });
                  }
              } else {
                  setSyncMsg({ type: 'error', text: '云端数据格式错误。' });
              }
          } else {
              setSyncMsg({ type: 'error', text: '找不到此同步码的数据。' });
          }
      } catch (e) {
          setSyncMsg({ type: 'error', text: '网络错误，下载失败。' });
      } finally {
          setIsSyncing(false);
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
            <Settings size={24} className="text-indigo-600"/> 
            设置与同步
        </h2>

        <div className="space-y-8">
          
          {/* --- Cloud Sync Section --- */}
          <div className="space-y-4 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm uppercase tracking-wider">
                    <Cloud size={16} />
                    <span>云端同步 (免账号)</span>
                </div>
                {isSyncing && <RefreshCw size={16} className="animate-spin text-indigo-400" />}
             </div>
             
             <div className="flex gap-2">
                 <input 
                    type="text" 
                    value={syncCode}
                    onChange={(e) => setSyncCode(e.target.value)}
                    placeholder="输入或生成同步码"
                    className="flex-1 p-2 text-center font-mono text-sm font-bold tracking-wider border border-slate-300 rounded-xl focus:border-indigo-500 outline-none bg-white"
                 />
                 <button onClick={() => {navigator.clipboard.writeText(syncCode); alert('已复制')}} className="p-2 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-indigo-600">
                    <Copy size={18} />
                 </button>
             </div>

             <div className="grid grid-cols-2 gap-3">
                 <button onClick={handleCloudUpload} disabled={isSyncing} className="flex items-center justify-center gap-2 bg-indigo-600 text-white py-2 rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors">
                    <Upload size={14} /> 上传到云端
                 </button>
                 <button onClick={handleCloudDownload} disabled={isSyncing} className="flex items-center justify-center gap-2 bg-white text-indigo-600 border border-indigo-200 py-2 rounded-xl text-xs font-bold hover:bg-indigo-50 transition-colors">
                    <Download size={14} /> 从云端下载
                 </button>
             </div>

             {!syncCode && (
                 <button onClick={handleCreateSyncCode} disabled={isSyncing} className="w-full py-2 text-xs text-slate-400 hover:text-indigo-500 font-medium underline">
                     我是新设备，点击生成一个新的同步码
                 </button>
             )}

             {syncMsg && (
                 <div className={`text-xs p-2 rounded-lg flex items-center gap-2 ${syncMsg.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                     {syncMsg.type === 'success' ? <Check size={14} /> : <AlertTriangle size={14} />}
                     {syncMsg.text}
                 </div>
             )}
          </div>

          {/* --- File Backup Section --- */}
          <div className="space-y-3">
             <div className="flex items-center gap-2 text-slate-500 font-bold text-xs uppercase tracking-wider">
                <Database size={14} />
                <span>本地文件备份</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <button onClick={handleExport} className="py-2 bg-slate-50 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-100 border border-slate-200">导出文件</button>
                <button onClick={() => handleImportClick('restore')} className="py-2 bg-slate-50 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-100 border border-slate-200">恢复备份</button>
                <button onClick={() => handleImportClick('merge')} className="col-span-2 py-2 bg-slate-50 text-slate-500 rounded-lg text-xs font-bold hover:bg-slate-100 border border-slate-200">导入数据 (合并)</button>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
            </div>
          </div>

          {/* --- API Key Section --- */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <div className="flex items-center gap-2 text-slate-400 font-bold text-xs uppercase tracking-wider">
                <Key size={14} />
                <span>API Key (高级)</span>
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