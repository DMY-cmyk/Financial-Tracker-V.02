import { Category, PaymentMethod } from './types';

export const CATEGORY_COLORS: Record<string, string> = {
  Food: '#D97706',
  Transport: '#3B82F6',
  Utilities: '#8B5CF6',
  Entertainment: '#EC4899',
  Salary: '#059669',
  Freelance: '#06B6D4',
  Other: '#6B7280',
};

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const MONTH_NAMES_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export const MONTH_NAMES_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

export const DEFAULT_EXPENSE_CATEGORIES: Omit<Category, 'id'>[] = [
  { name: 'Food', type: 'expense', color: '#D97706', icon: 'utensils', budget: 1500000 },
  { name: 'Transport', type: 'expense', color: '#3B82F6', icon: 'car', budget: 800000 },
  { name: 'Utilities', type: 'expense', color: '#8B5CF6', icon: 'zap', budget: 1000000 },
  { name: 'Entertainment', type: 'expense', color: '#EC4899', icon: 'film', budget: 500000 },
];

export const DEFAULT_INCOME_CATEGORIES: Omit<Category, 'id'>[] = [
  { name: 'Salary', type: 'income', color: '#059669', icon: 'briefcase', budget: 0 },
  { name: 'Freelance', type: 'income', color: '#06B6D4', icon: 'laptop', budget: 0 },
];

export const DEFAULT_PAYMENT_METHODS: Omit<PaymentMethod, 'id'>[] = [
  { name: 'Bank BCA', icon: 'building', type: 'bank', beginningBalance: 0 },
  { name: 'Cash', icon: 'banknote', type: 'cash', beginningBalance: 0 },
  { name: 'GoPay', icon: 'smartphone', type: 'ewallet', beginningBalance: 0 },
  { name: 'OVO', icon: 'smartphone', type: 'ewallet', beginningBalance: 0 },
];

export const PALETTE_COLORS = [
  '#D97706',
  '#3B82F6',
  '#8B5CF6',
  '#EC4899',
  '#059669',
  '#06B6D4',
  '#DC2626',
  '#F97316',
  '#84CC16',
  '#14B8A6',
  '#6366F1',
  '#A855F7',
];

export const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: 'layout-dashboard' },
  { href: '/transactions', label: 'Transactions', icon: 'receipt' },
  { href: '/upload', label: 'Upload', icon: 'upload' },
  { href: '/export', label: 'Export', icon: 'download' },
  { href: '/settings', label: 'Settings', icon: 'settings' },
] as const;
