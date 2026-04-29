'use client';

import { useState, ComponentType } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  ArrowLeftRight,
  Plus,
  PiggyBank,
  Settings,
  TrendingUp,
  TrendingDown,
  Camera,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { t, useLocale } from '@/lib/i18n';

type LabelKey = 'home' | 'transactions' | 'navAdd' | 'budgetPage' | 'settings';

type Slot =
  | {
      key: string;
      href: string;
      icon: ComponentType<{ className?: string }>;
      labelKey: Exclude<LabelKey, 'navAdd'>;
    }
  | {
      key: 'add';
      fab: true;
      icon: ComponentType<{ className?: string }>;
      labelKey: 'navAdd';
    };

const SLOTS: ReadonlyArray<Slot> = [
  { key: 'home', href: '/', icon: Home, labelKey: 'home' },
  {
    key: 'tx',
    href: '/transactions',
    icon: ArrowLeftRight,
    labelKey: 'transactions',
  },
  { key: 'add', fab: true, icon: Plus, labelKey: 'navAdd' },
  { key: 'budget', href: '/budget', icon: PiggyBank, labelKey: 'budgetPage' },
  { key: 'settings', href: '/settings', icon: Settings, labelKey: 'settings' },
];

export function BottomNavFab() {
  const pathname = usePathname();
  const locale = useLocale();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    if (href === '/transactions')
      return (
        pathname === '/transactions' || pathname.startsWith('/transactions/')
      );
    return pathname === href;
  };

  return (
    <>
      <nav
        aria-label={locale === 'id' ? 'Navigasi bawah' : 'Bottom navigation'}
        className="border-border bg-card/95 fixed right-0 bottom-0 left-0 z-50 border-t backdrop-blur-md lg:hidden"
      >
        <div className="grid grid-cols-5 items-end px-2 pt-1 pb-2">
          {SLOTS.map((slot) => {
            if ('fab' in slot) {
              const FabIcon = slot.icon;
              return (
                <div key={slot.key} className="flex flex-col items-center">
                  <button
                    type="button"
                    data-slot="fab"
                    aria-label={t(locale, slot.labelKey)}
                    onClick={() => setOpen(true)}
                    className="bg-brand-mint text-brand-mint-foreground ring-card inline-flex h-14 w-14 -translate-y-3 items-center justify-center rounded-full shadow-lg ring-4"
                  >
                    <FabIcon className="h-6 w-6" />
                  </button>
                  <span className="text-muted-foreground -mt-1 text-[11px]">
                    {t(locale, slot.labelKey)}
                  </span>
                </div>
              );
            }
            const Icon = slot.icon;
            const active = isActive(slot.href);
            return (
              <Link
                key={slot.key}
                href={slot.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex flex-col items-center gap-1 px-2 py-1 text-xs transition-colors',
                  active ? 'text-brand-mint-strong' : 'text-muted-foreground',
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{t(locale, slot.labelKey)}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-8">
          <SheetHeader className="pb-2">
            <SheetTitle>{t(locale, 'navAdd')}</SheetTitle>
          </SheetHeader>
          <div className="space-y-2">
            <Link
              href="/transactions/new?type=income"
              onClick={() => setOpen(false)}
              className="bg-secondary hover:bg-muted flex items-center gap-3 rounded-xl px-4 py-3"
            >
              <TrendingUp className="h-5 w-5" />{' '}
              <span>{t(locale, 'fabAddIncome')}</span>
            </Link>
            <Link
              href="/transactions/new?type=expense"
              onClick={() => setOpen(false)}
              className="bg-secondary hover:bg-muted flex items-center gap-3 rounded-xl px-4 py-3"
            >
              <TrendingDown className="h-5 w-5" />{' '}
              <span>{t(locale, 'fabAddExpense')}</span>
            </Link>
            <Link
              href="/upload"
              onClick={() => setOpen(false)}
              className="bg-secondary hover:bg-muted flex items-center gap-3 rounded-xl px-4 py-3"
            >
              <Camera className="h-5 w-5" />{' '}
              <span>{t(locale, 'fabScanReceipt')}</span>
            </Link>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
