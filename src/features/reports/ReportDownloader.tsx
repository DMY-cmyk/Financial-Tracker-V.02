'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { t, useLocale } from '@/lib/i18n';
import { MONTH_NAMES } from '@/lib/constants';
import { useReportData } from './useReportData';

export function ReportDownloader() {
  const locale = useLocale();
  const { availableYears, isLoadingYears, isGenerating, downloadMonthly, downloadAnnual } =
    useReportData();

  const currentYear = new Date().getFullYear();
  const [reportType, setReportType] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const years = availableYears.length > 0 ? availableYears : [currentYear];

  const handleDownload = async () => {
    if (reportType === 'monthly') {
      await downloadMonthly(selectedMonth, selectedYear, locale);
    } else {
      await downloadAnnual(selectedYear, locale);
    }
  };

  return (
    <div className="bg-card border-border rounded-2xl border p-5 shadow-sm">
      <h3 className="mb-4 font-semibold">{t(locale, 'downloadReport')}</h3>

      {/* Type toggle */}
      <div className="bg-muted mb-4 flex w-fit rounded-lg p-1">
        <button
          onClick={() => setReportType('monthly')}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all ${
            reportType === 'monthly'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {t(locale, 'reportTypeMonthly')}
        </button>
        <button
          onClick={() => setReportType('yearly')}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all ${
            reportType === 'yearly'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {t(locale, 'reportTypeYearly')}
        </button>
      </div>

      {/* Selectors */}
      <div className="mb-4 flex flex-wrap gap-3">
        {reportType === 'monthly' && (
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="border-border bg-background rounded-lg border px-3 py-2 text-sm"
          >
            {MONTH_NAMES.map((name, i) => (
              <option key={i} value={i}>
                {name}
              </option>
            ))}
          </select>
        )}
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          disabled={isLoadingYears}
          className="border-border bg-background rounded-lg border px-3 py-2 text-sm"
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      {/* Download button */}
      <Button onClick={handleDownload} disabled={isGenerating} className="gap-2">
        {isGenerating ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {t(locale, 'generatingReport')}
          </>
        ) : (
          <>
            <Download className="h-4 w-4" />
            {t(locale, 'downloadReport')}
          </>
        )}
      </Button>
    </div>
  );
}
