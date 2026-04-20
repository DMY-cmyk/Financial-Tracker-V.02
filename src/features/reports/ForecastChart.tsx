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
  ReferenceLine,
  Legend,
} from 'recharts';
import { formatCurrencyShort } from '@/lib/formatters';
import { t, useLocale } from '@/lib/i18n';
import type { MonthlyTrend } from '@/features/reports/useReportsData';
import type { ForecastResponse } from '@/lib/api/contracts';

interface ForecastChartProps {
  trends: MonthlyTrend[];
  forecast: ForecastResponse | undefined;
}

interface ChartPoint {
  monthKey: string;
  label: string;
  income?: number;
  expense?: number;
  projectedIncome?: number;
  projectedExpense?: number;
}

function monthKeyToLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function buildMonthKey(month: number, year: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

export function ForecastChart({ trends, forecast }: ForecastChartProps) {
  const locale = useLocale();
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (trends.length > 0 || forecast) {
      const timer = setTimeout(() => setRevealed(true), 200);
      return () => clearTimeout(timer);
    }
  }, [trends.length, forecast]);

  if (trends.length === 0 && !forecast) {
    return (
      <div className="text-muted-foreground flex h-64 items-center justify-center text-sm">
        {t(locale, 'noData')}
      </div>
    );
  }

  const pointsMap = new Map<string, ChartPoint>();

  // Historical data (solid lines)
  for (const d of trends) {
    pointsMap.set(d.monthKey, {
      monthKey: d.monthKey,
      label: monthKeyToLabel(d.monthKey),
      income: d.income,
      expense: d.expense,
    });
  }

  if (forecast) {
    const currentKey = buildMonthKey(forecast.currentMonth.month, forecast.currentMonth.year);
    const existing = pointsMap.get(currentKey);
    const bridgeIncome = forecast.currentMonth.actualIncome + forecast.currentMonth.projectedIncome;
    const bridgeExpense =
      forecast.currentMonth.actualExpense + forecast.currentMonth.projectedExpense;
    // Bridge point: current month appears in both series so lines connect
    pointsMap.set(currentKey, {
      monthKey: currentKey,
      label: existing?.label ?? monthKeyToLabel(currentKey),
      income: existing?.income ?? bridgeIncome,
      expense: existing?.expense ?? bridgeExpense,
      projectedIncome: bridgeIncome,
      projectedExpense: bridgeExpense,
    });

    // Future months (dashed lines only)
    for (const f of forecast.forecast) {
      const key = buildMonthKey(f.month, f.year);
      pointsMap.set(key, {
        monthKey: key,
        label: monthKeyToLabel(key),
        projectedIncome: f.projectedIncome,
        projectedExpense: f.projectedExpense,
      });
    }
  }

  const chartData = Array.from(pointsMap.values()).sort((a, b) =>
    a.monthKey.localeCompare(b.monthKey)
  );

  const currentLabel = forecast
    ? monthKeyToLabel(buildMonthKey(forecast.currentMonth.month, forecast.currentMonth.year))
    : '';

  return (
    <div
      className="h-72 transition-[clip-path] duration-700 ease-out"
      style={{ clipPath: revealed ? 'inset(0 0% 0 0)' : 'inset(0 100% 0 0)' }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="fcIncomeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" style={{ stopColor: 'var(--chart-income)', stopOpacity: 0.2 }} />
              <stop offset="100%" style={{ stopColor: 'var(--chart-income)', stopOpacity: 0 }} />
            </linearGradient>
            <linearGradient id="fcExpenseGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" style={{ stopColor: 'var(--chart-expense)', stopOpacity: 0.2 }} />
              <stop offset="100%" style={{ stopColor: 'var(--chart-expense)', stopOpacity: 0 }} />
            </linearGradient>
            <linearGradient id="fcProjIncomeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" style={{ stopColor: 'var(--chart-income)', stopOpacity: 0.1 }} />
              <stop offset="100%" style={{ stopColor: 'var(--chart-income)', stopOpacity: 0 }} />
            </linearGradient>
            <linearGradient id="fcProjExpenseGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" style={{ stopColor: 'var(--chart-expense)', stopOpacity: 0.1 }} />
              <stop offset="100%" style={{ stopColor: 'var(--chart-expense)', stopOpacity: 0 }} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10 }}
            className="fill-muted-foreground"
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 10 }}
            className="fill-muted-foreground"
            tickFormatter={(v) => formatCurrencyShort(Number(v))}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              borderRadius: '12px',
              border: '1px solid var(--border)',
              background: 'var(--card)',
              fontSize: '11px',
            }}
            formatter={(value, name) => {
              const labels: Record<string, string> = {
                income: t(locale, 'income'),
                expense: t(locale, 'expense'),
                projectedIncome: t(locale, 'projectedIncome'),
                projectedExpense: t(locale, 'projectedExpense'),
              };
              return [formatCurrencyShort(Number(value)), labels[String(name)] ?? String(name)];
            }}
          />
          <Legend
            formatter={(value: string) => {
              const labels: Record<string, string> = {
                income: t(locale, 'income'),
                expense: t(locale, 'expense'),
                projectedIncome: t(locale, 'projectedIncome'),
                projectedExpense: t(locale, 'projectedExpense'),
              };
              return labels[value] ?? value;
            }}
          />
          {/* Actual lines — solid */}
          <Area
            type="monotone"
            dataKey="income"
            stroke="var(--chart-income)"
            strokeWidth={2}
            fill="url(#fcIncomeGrad)"
            connectNulls={false}
            dot={false}
          />
          <Area
            type="monotone"
            dataKey="expense"
            stroke="var(--chart-expense)"
            strokeWidth={2}
            fill="url(#fcExpenseGrad)"
            connectNulls={false}
            dot={false}
          />
          {/* Projected lines — dashed, lower opacity */}
          <Area
            type="monotone"
            dataKey="projectedIncome"
            stroke="var(--chart-income)"
            strokeWidth={2}
            strokeDasharray="5 4"
            strokeOpacity={0.6}
            fill="url(#fcProjIncomeGrad)"
            connectNulls={false}
            dot={false}
          />
          <Area
            type="monotone"
            dataKey="projectedExpense"
            stroke="var(--chart-expense)"
            strokeWidth={2}
            strokeDasharray="5 4"
            strokeOpacity={0.6}
            fill="url(#fcProjExpenseGrad)"
            connectNulls={false}
            dot={false}
          />
          {/* "Today" divider line */}
          {currentLabel && (
            <ReferenceLine
              x={currentLabel}
              stroke="var(--border)"
              strokeDasharray="3 3"
              label={{
                value: t(locale, 'today'),
                position: 'top',
                fontSize: 10,
                fill: 'var(--muted-foreground)',
              }}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
