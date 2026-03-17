'use client';

import { t, useLocale } from '@/lib/i18n';
import { TransactionTable } from '@/features/transactions/TransactionTable';
import { LoadMoreButton } from './LoadMoreButton';
import type { Transaction } from '@/lib/types';

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
}: AllTransactionsViewProps) {
  const locale = useLocale();
  const loadedCount = transactions.length;

  return (
    <div>
      {/* Count label */}
      {total > 0 && (
        <p className="text-muted-foreground mb-3 text-sm">
          {t(locale, 'showing')} {loadedCount} {t(locale, 'of')} {total}{' '}
          {locale === 'id' ? 'transaksi' : 'transactions'}
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
  );
}
