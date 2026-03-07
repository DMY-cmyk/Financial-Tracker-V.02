'use client';

import { useMonthlyBills } from '@/store/selectors';
import { useStore } from '@/store';
import { t, useLocale } from '@/lib/i18n';
import { formatCurrency } from '@/lib/formatters';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export function BillsChecklist() {
  const bills = useMonthlyBills();
  const toggleBillPaid = useStore(s => s.toggleBillPaid);
  const locale = useLocale();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="rounded-2xl border border-border bg-card p-6"
    >
      <h3 className="mb-4 text-sm font-semibold">{t(locale, 'billsChecklist')}</h3>

      {bills.length === 0 ? (
        <div className="flex h-20 items-center justify-center text-sm text-muted-foreground">
          {t(locale, 'noData')}
        </div>
      ) : (
        <div className="space-y-2.5">
          {bills.map((bill) => (
            <div
              key={bill.id}
              className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted/50"
            >
              <Checkbox
                checked={bill.isPaid}
                onCheckedChange={() => toggleBillPaid(bill.id)}
              />
              <div className="flex-1 min-w-0">
                <p className={cn(
                  'text-sm font-medium truncate',
                  bill.isPaid && 'line-through text-muted-foreground'
                )}>
                  {bill.name}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {t(locale, 'dueDate')}: {bill.dueDate}
                </p>
              </div>
              <span className={cn(
                'font-mono text-xs font-medium',
                bill.isPaid ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'
              )}>
                {formatCurrency(bill.amount)}
              </span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
