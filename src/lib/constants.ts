import { Category, PaymentMethod } from './types';

export const CATEGORY_COLORS: Record<string, string> = {
  Food: '#F59E0B',
  Transport: '#3B82F6',
  Utilities: '#8B5CF6',
  Entertainment: '#EC4899',
  Salary: '#10B981',
  Freelance: '#06B6D4',
  Other: '#6B7280',
};

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

export const DEFAULT_EXPENSE_CATEGORIES: Omit<Category, 'id'>[] = [
  { name: 'Food', type: 'expense', color: '#F59E0B', icon: 'utensils', budget: 1500000 },
  { name: 'Transport', type: 'expense', color: '#3B82F6', icon: 'car', budget: 800000 },
  { name: 'Utilities', type: 'expense', color: '#8B5CF6', icon: 'zap', budget: 1000000 },
  { name: 'Entertainment', type: 'expense', color: '#EC4899', icon: 'film', budget: 500000 },
];

export const DEFAULT_INCOME_CATEGORIES: Omit<Category, 'id'>[] = [
  { name: 'Salary', type: 'income', color: '#10B981', icon: 'briefcase', budget: 0 },
  { name: 'Freelance', type: 'income', color: '#06B6D4', icon: 'laptop', budget: 0 },
];

export const DEFAULT_PAYMENT_METHODS: Omit<PaymentMethod, 'id'>[] = [
  { name: 'Bank BCA', icon: 'building', type: 'bank' },
  { name: 'Cash', icon: 'banknote', type: 'cash' },
  { name: 'GoPay', icon: 'smartphone', type: 'ewallet' },
  { name: 'OVO', icon: 'smartphone', type: 'ewallet' },
];

export const PALETTE_COLORS = [
  '#F59E0B', '#3B82F6', '#8B5CF6', '#EC4899',
  '#10B981', '#06B6D4', '#EF4444', '#F97316',
  '#84CC16', '#14B8A6', '#6366F1', '#A855F7',
];

export const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: 'layout-dashboard' },
  { href: '/transactions', label: 'Transactions', icon: 'receipt' },
  { href: '/upload', label: 'Upload', icon: 'upload' },
  { href: '/export', label: 'Export', icon: 'download' },
  { href: '/settings', label: 'Settings', icon: 'settings' },
] as const;
