'use client';

import { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { formatCurrencyShort } from '@/lib/formatters';
import { t, useLocale } from '@/lib/i18n';
import type { MonthlyTrend } from '@/features/reports/useReportsData';

interface TrendChartProps {
  data: MonthlyTrend[];
}

export function TrendChart({ data }: TrendChartProps) {
  const locale = useLocale();
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (data.length > 0) {
      const timer = setTimeout(() => setRevealed(true), 200);
      return () => clearTimeout(timer);
    }
  }, [data.length]);

  if (data.length === 0) {
    return (
      <div className="text-muted-foreground flex h-64 items-center justify-center text-sm">
        {t(locale, 'noData')}
      </div>
    );
  }

  const chartData = data.map((d) => ({
    month: d.monthKey,
    income: d.income,
    expense: d.expense,
  }));

  return (
    <div
      className="h-64 transition-[clip-path] duration-700 ease-out"
      style={{ clipPath: revealed ? 'inset(0 0% 0 0)' : 'inset(0 100% 0 0)' }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="trendIncomeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" style={{ stopColor: 'var(--chart-income)', stopOpacity: 0.2 }} />
              <stop offset="100%" style={{ stopColor: 'var(--chart-income)', stopOpacity: 0 }} />
            </linearGradient>
            <linearGradient id="trendExpenseGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" style={{ stopColor: 'var(--chart-expense)', stopOpacity: 0.2 }} />
              <stop offset="100%" style={{ stopColor: 'var(--chart-expense)', stopOpacity: 0 }} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11 }}
            className="fill-muted-foreground"
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 11 }}
            className="fill-muted-foreground"
            tickFormatter={(v) => formatCurrencyShort(v)}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              borderRadius: '12px',
              border: '1px solid var(--border)',
              background: 'var(--card)',
              fontSize: '12px',
            }}
            formatter={(value, name) => [
              formatCurrencyShort(Number(value)),
              String(name) === 'income' ? t(locale, 'income') : t(locale, 'expense'),
            ]}
          />
          <Legend
            formatter={(value: string) =>
              value === 'income' ? t(locale, 'income') : t(locale, 'expense')
            }
          />
          <Area
            type="monotone"
            dataKey="income"
            stroke="var(--chart-income)"
            strokeWidth={2}
            fill="url(#trendIncomeGrad)"
          />
          <Area
            type="monotone"
            dataKey="expense"
            stroke="var(--chart-expense)"
            strokeWidth={2}
            fill="url(#trendExpenseGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
