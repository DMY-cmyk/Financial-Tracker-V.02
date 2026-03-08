'use client';

import { useCategoryTotals } from '@/store/selectors';
import { useStore } from '@/store';
import { t, useLocale } from '@/lib/i18n';
import { formatCurrency } from '@/lib/formatters';
import { CATEGORY_COLORS } from '@/lib/constants';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { motion } from 'framer-motion';

export function CategoryBreakdown() {
  const totals = useCategoryTotals('expense');
  const categories = useStore((s) => s.categories);
  const locale = useLocale();

  const data = Object.entries(totals)
    .map(([name, value]) => {
      const cat = categories.find((c) => c.name === name);
      return {
        name,
        value,
        color: cat?.color || CATEGORY_COLORS[name] || '#6B7280',
      };
    })
    .sort((a, b) => b.value - a.value);

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
      className="border-border bg-card rounded-2xl border p-6"
    >
      <h3 className="mb-4 text-sm font-semibold">{t(locale, 'categoryBreakdown')}</h3>

      {data.length === 0 ? (
        <div className="text-muted-foreground flex h-40 items-center justify-center text-sm">
          {t(locale, 'noData')}
        </div>
      ) : (
        <>
          <div className="mx-auto h-40 w-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {data.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value))}
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid var(--border)',
                    background: 'var(--card)',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 space-y-2">
            {data.map((d) => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-muted-foreground">{d.name}</span>
                </div>
                <span className="font-mono font-medium">
                  {total > 0 ? Math.round((d.value / total) * 100) : 0}%
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </motion.div>
  );
}
