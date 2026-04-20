'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { t, useLocale } from '@/lib/i18n';
import { useStore } from '@/store';
import {
  Home,
  LayoutDashboard,
  Receipt,
  Target,
  MoreHorizontal,
  CalendarCheck,
  PiggyBank,
  Repeat,
  TrendingUp,
  BarChart3,
  Upload,
  Download,
  Settings,
  Tag,
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

type NavKey =
  | 'home'
  | 'dashboard'
  | 'transactions'
  | 'budgetPage'
  | 'bills'
  | 'recurringTransactions'
  | 'savingsPage'
  | 'insights'
  | 'reports'
  | 'upload'
  | 'export'
  | 'settings'
  | 'categories';

const mainItems: { href: string; key: NavKey; icon: typeof LayoutDashboard }[] = [
  { href: '/home', key: 'home', icon: Home },
  { href: '/', key: 'dashboard', icon: LayoutDashboard },
  { href: '/transactions', key: 'transactions', icon: Receipt },
  { href: '/budget', key: 'budgetPage', icon: Target },
];

const moreGroups: {
  label: string;
  labelId: string;
  items: { href: string; key: NavKey; icon: typeof LayoutDashboard }[];
}[] = [
  {
    label: 'Finance',
    labelId: 'finance',
    items: [
      { href: '/bills', key: 'bills', icon: CalendarCheck },
      { href: '/recurring', key: 'recurringTransactions', icon: Repeat },
      { href: '/savings', key: 'savingsPage', icon: PiggyBank },
      { href: '/insights', key: 'insights', icon: TrendingUp },
    ],
  },
  {
    label: 'Tools',
    labelId: 'tools',
    items: [
      { href: '/reports', key: 'reports', icon: BarChart3 },
      { href: '/upload', key: 'upload', icon: Upload },
      { href: '/export', key: 'export', icon: Download },
    ],
  },
  {
    label: 'Settings',
    labelId: 'settings',
    items: [
      { href: '/settings', key: 'settings', icon: Settings },
      { href: '/settings/categories', key: 'categories', icon: Tag },
    ],
  },
];

// Keep moreItems as flat list for isMoreActive calculation
const moreItems = moreGroups.flatMap((g) => g.items);

export function BottomNav() {
  const pathname = usePathname();
  const locale = useLocale();
  const setDashboardView = useStore((s) => s.setDashboardView);
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    if (href === '/home') return pathname === '/home';
    return pathname.startsWith(href);
  };

  const isMoreActive = moreItems.some((item) => isActive(item.href));

  return (
    <>
      <nav
        aria-label={locale === 'id' ? 'Navigasi bawah' : 'Bottom navigation'}
        className="border-border bg-card/95 fixed right-0 bottom-0 left-0 z-50 border-t backdrop-blur-md lg:hidden"
      >
        <div className="flex items-center justify-around py-2">
          {mainItems.map(({ href, key, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(href) ? 'page' : undefined}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-1 text-xs transition-colors',
                isActive(href) ? 'text-primary' : 'text-muted-foreground'
              )}
              onClick={(e) => {
                if (href === '/' && pathname === '/') {
                  e.preventDefault();
                  setDashboardView('years');
                  window.history.pushState({ dashboardView: 'years' }, '');
                }
              }}
            >
              <Icon className="h-5 w-5" />
              <span>{t(locale, key)}</span>
            </Link>
          ))}
          <button
            onClick={() => setMoreOpen(true)}
            className={cn(
              'flex flex-col items-center gap-1 px-3 py-1 text-xs transition-colors',
              isMoreActive ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <MoreHorizontal className="h-5 w-5" />
            <span>{locale === 'id' ? 'Lainnya' : 'More'}</span>
          </button>
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" showCloseButton={false} className="rounded-t-2xl pb-8">
          <SheetHeader className="pb-2">
            <SheetTitle>{locale === 'id' ? 'Menu Lainnya' : 'More Options'}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            {moreGroups.map((group, gi) => (
              <div key={group.labelId}>
                {gi > 0 && <div className="border-border border-t" />}
                <p className="text-muted-foreground mb-2 px-1 pt-2 text-[10px] font-semibold tracking-widest uppercase">
                  {group.label}
                </p>
                <div className="grid grid-cols-4 gap-3">
                  {group.items.map(({ href, key, icon: Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setMoreOpen(false)}
                      className={cn(
                        'flex flex-col items-center gap-2 rounded-xl p-3 text-xs transition-colors',
                        isActive(href)
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-center leading-tight">{t(locale, key)}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
