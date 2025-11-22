
import React, { useState, useEffect } from 'react';
import { X, Save, Key, AlertTriangle } from 'lucide-react';

interface SettingsModalProps {
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('custom_api_key') || '';
    setApiKey(saved);
  }, []);

  const handleSave = () => {
    localStorage.setItem('custom_api_key', apiKey.trim());
    window.location.reload(); // Reload to apply changes
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
          <X size={20} />
        </button>
        
        <div className="flex items-center gap-2 mb-4 text-indigo-600">
          <Key size={24} />
          <h2 className="text-lg font-bold">API Key 设置</h2>
        </div>

        <div className="space-y-4">
          <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 text-xs text-amber-700 flex gap-2">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            <p>仅在预览环境或 Cloudflare 环境变量失效时使用。优先读取环境变量。</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">DeepSeek API Key</label>
            <input 
              type="text" 
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full p-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            />
          </div>

          <button 
            onClick={handleSave}
            className="w-full bg-indigo-600 text-white py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
          >
            <Save size={16} />
            保存并刷新
          </button>
        </div>
      </div>
    </div>
  );
};
