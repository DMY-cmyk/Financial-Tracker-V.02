'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { t, useLocale } from '@/lib/i18n';
import { ScanLine, FileSpreadsheet } from 'lucide-react';

interface BulkImportTabsProps {
  activeTab: 'receipt' | 'bulk';
}

const tabs = [
  { id: 'receipt' as const, icon: ScanLine, labelKey: 'receiptScan' as const, href: '/upload' },
  {
    id: 'bulk' as const,
    icon: FileSpreadsheet,
    labelKey: 'bulkImport' as const,
    href: '/upload/bulk',
  },
];

export function BulkImportTabs({ activeTab }: BulkImportTabsProps) {
  const locale = useLocale();

  return (
    <div className="border-border bg-card rounded-2xl border p-1.5">
      <div className="flex gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all',
                isActive
                  ? 'bg-primary/10 text-primary border-primary border-b-2'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">{t(locale, tab.labelKey)}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
