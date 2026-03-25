'use client';

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api/client';
import { useStore } from '@/store';
import { t } from '@/lib/i18n';
import { generateMonthlyReport, generateAnnualReport } from './report-generator';

interface UseReportDataReturn {
  availableYears: number[];
  isLoadingYears: boolean;
  isGenerating: boolean;
  downloadMonthly: (month: number, year: number, locale: 'en' | 'id') => Promise<void>;
  downloadAnnual: (year: number, locale: 'en' | 'id') => Promise<void>;
}

export function useReportData(): UseReportDataReturn {
  const initialized = useStore((s) => s.initialized);
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: folderData, isLoading: isLoadingYears } = useQuery({
    queryKey: ['folder-summary'],
    queryFn: async () => {
      const result = await api.dashboard.folderSummary();
      return result.data?.years ?? [];
    },
    enabled: initialized,
  });

  const availableYears = (folderData ?? []).map((y) => y.year).sort((a, b) => b - a);

  const downloadMonthly = useCallback(async (month: number, year: number, locale: 'en' | 'id') => {
    setIsGenerating(true);
    try {
      const result = await api.reports.monthly(month, year);
      if (result.error || !result.data?.report) {
        toast.error(t(locale, 'reportError'));
        return;
      }
      await generateMonthlyReport(result.data.report);
      toast.success(t(locale, 'reportDownloaded'));
    } catch {
      toast.error(t(locale, 'reportError'));
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const downloadAnnual = useCallback(async (year: number, locale: 'en' | 'id') => {
    setIsGenerating(true);
    try {
      const result = await api.reports.annual(year);
      if (result.error || !result.data) {
        toast.error(t(locale, 'reportError'));
        return;
      }
      await generateAnnualReport(result.data);
      toast.success(t(locale, 'reportDownloaded'));
    } catch {
      toast.error(t(locale, 'reportError'));
    } finally {
      setIsGenerating(false);
    }
  }, []);

  return { availableYears, isLoadingYears, isGenerating, downloadMonthly, downloadAnnual };
}
