'use client';

import { format, parseISO } from 'date-fns';
import { t, useLocale } from '@/lib/i18n';
import { TransactionTable } from '@/features/transactions/TransactionTable';
import { TransactionRowMobile } from '@/components/transactions/TransactionRowMobile';
import { LoadMoreButton } from './LoadMoreButton';
import type { Transaction, Category } from '@/lib/types';

interface AllTransactionsViewProps {
  transactions: Transaction[];
  total: number;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  isAllSelected: boolean;
  onEdit: (tx: Transaction) => void;
  onDuplicate: (tx: Transaction) => void;
  onDelete: (id: string) => void;
  categories?: Category[];
  onTap?: (tx: Transaction) => void;
}

function groupByMonth(txs: Transaction[]): Record<string, Transaction[]> {
  const out: Record<string, Transaction[]> = {};
  for (const tx of txs) {
    const m = format(parseISO(tx.date), 'MMMM yyyy');
    (out[m] ??= []).push(tx);
  }
  return out;
}

export function AllTransactionsView({
  transactions,
  total,
  hasMore,
  isLoadingMore,
  onLoadMore,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  isAllSelected,
  onEdit,
  onDuplicate,
  onDelete,
  categories,
  onTap,
}: AllTransactionsViewProps) {
  const locale = useLocale();
  const loadedCount = transactions.length;

  return (
    <div>
      {/* Mobile rendering — < 768px */}
      <div className="space-y-4 md:hidden">
        {transactions.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            {t(locale, 'noTransactionsYet')}
          </p>
        ) : (
          Object.entries(groupByMonth(transactions)).map(([label, items]) => (
            <div key={label}>
              <h3 className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
                {label}
              </h3>
              <div className="space-y-1">
                {items.map((tx) => {
                  const cat: Category = (categories ?? []).find((c) => c.id === tx.categoryId) ?? {
                    id: tx.categoryId,
                    name: tx.category,
                    type: 'expense' as const,
                    color: '#888',
                    icon: 'tag',
                    budget: 0,
                  };
                  return (
                    <TransactionRowMobile
                      key={tx.id}
                      transaction={tx}
                      category={cat}
                      onTap={() => (onTap ?? onEdit)(tx)}
                    />
                  );
                })}
              </div>
            </div>
          ))
        )}
        <LoadMoreButton
          hasMore={hasMore}
          isLoadingMore={isLoadingMore}
          total={total}
          loadedCount={loadedCount}
          onLoadMore={onLoadMore}
        />
      </div>

      {/* Desktop rendering — ≥ 768px */}
      <div className="hidden md:block">
        {/* Count label */}
        {total > 0 && (
          <p className="text-muted-foreground mb-3 text-sm">
            {t(locale, 'showing')} {loadedCount} {t(locale, 'of')} {total}{' '}
            {t(locale, 'folderTransactions')}
          </p>
        )}

        <TransactionTable
          transactions={transactions}
          selectedIds={selectedIds}
          onToggleSelect={onToggleSelect}
          onSelectAll={onSelectAll}
          isAllSelected={isAllSelected}
          onEdit={onEdit}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
        />

        <LoadMoreButton
          hasMore={hasMore}
          isLoadingMore={isLoadingMore}
          total={total}
          loadedCount={loadedCount}
          onLoadMore={onLoadMore}
        />
      </div>
    </div>
  );
}
