'use client';

import { usePaymentMethodTotals } from '@/store/selectors';
import { t, useLocale } from '@/lib/i18n';
import { formatCurrency } from '@/lib/formatters';
import { motion } from 'framer-motion';

const METHOD_COLORS: Record<string, string> = {
  'Bank BCA': '#3B82F6',
  Cash: '#10B981',
  GoPay: '#06B6D4',
  OVO: '#8B5CF6',
};

export function PaymentMethodsSummary() {
  const totals = usePaymentMethodTotals();
  const locale = useLocale();

  const data = Object.entries(totals)
    .map(([name, value]) => ({ name, value, color: METHOD_COLORS[name] || '#6B7280' }))
    .sort((a, b) => b.value - a.value);

  const max = Math.max(...data.map(d => d.value), 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.25 }}
      className="rounded-2xl border border-border bg-card p-6"
    >
      <h3 className="mb-4 text-sm font-semibold">{t(locale, 'paymentMethods')}</h3>

      {data.length === 0 ? (
        <div className="flex h-20 items-center justify-center text-sm text-muted-foreground">
          {t(locale, 'noData')}
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((d) => (
            <div key={d.name}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-medium">{d.name}</span>
                <span className="font-mono text-muted-foreground">
                  {formatCurrency(d.value)}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${(d.value / max) * 100}%`,
                    backgroundColor: d.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
