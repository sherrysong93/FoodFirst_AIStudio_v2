
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  Plus, 
  Camera, 
  ChevronRight, 
  Calendar, 
  Clock, 
  Trash2, 
  ChevronDown, 
  Utensils, 
  X,
  AlertTriangle,
  BarChart3,
  Home,
  List as ListIcon,
  ChefHat,
  Settings as SettingsIcon,
  CheckCircle2,
  AlertCircle,
  Package
} from 'lucide-react';
import { 
  Category, 
  Ingredient, 
  ShelfLifeUnit, 
  QuantityUnit, 
  IngredientStatus, 
  ConsumptionRecord, 
  ConsumptionReason,
  DailyActivityStatus,
  DailyStatus,
  UserProfile
} from './types';
import { CATEGORIES, QUANTITY_UNITS, SHELF_LIFE_UNITS, CATEGORY_KEYWORDS } from './constants';
import { extractFoodInfoFromImage } from './services/geminiService';

/**
 * Utility: Date manipulation
 */
const addTime = (date: string, value: number, unit: ShelfLifeUnit): string => {
  const d = new Date(date);
  if (unit === ShelfLifeUnit.DAY) d.setDate(d.getDate() + value);
  else if (unit === ShelfLifeUnit.MONTH) d.setMonth(d.getMonth() + value);
  else if (unit === ShelfLifeUnit.YEAR) d.setFullYear(d.getFullYear() + value);
  return d.toISOString();
};

const getRemainingDays = (expiry: string): number => {
  const diff = new Date(expiry).getTime() - new Date().getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

const formatShortDate = (date: string) => {
  return new Date(date).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
};

/**
 * Persistance Service (Local Storage for MVP)
 */
const Storage = {
  get: <T,>(key: string, defaultValue: T): T => {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  },
  set: (key: string, data: any) => {
    localStorage.setItem(key, JSON.stringify(data));
  }
};

/**
 * App Main Component
 */
const App = () => {
  // --- State ---
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => 
    Storage.get('user_profile', { id: 'user_1', name: '默认用户', avatar: '👤' })
  );
  const [ingredients, setIngredients] = useState<Ingredient[]>(() => Storage.get(`ingredients_${currentUser.id}`, []));
  const [consumptions, setConsumptions] = useState<ConsumptionRecord[]>(() => Storage.get(`consumptions_${currentUser.id}`, []));
  const [dailyStatuses, setDailyStatuses] = useState<DailyStatus[]>(() => Storage.get(`daily_statuses_${currentUser.id}`, []));
  
  const [activeTab, setActiveTab] = useState<'home' | 'list' | 'recipes' | 'settings'>('home');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isConsumeModalOpen, setIsConsumeModalOpen] = useState<Ingredient | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | 'all'>('all');

  // --- Effects ---
  useEffect(() => Storage.set(`ingredients_${currentUser.id}`, ingredients), [ingredients, currentUser.id]);
  useEffect(() => Storage.set(`consumptions_${currentUser.id}`, consumptions), [consumptions, currentUser.id]);
  useEffect(() => Storage.set(`daily_statuses_${currentUser.id}`, dailyStatuses), [dailyStatuses, currentUser.id]);

  // --- Logic ---
  const stats = useMemo(() => {
    const active = ingredients.filter(i => i.status === IngredientStatus.ACTIVE);
    
    // 逻辑优化：剩余天数 <= 3天即视为“即将过期”
    const expiringSoonCount = active.filter(i => {
      const remaining = getRemainingDays(i.expiryDate);
      return remaining >= 0 && remaining <= 3;
    }).length;

    const expiredCount = active.filter(i => getRemainingDays(i.expiryDate) < 0).length;

    const categoryStats = CATEGORIES.map(cat => ({
      ...cat,
      count: active.filter(i => i.category === cat.id).length
    }));

    return {
      total: active.length,
      expiringSoon: expiringSoonCount,
      expired: expiredCount,
      categoryStats
    };
  }, [ingredients]);

  const todaysStatus = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return dailyStatuses.find(s => s.date === todayStr);
  }, [dailyStatuses]);

  const handleAddIngredient = (newIngredient: Omit<Ingredient, 'id' | 'userId' | 'createdAt' | 'status'>) => {
    const id = crypto.randomUUID();
    const ingredient: Ingredient = {
      ...newIngredient,
      id,
      userId: currentUser.id,
      createdAt: new Date().toISOString(),
      status: IngredientStatus.ACTIVE
    };
    setIngredients(prev => [ingredient, ...prev]);
    setIsAddModalOpen(false);
  };

  const handleConsume = (ingredientId: string, quantity: number, reason: ConsumptionReason) => {
    const ingredient = ingredients.find(i => i.id === ingredientId);
    if (!ingredient) return;

    const newQuantity = Math.max(0, ingredient.currentQuantity - quantity);
    const newStatus = newQuantity <= 0 ? IngredientStatus.CONSUMED : IngredientStatus.ACTIVE;

    setIngredients(prev => prev.map(i => 
      i.id === ingredientId 
        ? { ...i, currentQuantity: newQuantity, status: newStatus } 
        : i
    ));

    const record: ConsumptionRecord = {
      id: crypto.randomUUID(),
      ingredientId,
      userId: currentUser.id,
      consumedQuantity: quantity,
      quantityUnit: ingredient.quantityUnit,
      consumedAt: new Date().toISOString(),
      reason
    };
    setConsumptions(prev => [record, ...prev]);
    setIsConsumeModalOpen(null);

    // Record daily activity if not already
    const todayStr = new Date().toISOString().split('T')[0];
    if (!todaysStatus) {
      setDailyStatuses(prev => [...prev, {
        id: crypto.randomUUID(),
        userId: currentUser.id,
        date: todayStr,
        status: DailyActivityStatus.COOKED
      }]);
    }
  };

  const handleDailyStatusUpdate = (status: DailyActivityStatus) => {
    const todayStr = new Date().toISOString().split('T')[0];
    if (todaysStatus) {
      setDailyStatuses(prev => prev.map(s => s.date === todayStr ? { ...s, status } : s));
    } else {
      setDailyStatuses(prev => [...prev, {
        id: crypto.randomUUID(),
        userId: currentUser.id,
        date: todayStr,
        status
      }]);
    }
  };

  // --- Sub-components (Views) ---

  const HomeView = () => (
    <div className="p-4 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">你好, {currentUser.name}</h1>
          <p className="text-slate-500 text-sm">今天也要好好吃饭 🥗</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-xl">
          {currentUser.avatar}
        </div>
      </header>

      {/* Daily Checklist Prompt */}
      {!todaysStatus && (
        <div className="bg-indigo-600 rounded-2xl p-4 text-white mb-6 shadow-lg shadow-indigo-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-white/20 p-2 rounded-lg"><Utensils className="w-5 h-5" /></div>
            <h3 className="font-semibold">今天有在家里做饭吗？</h3>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => handleDailyStatusUpdate(DailyActivityStatus.COOKED)}
              className="flex-1 bg-white text-indigo-600 py-2 rounded-xl text-sm font-bold"
            >
              做了，开火！
            </button>
            <button 
              onClick={() => handleDailyStatusUpdate(DailyActivityStatus.NOT_AT_HOME)}
              className="flex-1 bg-white/20 hover:bg-white/30 text-white py-2 rounded-xl text-sm font-medium transition-colors"
            >
              没在，出去吃
            </button>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-slate-500 text-xs mb-1">当前库存</p>
          <p className="text-3xl font-bold text-slate-800">{stats.total}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-slate-500 text-xs mb-1">即将过期</p>
          <div className="flex items-baseline gap-2">
            <p className={`text-3xl font-bold ${stats.expiringSoon > 0 ? 'text-rose-500' : 'text-slate-800'}`}>
              {stats.expiringSoon}
            </p>
            {stats.expiringSoon > 0 && <AlertCircle className="w-4 h-4 text-rose-500" />}
            {stats.expired > 0 && <span className="text-xs text-rose-400 font-bold">(已过期 {stats.expired})</span>}
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
        <BarChart3 className="w-5 h-5" /> 库存分类汇总
      </h2>
      <div className="grid grid-cols-3 gap-3 mb-6">
        {stats.categoryStats.map(cat => (
          <div 
            key={cat.id} 
            className={`flex flex-col items-center p-3 rounded-2xl border transition-all ${cat.count > 0 ? 'bg-white border-slate-100 shadow-sm' : 'bg-slate-50 border-transparent opacity-60'}`}
          >
            <div className={`p-2 rounded-xl mb-2 ${cat.bgColor} ${cat.color}`}>
              {cat.icon}
            </div>
            <span className="text-xs font-medium text-slate-700">{cat.label}</span>
            <span className="text-sm font-bold text-slate-900 mt-1">{cat.count}</span>
          </div>
        ))}
      </div>

      {/* Expiring Soon Quick List - 逻辑与统计保持一致 */}
      {(stats.expiringSoon > 0 || stats.expired > 0) && (
        <>
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-500" /> 风险预警
          </h2>
          <div className="space-y-3">
            {ingredients
              .filter(i => {
                if (i.status !== IngredientStatus.ACTIVE) return false;
                const remaining = getRemainingDays(i.expiryDate);
                return remaining <= 3; // 只要不足3天即显示在预警中
              })
              .map(item => <IngredientItem key={item.id} item={item} onConsume={() => setIsConsumeModalOpen(item)} />)
            }
          </div>
        </>
      )}
    </div>
  );

  const ListView = () => {
    const filtered = ingredients.filter(i => {
      const matchesCategory = selectedCategory === 'all' || i.category === selectedCategory;
      return matchesCategory && i.status === IngredientStatus.ACTIVE;
    });

    return (
      <div className="p-4 pb-24 min-h-screen">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-slate-800">库存清单</h1>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200"
          >
            <Plus />
          </button>
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4 mb-4">
          <button 
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap border transition-all ${selectedCategory === 'all' ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-600'}`}
          >
            全部
          </button>
          {CATEGORIES.map(cat => (
            <button 
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap border transition-all ${selectedCategory === cat.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-600'}`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {filtered.length > 0 ? (
            filtered.map(item => (
              <IngredientItem key={item.id} item={item} onConsume={() => setIsConsumeModalOpen(item)} />
            ))
          ) : (
            <div className="text-center py-20">
              <div className="inline-block p-4 bg-slate-50 rounded-full mb-4">
                <ListIcon className="w-8 h-8 text-slate-300" />
              </div>
              <p className="text-slate-500">没有发现符合条件的食材</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const IngredientItem = ({ item, onConsume }: { item: Ingredient, onConsume: () => void }) => {
    const category = CATEGORIES.find(c => c.id === item.category);
    const remainingDays = getRemainingDays(item.expiryDate);
    const progress = Math.min(1, item.currentQuantity / item.initialQuantity);

    return (
      <div 
        onClick={onConsume}
        className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm active:scale-[0.98] transition-all flex items-center gap-4 group"
      >
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${category?.bgColor} ${category?.color}`}>
          {category?.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start mb-1">
            <h3 className="font-bold text-slate-800 truncate">{item.name}</h3>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${remainingDays < 0 ? 'bg-rose-100 text-rose-600' : (remainingDays === 0 ? 'bg-orange-100 text-orange-600' : (remainingDays <= 3 ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-600'))}`}>
              {remainingDays < 0 ? '已过期' : (remainingDays === 0 ? '今天过期' : `${remainingDays}天后过期`)}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatShortDate(item.expiryDate)} 过期</span>
            <span className="flex items-center gap-1"><Package className="w-3 h-3" /> 剩 {item.currentQuantity}{item.quantityUnit}</span>
          </div>
          <div className="mt-2 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${remainingDays < 0 ? 'bg-rose-500' : (remainingDays <= 3 ? 'bg-orange-400' : 'bg-emerald-400')}`}
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-slate-300" />
      </div>
    );
  };

  const AddEditModal = () => {
    const [name, setName] = useState('');
    const [category, setCategory] = useState<Category>('others');
    const [prodDate, setProdDate] = useState(new Date().toISOString().split('T')[0]);
    const [lifeVal, setLifeVal] = useState(7);
    const [lifeUnit, setLifeUnit] = useState<ShelfLifeUnit>(ShelfLifeUnit.DAY);
    const [qty, setQty] = useState(1);
    const [unit, setUnit] = useState<QuantityUnit>(QuantityUnit.PCS);
    
    // 追踪用户是否手动更改过分类，手动更改后不再自动匹配
    const hasManuallyChangedCategory = useRef(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // 智能匹配逻辑
    useEffect(() => {
      if (!name || hasManuallyChangedCategory.current) return;

      // 在分类关键词中寻找匹配
      for (const [catId, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
        if (keywords.some(k => name.includes(k))) {
          setCategory(catId as Category);
          break;
        }
      }
    }, [name]);

    const handleOCR = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      setIsProcessing(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const info = await extractFoodInfoFromImage(base64);
        if (info) {
          setName(info.name || name);
          setCategory((info.category as Category) || category);
          if (info.productionDate) setProdDate(info.productionDate);
          if (info.shelfLifeValue) setLifeVal(info.shelfLifeValue);
          if (info.shelfLifeUnit) setLifeUnit(info.shelfLifeUnit as ShelfLifeUnit);
        }
        setIsProcessing(false);
      };
      reader.readAsDataURL(file);
    };

    const submit = () => {
      if (!name) return;
      const expiryDate = addTime(prodDate, lifeVal, lifeUnit);
      handleAddIngredient({
        name,
        category,
        productionDate: prodDate,
        shelfLifeValue: lifeVal,
        shelfLifeUnit: lifeUnit,
        expiryDate,
        initialQuantity: qty,
        currentQuantity: qty,
        quantityUnit: unit,
      });
    };

    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
        <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-500">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center">
            <h2 className="text-xl font-bold text-slate-800">添加食材</h2>
            <button onClick={() => setIsAddModalOpen(false)} className="p-2 bg-slate-50 rounded-full text-slate-400">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
            {/* AI Magic Button */}
            <button 
              disabled={isProcessing}
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-4 bg-indigo-50 border-2 border-dashed border-indigo-200 rounded-2xl flex flex-col items-center justify-center gap-2 group hover:bg-indigo-100 transition-all disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <div className="w-6 h-6 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  <span className="text-indigo-600 font-bold">AI 识别中...</span>
                </>
              ) : (
                <>
                  <Camera className="w-8 h-8 text-indigo-600 group-hover:scale-110 transition-transform" />
                  <span className="text-indigo-600 font-bold">拍照识别标签</span>
                </>
              )}
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleOCR} />
            </button>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">基本信息</label>
              <input 
                value={name} onChange={e => setName(e.target.value)}
                placeholder="食材名称 (例如: 澳洲肥牛)"
                className="w-full p-4 bg-slate-50 border-transparent border-2 focus:border-indigo-500 rounded-2xl outline-none transition-all font-medium text-slate-800"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">分类</label>
                <div className="relative">
                  <select 
                    value={category} 
                    onChange={e => {
                      setCategory(e.target.value as Category);
                      hasManuallyChangedCategory.current = true; // 标记用户已手动选择
                    }}
                    className={`w-full p-4 rounded-2xl appearance-none outline-none font-medium border-2 transition-all ${CATEGORIES.find(c => c.id === category)?.bgColor} ${CATEGORIES.find(c => c.id === category)?.color} border-transparent focus:border-indigo-500`}
                  >
                    {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">生产日期</label>
                <input 
                  type="date" value={prodDate} onChange={e => setProdDate(e.target.value)}
                  className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-medium text-slate-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
               <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">保质期</label>
                <div className="flex items-center bg-slate-50 rounded-2xl">
                  <input 
                    type="number" value={lifeVal} onChange={e => setLifeVal(Number(e.target.value))}
                    className="flex-1 p-4 bg-transparent outline-none font-medium text-slate-800"
                  />
                  <select 
                    value={lifeUnit} onChange={e => setLifeUnit(e.target.value as ShelfLifeUnit)}
                    className="px-4 py-4 bg-transparent outline-none border-l border-slate-200 text-sm font-bold text-slate-500"
                  >
                    {SHELF_LIFE_UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">数量</label>
                <div className="flex items-center bg-slate-50 rounded-2xl">
                   <input 
                    type="number" value={qty} onChange={e => setQty(Number(e.target.value))}
                    className="flex-1 p-4 bg-transparent outline-none font-medium text-slate-800 w-full"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">单位</label>
              <div className="grid grid-cols-3 gap-2">
                {QUANTITY_UNITS.map(u => (
                  <button 
                    key={u.value}
                    onClick={() => setUnit(u.value as QuantityUnit)}
                    className={`py-2 rounded-xl text-sm font-bold transition-all border-2 ${unit === u.value ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-100 text-slate-500'}`}
                  >
                    {u.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="p-6 bg-slate-50">
            <button 
              onClick={submit}
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-100 active:scale-[0.98] transition-all"
            >
              确认入库
            </button>
          </div>
        </div>
      </div>
    );
  };

  const ConsumeModal = () => {
    const item = isConsumeModalOpen;
    if (!item) return null;

    const [qty, setQty] = useState(item.currentQuantity);
    const [reason, setReason] = useState<ConsumptionReason>(ConsumptionReason.COOKING);

    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
        <div className="bg-white w-full max-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-500">
          <div className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${CATEGORIES.find(c => c.id === item.category)?.bgColor}`}>
                {CATEGORIES.find(c => c.id === item.category)?.icon}
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">{item.name}</h2>
                <p className="text-slate-500">当前剩余: {item.currentQuantity}{item.quantityUnit}</p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-3">消耗数量</label>
                <div className="flex items-center gap-4">
                  <input 
                    type="range" min="0.1" max={item.currentQuantity} step="0.1"
                    value={qty} onChange={e => setQty(Number(e.target.value))}
                    className="flex-1 accent-indigo-600"
                  />
                  <div className="w-24 text-center p-2 bg-slate-50 rounded-xl font-bold text-indigo-600 border border-indigo-100">
                    {qty.toFixed(1)} {item.quantityUnit}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-3">消耗原因</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: ConsumptionReason.COOKING, label: '正常做饭', icon: <Utensils className="w-4 h-4" /> },
                    { id: ConsumptionReason.REMINDER, label: '提醒后消耗', icon: <AlertCircle className="w-4 h-4" /> },
                    { id: ConsumptionReason.DISCARD, label: '清理丢弃', icon: <Trash2 className="w-4 h-4" /> },
                    { id: ConsumptionReason.OTHER, label: '其他', icon: <Package className="w-4 h-4" /> },
                  ].map(r => (
                    <button 
                      key={r.id}
                      onClick={() => setReason(r.id)}
                      className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold border-2 transition-all ${reason === r.id ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-100 text-slate-500'}`}
                    >
                      {r.icon} {r.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 bg-slate-50 flex gap-3">
            <button 
              onClick={() => setIsConsumeModalOpen(null)}
              className="flex-1 py-4 bg-white text-slate-500 border border-slate-200 rounded-2xl font-bold"
            >
              取消
            </button>
            <button 
              onClick={() => handleConsume(item.id, qty, reason)}
              className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-100"
            >
              确认消耗
            </button>
          </div>
        </div>
      </div>
    );
  };

  const RecipeView = () => (
    <div className="p-4 flex flex-col items-center justify-center min-h-[80vh] text-center">
      <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
        <ChefHat className="w-12 h-12 text-indigo-300" />
      </div>
      <h2 className="text-xl font-bold text-slate-800 mb-2">菜谱推荐，敬请期待</h2>
      <p className="text-slate-500 max-w-xs">AI 厨师正在钻研你的库存，很快就能根据你的即将过期食材提供专属搭配方案了！</p>
      <div className="mt-8 px-6 py-2 bg-indigo-100 text-indigo-600 rounded-full text-sm font-bold">Phase 2 核心功能</div>
    </div>
  );

  const SettingsView = () => {
    const totalConsumed = consumptions.reduce((acc, curr) => acc + curr.consumedQuantity, 0);
    const discardCount = consumptions.filter(c => c.reason === ConsumptionReason.DISCARD).length;

    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold text-slate-800 mb-8">个人中心</h1>
        
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm mb-6 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-3xl">
            {currentUser.avatar}
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">{currentUser.name}</h3>
            <p className="text-slate-500 text-sm">已减少厨余浪费 {discardCount === 0 ? '保持完美记录!' : `挽救了 ${discardCount} 次食材`}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
            <p className="text-emerald-600 text-xs font-bold uppercase mb-1">累计录入</p>
            <p className="text-2xl font-bold text-emerald-900">{ingredients.length}</p>
          </div>
          <div className="bg-sky-50 p-4 rounded-2xl border border-sky-100">
            <p className="text-sky-600 text-xs font-bold uppercase mb-1">累计消耗</p>
            <p className="text-2xl font-bold text-sky-900">{consumptions.length}</p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-400 uppercase ml-2 mb-2">App 设置</label>
          <button className="w-full flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <span className="font-medium text-slate-700">推送提醒 (3天阈值)</span>
            <div className="w-10 h-5 bg-indigo-600 rounded-full relative">
              <div className="absolute right-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm" />
            </div>
          </button>
          <button 
            onClick={() => {
              if (confirm('确定要清除所有本地数据吗？')) {
                localStorage.clear();
                window.location.reload();
              }
            }}
            className="w-full flex items-center justify-between p-4 bg-white rounded-2xl border border-rose-50 text-rose-500 font-medium"
          >
            <span>清除所有数据</span>
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 relative overflow-x-hidden">
      {/* Tab Content */}
      <div className="safe-bottom">
        {activeTab === 'home' && <HomeView />}
        {activeTab === 'list' && <ListView />}
        {activeTab === 'recipes' && <RecipeView />}
        {activeTab === 'settings' && <SettingsView />}
      </div>

      {/* Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/80 backdrop-blur-md border-t border-slate-200 safe-bottom z-40">
        <div className="flex justify-around items-center p-2 h-16">
          <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'home' ? 'text-indigo-600 scale-110' : 'text-slate-400 hover:text-slate-600'}`}>
            <Home className="w-6 h-6" />
            <span className="text-[10px] font-bold">总览</span>
          </button>
          <button onClick={() => setActiveTab('list')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'list' ? 'text-indigo-600 scale-110' : 'text-slate-400 hover:text-slate-600'}`}>
            <ListIcon className="w-6 h-6" />
            <span className="text-[10px] font-bold">库存</span>
          </button>
          <button onClick={() => setActiveTab('recipes')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'recipes' ? 'text-indigo-600 scale-110' : 'text-slate-400 hover:text-slate-600'}`}>
            <ChefHat className="w-6 h-6" />
            <span className="text-[10px] font-bold">菜谱</span>
          </button>
          <button onClick={() => setActiveTab('settings')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'settings' ? 'text-indigo-600 scale-110' : 'text-slate-400 hover:text-slate-600'}`}>
            <SettingsIcon className="w-6 h-6" />
            <span className="text-[10px] font-bold">我的</span>
          </button>
        </div>
      </nav>

      {/* Floating Action Button (Only on Home and List) */}
      {(activeTab === 'home' || activeTab === 'list') && (
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="fixed bottom-20 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-xl shadow-indigo-300 z-50 active:scale-90 transition-transform"
        >
          <Plus className="w-8 h-8" />
        </button>
      )}

      {/* Modals */}
      {isAddModalOpen && <AddEditModal />}
      {isConsumeModalOpen && <ConsumeModal />}
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
