'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { t, useLocale } from '@/lib/i18n';
import { useStore } from '@/store';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Home,
  LayoutDashboard,
  Receipt,
  Upload,
  Download,
  Settings,
  Plus,
  Tag,
  CalendarCheck,
  PiggyBank,
  Target,
  Repeat,
  BarChart3,
  Languages,
} from 'lucide-react';

type NavKey =
  | 'home'
  | 'dashboard'
  | 'transactions'
  | 'budgetPage'
  | 'bills'
  | 'recurringTransactions'
  | 'savingsPage'
  | 'reports'
  | 'upload'
  | 'export'
  | 'settings'
  | 'categories';

const NAV_ITEMS: { href: string; key: NavKey; icon: typeof LayoutDashboard }[] = [
  { href: '/home', key: 'home', icon: Home },
  { href: '/', key: 'dashboard', icon: LayoutDashboard },
  { href: '/transactions', key: 'transactions', icon: Receipt },
  { href: '/recurring', key: 'recurringTransactions', icon: Repeat },
  { href: '/budget', key: 'budgetPage', icon: Target },
  { href: '/bills', key: 'bills', icon: CalendarCheck },
  { href: '/savings', key: 'savingsPage', icon: PiggyBank },
  { href: '/reports', key: 'reports', icon: BarChart3 },
  { href: '/upload', key: 'upload', icon: Upload },
  { href: '/export', key: 'export', icon: Download },
  { href: '/settings', key: 'settings', icon: Settings },
  { href: '/settings/categories', key: 'categories', icon: Tag },
];

interface MobileNavProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileNav({ open, onOpenChange }: MobileNavProps) {
  const pathname = usePathname();
  const locale = useLocale();
  const setLocale = useStore((s) => s.setLocale);

  // Auto-close on route change
  useEffect(() => {
    onOpenChange(false);
  }, [pathname, onOpenChange]);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    if (href === '/home') return pathname === '/home';
    return pathname.startsWith(href);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[280px] p-0">
        <div className="bg-brand-mint h-1 w-full" />
        <SheetHeader className="border-border border-b px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-lg shadow-sm">
              <span className="text-primary-foreground text-xs font-bold">FT</span>
            </div>
            <SheetTitle className="text-sm font-semibold">Financial Tracker</SheetTitle>
          </div>
        </SheetHeader>

        {/* Quick Add */}
        <div className="p-3">
          <Link
            href="/transactions/new"
            className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium shadow-sm transition-all hover:shadow-md"
          >
            <Plus className="h-4 w-4 shrink-0" />
            <span>{t(locale, 'newTransaction')}</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
          <p className="text-muted-foreground/60 mb-2 px-3 text-[10px] font-semibold tracking-wider uppercase">
            {t(locale, 'menu')}
          </p>
          {NAV_ITEMS.map(({ href, key, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isActive(href)
                  ? 'bg-primary/10 text-primary shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
              aria-current={isActive(href) ? 'page' : undefined}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              <span>{t(locale, key)}</span>
            </Link>
          ))}
        </nav>

        {/* Language Switcher */}
        <div className="border-border border-t p-3">
          <div className="flex items-center gap-3 rounded-xl px-3 py-2">
            <Languages className="text-muted-foreground/60 h-[18px] w-[18px] shrink-0" />
            <div
              className="bg-muted flex flex-1 items-center rounded-lg p-0.5"
              role="radiogroup"
              aria-label={t(locale, 'switchLanguage')}
            >
              <button
                role="radio"
                aria-checked={locale === 'en'}
                onClick={() => setLocale('en')}
                className={cn(
                  'flex-1 rounded-md px-3 py-1 text-xs font-medium transition-all',
                  locale === 'en'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                EN
              </button>
              <button
                role="radio"
                aria-checked={locale === 'id'}
                onClick={() => setLocale('id')}
                className={cn(
                  'flex-1 rounded-md px-3 py-1 text-xs font-medium transition-all',
                  locale === 'id'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                ID
              </button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
