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
  const toggleBillPaid = useStore((s) => s.toggleBillPaid);
  const locale = useLocale();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="border-border bg-card rounded-2xl border p-6"
    >
      <h3 className="mb-4 text-sm font-semibold">{t(locale, 'billsChecklist')}</h3>

      {bills.length === 0 ? (
        <div className="text-muted-foreground flex h-20 items-center justify-center text-sm">
          {t(locale, 'noData')}
        </div>
      ) : (
        <div className="space-y-2.5">
          {bills.map((bill) => (
            <div
              key={bill.id}
              className="hover:bg-muted/50 flex items-center gap-3 rounded-lg p-2 transition-colors"
            >
              <Checkbox checked={bill.isPaid} onCheckedChange={() => toggleBillPaid(bill.id)} />
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    'truncate text-sm font-medium',
                    bill.isPaid && 'text-muted-foreground line-through'
                  )}
                >
                  {bill.name}
                </p>
                <p className="text-muted-foreground text-[10px]">
                  {t(locale, 'dueDate')}: {bill.dueDate}
                </p>
              </div>
              <span
                className={cn(
                  'font-mono text-xs font-medium',
                  bill.isPaid ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'
                )}
              >
                {formatCurrency(bill.amount)}
              </span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
