import type { LucideIcon } from "lucide-react";
import {
  Zap, Wifi, BookOpen, Pencil, Building2, Users, Wrench, Bus,
  Coffee, ShoppingBag, Receipt, Sparkles, Wallet, Megaphone,
  Briefcase, Plug, Heart, CreditCard, Banknote, IndianRupee,
} from "lucide-react";

// Icon registry — DB stores the string key, UI renders the matching icon.
export const ICONS: Record<string, LucideIcon> = {
  zap: Zap,
  wifi: Wifi,
  book: BookOpen,
  pencil: Pencil,
  building: Building2,
  users: Users,
  wrench: Wrench,
  bus: Bus,
  coffee: Coffee,
  bag: ShoppingBag,
  receipt: Receipt,
  sparkles: Sparkles,
  wallet: Wallet,
  megaphone: Megaphone,
  briefcase: Briefcase,
  plug: Plug,
  heart: Heart,
  card: CreditCard,
  banknote: Banknote,
  rupee: IndianRupee,
};

export const ICON_KEYS = Object.keys(ICONS);

export const CATEGORY_PALETTE = [
  "#0B3C5D", "#D4AF37", "#3B82F6", "#8B5CF6", "#EC4899",
  "#10B981", "#F59E0B", "#EF4444", "#06B6D4", "#84CC16",
];

export type PaymentMethod = "Cash" | "UPI" | "Bank Transfer" | "Card";
export const PAYMENT_METHODS: readonly PaymentMethod[] = ["Cash", "UPI", "Bank Transfer", "Card"] as const;

export interface ExpenseCategory {
  id: string;
  name: string;
  icon: string;          // key into ICONS
  color: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
}

export interface ExpenseCategoryInput {
  name: string;
  icon: string;
  color: string;
  is_active?: boolean;
}

export interface Expense {
  id: string;
  title: string;
  category_id: string | null;
  amount: number;
  payment_method: PaymentMethod;
  expense_date: string;       // YYYY-MM-DD
  campus_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  // joined
  category?: { id: string; name: string; icon: string; color: string } | null;
  campus?: { id: string; name: string } | null;
}

export interface ExpenseInput {
  title: string;
  category_id: string | null;
  amount: number;
  payment_method: PaymentMethod;
  expense_date: string;
  campus_id: string | null;
  notes?: string | null;
}

export type Period = "today" | "week" | "month" | "year" | "all";

export interface ExpenseFilters {
  search: string;
  category_id: string;
  campus_id: string;
  payment_method: PaymentMethod | "";
  period: Period;
  date_from: string;
  date_to: string;
}

export const EMPTY_FILTERS: ExpenseFilters = {
  search: "",
  category_id: "",
  campus_id: "",
  payment_method: "",
  period: "month",
  date_from: "",
  date_to: "",
};

export type IconKey = keyof typeof ICONS;

export const CUSTOM_PALETTE = CATEGORY_PALETTE;

export interface ExpenseItem {
  id: string;
  label: string;
  iconKey: IconKey;
  color: string;
  amount: number;
  custom?: boolean;
  notes?: string;
}

export const DEFAULT_ITEMS: ExpenseItem[] = [
  { id: "e1", label: "Electricity", iconKey: "zap", color: "#F59E0B", amount: 0 },
  { id: "e2", label: "Internet", iconKey: "wifi", color: "#3B82F6", amount: 0 },
  { id: "e3", label: "Rent", iconKey: "building", color: "#8B5CF6", amount: 0 },
  { id: "e4", label: "Salaries", iconKey: "users", color: "#10B981", amount: 0 },
  { id: "e5", label: "Stationery", iconKey: "pencil", color: "#EC4899", amount: 0 },
];
