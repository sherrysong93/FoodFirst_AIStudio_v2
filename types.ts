export type Category = 'vegetables' | 'fruits' | 'dairy' | 'meat' | 'fish' | 'others';

export enum ShelfLifeUnit {
  DAY = 'day',
  MONTH = 'month',
  YEAR = 'year'
}

export enum QuantityUnit {
  G = 'g',
  ML = 'ml',
  PCS = 'pcs'
}

export enum IngredientStatus {
  ACTIVE = 'active',
  CONSUMED = 'consumed',
  DISCARDED = 'discarded'
}

export enum ConsumptionReason {
  COOKING = 'cooking',
  REMINDER = 'reminder',
  DISCARD = 'discard',
  OTHER = 'other'
}

export interface Ingredient {
  id: string;
  userId: string;
  name: string;
  category: Category;
  productionDate: string; // ISO string
  shelfLifeValue: number;
  shelfLifeUnit: ShelfLifeUnit;
  expiryDate: string; // Calculated ISO string
  initialQuantity: number;
  currentQuantity: number;
  quantityUnit: QuantityUnit;
  status: IngredientStatus;
  createdAt: string;
}

export interface ConsumptionRecord {
  id: string;
  ingredientId: string;
  userId: string;
  consumedQuantity: number;
  quantityUnit: QuantityUnit;
  consumedAt: string;
  reason: ConsumptionReason;
}

export enum DailyActivityStatus {
  COOKED = 'cooked',
  NOT_AT_HOME = 'not_at_home',
  SKIPPED = 'skipped'
}

export interface DailyStatus {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  status: DailyActivityStatus;
}

export interface UserProfile {
  id: string;
  name: string;
  avatar: string;
}
