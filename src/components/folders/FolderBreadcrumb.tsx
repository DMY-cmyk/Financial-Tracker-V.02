'use client';

import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { t, useLocale } from '@/lib/i18n';
import { MONTH_NAMES, MONTH_NAMES_ID } from '@/lib/constants';
import { useStore } from '@/store';
import type { DashboardView } from '@/lib/types';

export function FolderBreadcrumb() {
  const locale = useLocale();
  const dashboardView = useStore((s) => s.ui.dashboardView);
  const selectedYear = useStore((s) => s.ui.selectedYear);
  const selectedMonth = useStore((s) => s.ui.selectedMonth);
  const setDashboardView = useStore((s) => s.setDashboardView);

  const names = locale === 'id' ? MONTH_NAMES_ID : MONTH_NAMES;

  const navigateTo = (view: DashboardView) => {
    setDashboardView(view);
    window.history.pushState({ dashboardView: view, year: selectedYear, month: selectedMonth }, '');
  };

  const segments: { label: string; view: DashboardView; isCurrent: boolean }[] = [
    {
      label: t(locale, 'dashboard'),
      view: 'years',
      isCurrent: dashboardView === 'years',
    },
  ];

  if (dashboardView === 'months' || dashboardView === 'dashboard') {
    segments.push({
      label: String(selectedYear),
      view: 'months',
      isCurrent: dashboardView === 'months',
    });
  }

  if (dashboardView === 'dashboard') {
    segments.push({
      label: names[selectedMonth],
      view: 'dashboard',
      isCurrent: true,
    });
  }

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm">
      {segments.map((seg, i) => (
        <motion.span
          key={seg.view + seg.label}
          initial={{ opacity: 0, x: -4 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2, delay: i * 0.05 }}
          className="flex items-center gap-1"
        >
          {i > 0 && <ChevronRight className="text-muted-foreground/50 h-3.5 w-3.5" />}
          {seg.isCurrent ? (
            <span className="text-foreground font-medium">{seg.label}</span>
          ) : (
            <button
              onClick={() => navigateTo(seg.view)}
              className={cn('text-muted-foreground hover:text-foreground transition-colors')}
            >
              {seg.label}
            </button>
          )}
        </motion.span>
      ))}
    </nav>
  );
}
