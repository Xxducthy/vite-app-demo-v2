
import React, { useState } from 'react';
import { ShopItem, UserCoupon } from '../types';
import { Heart, ShoppingBag, Ticket, Plus, Trash2, CheckCircle2, Gift } from 'lucide-react';

interface LoveStoreProps {
  points: number;
  shopItems: ShopItem[];
  inventory: UserCoupon[];
  onPurchase: (item: ShopItem) => void;
  onUseCoupon: (couponId: string) => void;
  onAddCustomItem: (name: string, cost: number, desc: string) => void;
  onDeleteItem: (id: string) => void;
}

export const LoveStore: React.FC<LoveStoreProps> = ({ 
  points, 
  shopItems, 
  inventory, 
  onPurchase, 
  onUseCoupon,
  onAddCustomItem,
  onDeleteItem
}) => {
  const [activeTab, setActiveTab] = useState<'mall' | 'inventory'>('mall');
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Custom Item Form State
  const [newItemName, setNewItemName] = useState('');
  const [newItemCost, setNewItemCost] = useState(100);
  const [newItemDesc, setNewItemDesc] = useState('');

  const handleAddItem = () => {
      if (newItemName.trim()) {
          onAddCustomItem(newItemName, newItemCost, newItemDesc);
          setNewItemName('');
          setNewItemCost(100);
          setNewItemDesc('');
          setShowAddModal(false);
      }
  };

  return (
    <div className="h-full flex flex-col bg-pink-50/50 dark:bg-slate-900 animate-in fade-in pt-28 pb-32 relative">
      
      {/* Header with Points */}
      <div className="absolute top-28 left-0 right-0 p-6 pb-12 bg-gradient-to-r from-pink-400 to-rose-400 dark:from-pink-900 dark:to-rose-900 rounded-b-[2.5rem] shadow-lg shadow-pink-200 dark:shadow-none text-white z-10">
          <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                  <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                      <Gift size={20} />
                  </div>
                  <span className="font-bold text-lg tracking-wide">恋爱商城</span>
              </div>
              <div className="px-3 py-1 bg-white/20 rounded-full text-xs font-medium backdrop-blur-md">
                  Made for Love
              </div>
          </div>
          
          <div className="text-center mt-2">
              <span className="text-pink-100 text-xs font-bold uppercase tracking-widest">当前恋爱基金</span>
              <div className="flex items-center justify-center gap-2 mt-1">
                  <Heart size={28} fill="currentColor" className="text-white animate-pulse" />
                  <span className="text-5xl font-black">{points}</span>
              </div>
          </div>
      </div>

      {/* Spacer for absolute header */}
      <div className="h-48 shrink-0"></div>

      {/* Tabs */}
      <div className="flex justify-center -mt-6 z-20 mb-4 px-6 relative">
          <div className="bg-white dark:bg-slate-800 p-1.5 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none flex w-full max-w-xs border border-pink-100 dark:border-slate-700">
              <button 
                onClick={() => setActiveTab('mall')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'mall' ? 'bg-pink-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
              >
                  <ShoppingBag size={16} /> 兑换列表
              </button>
              <button 
                onClick={() => setActiveTab('inventory')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'inventory' ? 'bg-pink-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
              >
                  <Ticket size={16} /> 我的卡包
              </button>
          </div>
      </div>

      {/* Content Area */}
      <div className="flex-grow overflow-y-auto p-6 space-y-4 no-scrollbar">
          
          {activeTab === 'mall' ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                    {/* Add New Item Card */}
                    <button 
                        onClick={() => setShowAddModal(true)}
                        className="aspect-[4/5] rounded-3xl border-2 border-dashed border-pink-200 dark:border-slate-700 flex flex-col items-center justify-center text-pink-300 dark:text-slate-600 hover:bg-pink-50 dark:hover:bg-slate-800/50 hover:border-pink-300 transition-all gap-2 group"
                    >
                        <div className="w-12 h-12 rounded-full bg-pink-100 dark:bg-slate-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Plus size={24} />
                        </div>
                        <span className="text-xs font-bold">添加专属礼物</span>
                    </button>

                    {shopItems.map(item => {
                        const canAfford = points >= item.cost;
                        return (
                            <div key={item.id} className="bg-white dark:bg-slate-800 rounded-3xl p-4 shadow-sm border border-pink-100 dark:border-slate-700 flex flex-col relative overflow-hidden group">
                                {/* Delete Button - Enabled for ALL items */}
                                <button 
                                    onClick={() => onDeleteItem(item.id)} 
                                    className="absolute top-2 right-2 p-1.5 text-slate-300 hover:text-rose-500 transition-colors z-10 opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 size={14}/>
                                </button>
                                
                                <div className="text-4xl mb-3 text-center pt-2 transform group-hover:scale-110 transition-transform duration-300">{item.icon}</div>
                                <h3 className="font-bold text-slate-800 dark:text-white text-center mb-1">{item.name}</h3>
                                <p className="text-[10px] text-slate-400 text-center mb-4 line-clamp-2 min-h-[2.5em]">{item.description}</p>
                                
                                <div className="mt-auto">
                                    <button 
                                        onClick={() => canAfford && onPurchase(item)}
                                        disabled={!canAfford}
                                        className={`w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                                            canAfford 
                                            ? 'bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-300 hover:bg-pink-500 hover:text-white' 
                                            : 'bg-slate-100 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                                        }`}
                                    >
                                        {canAfford ? '兑换' : '积分不足'} 
                                        <span className="ml-1">{item.cost}</span>
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
              </>
          ) : (
              <div className="space-y-4">
                  {inventory.length === 0 ? (
                      <div className="text-center py-20 text-slate-400">
                          <Ticket size={48} className="mx-auto mb-4 opacity-20" />
                          <p>卡包是空的，快去背单词赚积分吧！</p>
                      </div>
                  ) : (
                      inventory.sort((a, b) => (a.isUsed === b.isUsed ? 0 : a.isUsed ? 1 : -1)).map(coupon => (
                          <div key={coupon.id} className={`relative rounded-3xl p-5 border flex items-center gap-4 transition-all ${coupon.isUsed ? 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 opacity-60 grayscale' : 'bg-white dark:bg-slate-800 border-pink-100 dark:border-slate-700 shadow-sm shadow-pink-100 dark:shadow-none'}`}>
                              <div className="w-14 h-14 rounded-2xl bg-pink-50 dark:bg-pink-900/20 flex items-center justify-center text-3xl shrink-0">
                                  {coupon.icon}
                              </div>
                              <div className="flex-grow min-w-0">
                                  <h3 className="font-bold text-slate-800 dark:text-white truncate">{coupon.name}</h3>
                                  <p className="text-xs text-slate-400 line-clamp-1 mb-2">{coupon.description}</p>
                                  <div className="text-[10px] text-slate-300 dark:text-slate-600 font-mono">
                                      {coupon.isUsed ? `已核销: ${new Date(coupon.usedAt!).toLocaleDateString()}` : `获取于: ${new Date(coupon.purchasedAt).toLocaleDateString()}`}
                                  </div>
                              </div>
                              <div className="shrink-0">
                                  {coupon.isUsed ? (
                                      <div className="w-10 h-10 rounded-full border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-300 dark:text-slate-600">
                                          <CheckCircle2 size={20} />
                                      </div>
                                  ) : (
                                      <button 
                                        onClick={() => onUseCoupon(coupon.id)}
                                        className="px-4 py-2 bg-pink-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-pink-200 dark:shadow-none hover:scale-105 active:scale-95 transition-all"
                                      >
                                          使用
                                      </button>
                                  )}
                              </div>
                              
                              {/* Ticket Semicircles */}
                              <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-pink-50/50 dark:bg-slate-950 rounded-full"></div>
                              <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-pink-50/50 dark:bg-slate-950 rounded-full"></div>
                          </div>
                      ))
                  )}
              </div>
          )}
      </div>

      {/* Add Item Modal */}
      {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2rem] p-6 shadow-2xl relative">
                  <button onClick={() => setShowAddModal(false)} className="absolute top-4 right-4 text-slate-400"><Trash2 size={18} /></button>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6">添加自定义礼物</h3>
                  
                  <div className="space-y-4">
                      <div>
                          <label className="text-xs font-bold text-slate-400 uppercase ml-1">礼物名称</label>
                          <input type="text" value={newItemName} onChange={e => setNewItemName(e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none outline-none font-bold text-slate-800 dark:text-white mt-1" placeholder="例如：周末去游乐园" />
                      </div>
                      <div>
                          <label className="text-xs font-bold text-slate-400 uppercase ml-1">所需积分</label>
                          <input type="number" value={newItemCost} onChange={e => setNewItemCost(Number(e.target.value))} className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none outline-none font-bold text-pink-500 mt-1" />
                      </div>
                      <div>
                          <label className="text-xs font-bold text-slate-400 uppercase ml-1">备注/说明</label>
                          <input type="text" value={newItemDesc} onChange={e => setNewItemDesc(e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none outline-none text-sm text-slate-600 dark:text-slate-300 mt-1" placeholder="任何私密的小要求..." />
                      </div>
                      
                      <button onClick={handleAddItem} className="w-full py-3.5 bg-pink-500 text-white rounded-xl font-bold mt-2 shadow-lg shadow-pink-200 dark:shadow-none hover:bg-pink-600 transition-colors">
                          确认上架
                      </button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};