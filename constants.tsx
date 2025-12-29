
import React from 'react';
import { 
  Carrot, 
  Apple, 
  Milk, 
  Beef, 
  Fish, 
  Package,
} from 'lucide-react';
import { Category } from './types';

export const CATEGORIES: { id: Category; label: string; icon: React.ReactNode; color: string; bgColor: string }[] = [
  { id: 'vegetables', label: '蔬菜', icon: <Carrot className="w-5 h-5" />, color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
  { id: 'fruits', label: '水果', icon: <Apple className="w-5 h-5" />, color: 'text-rose-600', bgColor: 'bg-rose-50' },
  { id: 'dairy', label: '乳制品', icon: <Milk className="w-5 h-5" />, color: 'text-sky-600', bgColor: 'bg-sky-50' },
  { id: 'meat', label: '肉类', icon: <Beef className="w-5 h-5" />, color: 'text-orange-600', bgColor: 'bg-orange-50' },
  { id: 'fish', label: '鱼类', icon: <Fish className="w-5 h-5" />, color: 'text-cyan-600', bgColor: 'bg-cyan-50' },
  { id: 'others', label: '其他', icon: <Package className="w-5 h-5" />, color: 'text-slate-600', bgColor: 'bg-slate-50' },
];

// 食材关键词映射表
export const CATEGORY_KEYWORDS: Record<Category, string[]> = {
  vegetables: ['菜', '茄', '椒', '薯', '瓜', '豆', '菇', '笋', '萝卜', '葱', '蒜', '姜', '芹', '兰'],
  fruits: ['果', '莓', '桃', '柑', '橘', '橙', '蕉', '梨', '枣', '瓜', '西瓜', '哈密瓜', '榴莲', '芒果'],
  dairy: ['奶', '酪', '乳', '蛋', '奶油', '芝士', '黄油'],
  meat: ['肉', '肠', '翅', '腿', '腹', '肝', '心', '培根', '火腿', '排骨'],
  fish: ['鱼', '虾', '蟹', '蚝', '蚬', '鱿', '鲍', '螺', '鳕', '鳗'],
  others: []
};

export const QUANTITY_UNITS = [
  { value: 'g', label: '克' },
  { value: 'ml', label: '毫升' },
  { value: 'pcs', label: '个/件' },
];

export const SHELF_LIFE_UNITS = [
  { value: 'day', label: '天' },
  { value: 'month', label: '月' },
  { value: 'year', label: '年' },
];
