import type { LucideIcon } from 'lucide-react';
import {
  Home,
  LayoutDashboard,
  Receipt,
  Repeat,
  Target,
  CalendarCheck,
  PiggyBank,
  BarChart3,
  Upload,
  Download,
} from 'lucide-react';

export interface NavItem {
  href: string;
  labelKey: string;
  icon: LucideIcon;
}

export interface NavGroup {
  id: string;
  labelKey?: string; // omit for unlabeled groups
  defaultCollapsed?: boolean; // defaults to false
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'overview',
    // no labelKey — no header, not collapsible
    items: [
      { href: '/home', labelKey: 'home', icon: Home },
      { href: '/', labelKey: 'dashboard', icon: LayoutDashboard },
    ],
  },
  {
    id: 'finance',
    labelKey: 'groupFinance',
    defaultCollapsed: false,
    items: [
      { href: '/transactions', labelKey: 'transactions', icon: Receipt },
      { href: '/recurring', labelKey: 'recurringTransactions', icon: Repeat },
      { href: '/budget', labelKey: 'budgetPage', icon: Target },
      { href: '/bills', labelKey: 'bills', icon: CalendarCheck },
      { href: '/savings', labelKey: 'savingsPage', icon: PiggyBank },
    ],
  },
  {
    id: 'tools',
    labelKey: 'groupTools',
    defaultCollapsed: false,
    items: [
      { href: '/reports', labelKey: 'reports', icon: BarChart3 },
      { href: '/upload', labelKey: 'upload', icon: Upload },
      { href: '/export', labelKey: 'export', icon: Download },
    ],
  },
];
