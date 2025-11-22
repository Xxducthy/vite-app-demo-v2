
import React from 'react';
import { Share, Plus, MoreVertical, Download, X, Smartphone } from 'lucide-react';

interface InstallGuideProps {
  onClose: () => void;
  isIOS: boolean;
}

export const InstallGuide: React.FC<InstallGuideProps> = ({ onClose, isIOS }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-md rounded-[2rem] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-10 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-center">
           <div className="flex items-center gap-3">
              <div className="bg-indigo-100 p-2 rounded-xl text-indigo-600">
                 <Smartphone size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">安装到手机</h3>
                <p className="text-xs text-slate-500">像原生 App 一样全屏运行</p>
              </div>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
             <X size={20} className="text-slate-500" />
           </button>
        </div>

        {/* Content */}
        <div className="p-8 space-y-8">
           {isIOS ? (
             // iOS Guide
             <div className="space-y-6">
                <div className="flex items-start gap-4">
                   <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold shrink-0 mt-1">1</div>
                   <div>
                      <p className="font-bold text-slate-800 mb-1">点击浏览器的“分享”按钮</p>
                      <p className="text-sm text-slate-500">通常位于屏幕底部中间</p>
                      <div className="mt-3 bg-slate-100 p-2 rounded-lg inline-block">
                         <Share className="text-blue-500 mx-auto" />
                      </div>
                   </div>
                </div>
                <div className="w-px h-6 bg-slate-200 ml-4"></div>
                <div className="flex items-start gap-4">
                   <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold shrink-0 mt-1">2</div>
                   <div>
                      <p className="font-bold text-slate-800 mb-1">向下滑动，选择“添加到主屏幕”</p>
                      <div className="mt-3 bg-slate-100 px-3 py-2 rounded-lg inline-flex items-center gap-2 border border-slate-200">
                         <Plus size={16} className="text-slate-400" />
                         <span className="text-sm font-medium">添加到主屏幕</span>
                      </div>
                   </div>
                </div>
             </div>
           ) : (
             // Android / General Guide
             <div className="space-y-6">
                <div className="flex items-start gap-4">
                   <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold shrink-0 mt-1">1</div>
                   <div>
                      <p className="font-bold text-slate-800 mb-1">点击右上角菜单</p>
                      <p className="text-sm text-slate-500">或者点击本页面顶部的“安装”按钮</p>
                      <div className="mt-3 bg-slate-100 p-2 rounded-lg inline-block">
                         <MoreVertical className="text-slate-600 mx-auto" />
                      </div>
                   </div>
                </div>
                <div className="w-px h-6 bg-slate-200 ml-4"></div>
                <div className="flex items-start gap-4">
                   <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold shrink-0 mt-1">2</div>
                   <div>
                      <p className="font-bold text-slate-800 mb-1">选择“安装应用”</p>
                      <div className="mt-3 bg-slate-100 px-3 py-2 rounded-lg inline-flex items-center gap-2 border border-slate-200">
                         <Download size={16} className="text-slate-600" />
                         <span className="text-sm font-medium">安装应用 / 添加到桌面</span>
                      </div>
                   </div>
                </div>
             </div>
           )}
        </div>
        
        <div className="bg-indigo-50 p-4 text-center">
           <p className="text-xs text-indigo-600 font-medium">安装后，您可以从桌面直接启动，无需打开浏览器。</p>
        </div>
      </div>
    </div>
  );
};
