'use client';

import { t, useLocale } from '@/lib/i18n';
import { PageHeader } from '@/components/layout/PageHeader';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useNetWorth } from '@/features/net-worth/useNetWorth';
import { NetWorthSummaryCard } from '@/features/net-worth/NetWorthSummaryCard';
import { MonthOverMonthCard } from '@/features/net-worth/MonthOverMonthCard';
import { AssetsList } from '@/features/net-worth/AssetsList';
import { LiabilitiesList } from '@/features/net-worth/LiabilitiesList';
import { LiabilityDialog } from '@/features/net-worth/LiabilityDialog';
import { NetWorthTrendChart } from '@/features/net-worth/NetWorthTrendChart';
import { SnapshotButton } from '@/features/net-worth/SnapshotButton';

export default function NetWorthPage() {
  const locale = useLocale();
  const { current, history, liabilities, isLoading, error, form, deleteConfirm, recordSnapshot, isRecording } =
    useNetWorth();

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title={t(locale, 'netWorthPage')} />
        <p className="text-destructive py-8 text-center text-sm">{t(locale, 'error')}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 sm:space-y-6">
      <PageHeader title={t(locale, 'netWorthPage')} />

      {/* Row 1: Summary + MoM */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <NetWorthSummaryCard current={current} isLoading={isLoading} />
        <MonthOverMonthCard history={history} isLoading={isLoading} />
      </div>

      {/* Row 2: Assets + Liabilities */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <AssetsList current={current} />
        <LiabilitiesList
          liabilities={liabilities}
          onAdd={form.openAdd}
          onEdit={form.openEdit}
          onDelete={deleteConfirm.setId}
        />
      </div>

      {/* Row 3: Trend Chart */}
      <NetWorthTrendChart history={history} />

      {/* Row 4: Snapshot Button */}
      <SnapshotButton history={history} isRecording={isRecording} onRecord={recordSnapshot} />

      {/* Liability add/edit dialog */}
      <LiabilityDialog
        open={form.open}
        editingLiability={form.editingLiability}
        name={form.name}
        setName={form.setName}
        amount={form.amount}
        setAmount={form.setAmount}
        category={form.category}
        setCategory={form.setCategory}
        errors={form.errors}
        close={form.close}
        submit={form.submit}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteConfirm.id}
        onOpenChange={(open) => !open && deleteConfirm.setId(null)}
        title={t(locale, 'deleteLiability')}
        description={t(locale, 'deleteConfirmDescription')}
        confirmLabel={t(locale, 'delete')}
        cancelLabel={t(locale, 'cancel')}
        onConfirm={deleteConfirm.confirm}
      />
    </div>
  );
}
