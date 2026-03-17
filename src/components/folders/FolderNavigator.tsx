'use client';

import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store';
import { folderTransition } from '@/lib/motion';
import { useFolderData } from '@/hooks/useFolderData';
import { FolderBreadcrumb } from './FolderBreadcrumb';
import { YearGrid } from './YearGrid';
import { MonthGrid } from './MonthGrid';
import { DashboardContent } from '@/features/dashboard/DashboardContent';
import { PageSkeleton } from '@/components/shared/Skeletons';
import type { DashboardView } from '@/lib/types';

export function FolderNavigator() {
  const dashboardView = useStore((s) => s.ui.dashboardView);
  const direction = useStore((s) => s.ui.dashboardViewDirection);
  const selectedYear = useStore((s) => s.ui.selectedYear);
  const setDashboardView = useStore((s) => s.setDashboardView);
  const setYear = useStore((s) => s.setYear);
  const setMonth = useStore((s) => s.setMonth);
  const { years, months, isYearsLoading, isMonthsLoading } = useFolderData();

  // Handle browser back/forward
  const handlePopState = useCallback(
    (e: PopStateEvent) => {
      const state = e.state as {
        dashboardView?: DashboardView;
        year?: number;
        month?: number;
      } | null;
      if (state?.dashboardView) {
        setDashboardView(state.dashboardView);
        if (state.year !== undefined) setYear(state.year);
        if (state.month !== undefined) setMonth(state.month);
      } else {
        setDashboardView('years');
      }
    },
    [setDashboardView, setYear, setMonth]
  );

  useEffect(() => {
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [handlePopState]);

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <FolderBreadcrumb />

      <AnimatePresence mode="wait" custom={direction}>
        {dashboardView === 'years' && (
          <motion.div
            key="years"
            custom={direction}
            variants={folderTransition}
            initial="enter"
            animate="center"
            exit="exit"
          >
            {isYearsLoading ? (
              <PageSkeleton />
            ) : (
              <YearGrid years={years} isLoading={isYearsLoading} />
            )}
          </motion.div>
        )}

        {dashboardView === 'months' && (
          <motion.div
            key="months"
            custom={direction}
            variants={folderTransition}
            initial="enter"
            animate="center"
            exit="exit"
          >
            {isMonthsLoading ? (
              <PageSkeleton />
            ) : (
              <MonthGrid months={months} year={selectedYear} isLoading={isMonthsLoading} />
            )}
          </motion.div>
        )}

        {dashboardView === 'dashboard' && (
          <motion.div
            key="dashboard"
            custom={direction}
            variants={folderTransition}
            initial="enter"
            animate="center"
            exit="exit"
          >
            <DashboardContent />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
