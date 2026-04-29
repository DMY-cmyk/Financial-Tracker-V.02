'use client';

import { useState, useEffect } from 'react';
import { t, useLocale } from '@/lib/i18n';
import { formatCurrencyShort } from '@/lib/formatters';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { motion } from 'framer-motion';

interface CashFlowChartProps {
  data: { date: string; income: number; expense: number }[];
}

export function CashFlowChart({ data }: CashFlowChartProps) {
  const locale = useLocale();
  const [revealed, setRevealed] = useState(false);

  const filtered = data.filter((d) => d.income > 0 || d.expense > 0);

  useEffect(() => {
    if (filtered.length > 0) {
      const timer = setTimeout(() => setRevealed(true), 200);
      return () => clearTimeout(timer);
    }
  }, [filtered.length]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="border-border bg-card shadow-card hover:shadow-card-hover rounded-2xl border p-6 transition-shadow duration-300"
    >
      <h3 className="mb-4 text-sm font-semibold tracking-tight">{t(locale, 'cashFlow')}</h3>
      <div className="h-56">
        {filtered.length === 0 ? (
          <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
            {t(locale, 'noData')}
          </div>
        ) : (
          <div
            className="h-full transition-[clip-path] duration-700 ease-out"
            style={{
              clipPath: revealed ? 'inset(0 0% 0 0)' : 'inset(0 100% 0 0)',
            }}
          >
            <div role="img" aria-label={t(locale, 'cashFlow')} className="h-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={filtered} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        style={{ stopColor: 'var(--chart-income)', stopOpacity: 0.2 }}
                      />
                      <stop
                        offset="100%"
                        style={{ stopColor: 'var(--chart-income)', stopOpacity: 0 }}
                      />
                    </linearGradient>
                    <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        style={{ stopColor: 'var(--chart-expense)', stopOpacity: 0.2 }}
                      />
                      <stop
                        offset="100%"
                        style={{ stopColor: 'var(--chart-expense)', stopOpacity: 0 }}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="date"
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
                      boxShadow: 'var(--elevated-shadow)',
                    }}
                    itemStyle={{ fontFamily: 'var(--font-mono)' }}
                    formatter={(value, name) => [
                      formatCurrencyShort(Number(value)),
                      t(locale, String(name) === 'income' ? 'income' : 'expense'),
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="income"
                    stroke="var(--chart-income)"
                    strokeWidth={2}
                    fill="url(#incomeGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="expense"
                    stroke="var(--chart-expense)"
                    strokeWidth={2}
                    fill="url(#expenseGrad)"
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value: string) => t(locale, value as Parameters<typeof t>[1])}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
