'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { fadeInUp } from '@/lib/motion';
import { t } from '@/lib/i18n';
import type { CategoryComparisonItem } from '@/lib/api/contracts';

interface CategoryComparisonChartProps {
  data: CategoryComparisonItem[];
  locale: 'en' | 'id';
}

interface TooltipPayloadItem {
  value: number;
  dataKey: string;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-700 dark:bg-slate-800">
      <p className="mb-1.5 text-xs font-semibold">{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2 text-xs">
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">
            {entry.dataKey === 'thisMonth' ? 'This Month' : 'Last Month'}:
          </span>
          <span className="font-mono font-medium">{formatCurrency(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

function ChangeBadge({ changePct }: { changePct: number | null }) {
  if (changePct === null) return null;

  // For expenses: increase is bad (red), decrease is good (green)
  const isIncrease = changePct > 0;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium',
        isIncrease
          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
      )}
    >
      {isIncrease ? '+' : ''}
      {Math.round(changePct)}%
    </span>
  );
}

export function CategoryComparisonChart({ data, locale }: CategoryComparisonChartProps) {
  if (data.length === 0) {
    return (
      <motion.div
        {...fadeInUp}
        className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900"
      >
        <h3 className="mb-1 text-sm font-semibold">{t(locale, 'categoryComparison')}</h3>
        <p className="text-muted-foreground mb-4 text-xs">{t(locale, 'vsLastMonth')}</p>
        <div className="text-muted-foreground flex h-40 items-center justify-center text-sm">
          {t(locale, 'noExpensesThisMonth')}
        </div>
      </motion.div>
    );
  }

  const chartData = data.map((item) => ({
    category: item.category,
    thisMonth: item.thisMonth,
    lastMonth: item.lastMonth,
    changePct: item.changePct,
  }));

  const barHeight = 36;
  const chartHeight = Math.max(200, chartData.length * barHeight + 60);

  return (
    <motion.div
      {...fadeInUp}
      className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900"
    >
      <div className="mb-4 flex items-baseline justify-between">
        <div>
          <h3 className="text-sm font-semibold">{t(locale, 'categoryComparison')}</h3>
          <p className="text-muted-foreground text-xs">{t(locale, 'vsLastMonth')}</p>
        </div>
      </div>

      {/* Chart */}
      <div style={{ height: chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 8 }}>
            <XAxis
              type="number"
              tickFormatter={(v: number) => {
                if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)}M`;
                if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
                return String(v);
              }}
              tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              dataKey="category"
              type="category"
              width={90}
              tick={{ fontSize: 11, fill: 'var(--foreground)' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
            <Legend
              wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
              formatter={(value: string) => (value === 'thisMonth' ? 'This Month' : 'Last Month')}
            />
            <Bar dataKey="thisMonth" fill="#3B82F6" radius={[0, 4, 4, 0]} barSize={10} />
            <Bar dataKey="lastMonth" fill="#475569" radius={[0, 4, 4, 0]} barSize={10} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Change badges */}
      <div className="mt-4 flex flex-wrap gap-2">
        {data.map((item) => (
          <div key={item.categoryId} className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-muted-foreground text-[11px]">{item.category}</span>
            <ChangeBadge changePct={item.changePct} />
          </div>
        ))}
      </div>
    </motion.div>
  );
}
