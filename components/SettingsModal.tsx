
import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Key, AlertTriangle, Database, Download, Upload } from 'lucide-react';
import { Word } from '../types';

interface SettingsModalProps {
  onClose: () => void;
  currentWords?: Word[]; // For Export
  onRestoreData?: (words: Word[]) => void; // For Import
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, currentWords, onRestoreData }) => {
  const [apiKey, setApiKey] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('custom_api_key') || '';
    setApiKey(saved);
  }, []);

  const handleSaveKey = () => {
    localStorage.setItem('custom_api_key', apiKey.trim());
    window.location.reload(); 
  };

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

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json) && onRestoreData) {
            // Basic validation: Check if first item looks like a word
            if (json.length > 0 && (!json[0].id || !json[0].term)) {
                alert("文件格式不正确：不是有效的单词备份。");
                return;
            }
            onRestoreData(json);
        }
      } catch (err) {
        alert("无法解析文件，请确保是正确的 JSON 备份文件。");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
          <X size={20} />
        </button>
        
        <h2 className="text-lg font-bold text-slate-800 mb-6">应用设置</h2>

        <div className="space-y-6">
          
          {/* API Key Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm">
                <Key size={16} />
                <span>API Key 配置</span>
            </div>
            <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 text-xs text-amber-700 flex gap-2">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <p>仅在 Cloudflare 环境变量失效时使用。</p>
            </div>
            <div className="flex gap-2">
                <input 
                type="text" 
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="flex-1 p-2 border border-slate-300 rounded-lg text-sm font-mono outline-none focus:border-indigo-500"
                />
                <button onClick={handleSaveKey} className="bg-slate-900 text-white px-4 rounded-lg text-xs font-bold">保存</button>
            </div>
          </div>

          <div className="w-full h-px bg-slate-100"></div>

          {/* Data Management Section */}
          <div className="space-y-3">
             <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
                <Database size={16} />
                <span>数据备份与恢复</span>
            </div>
            <p className="text-xs text-slate-500">将进度从电脑同步到手机，或备份防丢失。</p>
            
            <div className="grid grid-cols-2 gap-3">
                <button 
                    onClick={handleExport}
                    className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
                >
                    <Download size={20} className="text-slate-600" />
                    <span className="text-xs font-bold text-slate-600">导出备份</span>
                </button>

                <button 
                    onClick={handleImportClick}
                    className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
                >
                    <Upload size={20} className="text-slate-600" />
                    <span className="text-xs font-bold text-slate-600">恢复备份</span>
                </button>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    accept=".json" 
                    className="hidden" 
                />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
