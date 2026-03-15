'use client';

import { motion } from 'framer-motion';
import { staggerGrid } from '@/lib/motion';
import { t, useLocale } from '@/lib/i18n';
import { FeatureCard } from './FeatureCard';
import {
  LayoutDashboard,
  Receipt,
  Target,
  CalendarCheck,
  Repeat,
  PiggyBank,
  BarChart3,
  Upload,
  Download,
  Settings,
} from 'lucide-react';

const features = [
  {
    href: '/',
    key: 'dashboard' as const,
    descKey: 'viewDashboard' as const,
    icon: LayoutDashboard,
  },
  {
    href: '/transactions',
    key: 'transactions' as const,
    descKey: 'manageTransactions' as const,
    icon: Receipt,
  },
  { href: '/budget', key: 'budgetPage' as const, descKey: 'manageBudget' as const, icon: Target },
  { href: '/bills', key: 'bills' as const, descKey: 'manageBills' as const, icon: CalendarCheck },
  {
    href: '/recurring',
    key: 'recurringTransactions' as const,
    descKey: 'manageRecurring' as const,
    icon: Repeat,
  },
  {
    href: '/savings',
    key: 'savingsPage' as const,
    descKey: 'manageSavings' as const,
    icon: PiggyBank,
  },
  { href: '/reports', key: 'reports' as const, descKey: 'viewReports' as const, icon: BarChart3 },
  { href: '/upload', key: 'upload' as const, descKey: 'uploadReceipts' as const, icon: Upload },
  { href: '/export', key: 'exportData' as const, descKey: 'exportData' as const, icon: Download },
  { href: '/settings', key: 'settings' as const, descKey: 'appSettings' as const, icon: Settings },
] as const;

export function FeatureGrid() {
  const locale = useLocale();

  return (
    <motion.div
      variants={staggerGrid}
      initial="hidden"
      animate="show"
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
    >
      {features.map(({ href, key, descKey, icon }) => (
        <FeatureCard
          key={href}
          href={href}
          icon={icon}
          title={t(locale, key)}
          description={t(locale, descKey)}
        />
      ))}
    </motion.div>
  );
}
