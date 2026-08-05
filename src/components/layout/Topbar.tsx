'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useStore } from '@/store';
import { MONTH_NAMES, MONTH_NAMES_ID } from '@/lib/constants';
import { useLocale, t } from '@/lib/i18n';
import { ChevronLeft, ChevronRight, Calendar, Menu, LogOut, User } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TopbarProps {
  onMenuClick?: () => void;
  menuOpen?: boolean;
}

export function Topbar({ onMenuClick, menuOpen = false }: TopbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const month = useStore((s) => s.ui.selectedMonth);
  const year = useStore((s) => s.ui.selectedYear);
  const dashboardView = useStore((s) => s.ui.dashboardView);
  const setMonth = useStore((s) => s.setMonth);
  const setYear = useStore((s) => s.setYear);
  const locale = useLocale();
  const queryClient = useQueryClient();

  // Hide month navigation when on dashboard in folder views (years/months)
  const hideMonthNav = pathname === '/' && dashboardView !== 'dashboard';

  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.data?.user?.name) setUserName(d.data.user.name);
      })
      .catch(() => {});
  }, []);

  const handleLogout = useCallback(async () => {
    await fetch('/api/auth/me', { method: 'DELETE' });
    // Drop cached data so the next signed-in user never sees the previous one's
    // transactions, balances, etc. (Note: until per-user data scoping lands,
    // this is also defense against any same-browser session bleed.)
    queryClient.clear();
    router.push('/login');
    router.refresh();
  }, [router, queryClient]);

  const handlePrev = () => {
    if (month === 0) {
      setMonth(11);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const handleNext = () => {
    if (month === 11) {
      setMonth(0);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  return (
    <header className="border-border bg-card/80 flex h-14 shrink-0 items-center justify-between border-b px-4 backdrop-blur-sm sm:px-6">
      {/* Mobile: Hamburger + Logo */}
      <div className="flex min-w-0 items-center gap-2 lg:hidden">
        <button
          onClick={onMenuClick}
          aria-label={t(locale, 'openMenu')}
          aria-expanded={menuOpen}
          aria-haspopup="dialog"
          className="text-muted-foreground hover:bg-muted hover:text-foreground -ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="bg-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-lg shadow-sm">
          <span className="text-primary-foreground text-xs font-bold">FT</span>
        </div>
        <span className="hidden truncate text-sm font-semibold sm:inline">Financial Tracker</span>
      </div>

      {/* Desktop: spacer */}
      <div className="hidden lg:block" />

      <div className="flex items-center gap-3">
        {/* Month Navigation — hidden when browsing year/month folders */}
        {!hideMonthNav && (
          <div
            className="border-border bg-card flex items-center rounded-xl border px-0.5 py-0.5"
            role="group"
            aria-label={t(locale, 'monthNavigation')}
          >
            <button
              onClick={handlePrev}
              aria-label={t(locale, 'prevMonth')}
              className="text-muted-foreground hover:bg-muted hover:text-foreground flex h-11 w-11 items-center justify-center rounded-lg transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-1.5 px-1 sm:px-2">
              <Calendar className="text-muted-foreground hidden h-3.5 w-3.5 sm:block" />
              <span className="text-center text-xs font-medium whitespace-nowrap sm:min-w-[110px]">
                {(locale === 'id' ? MONTH_NAMES_ID : MONTH_NAMES)[month]} {year}
              </span>
            </div>
            <button
              onClick={handleNext}
              aria-label={t(locale, 'nextMonth')}
              className="text-muted-foreground hover:bg-muted hover:text-foreground flex h-11 w-11 items-center justify-center rounded-lg transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger
            className="bg-primary/10 text-primary hover:bg-primary/20 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors"
            aria-label={t(locale, 'settings')}
          >
            {userName ? userName.charAt(0).toUpperCase() : <User className="h-4 w-4" />}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[160px]">
            {userName && (
              <div className="text-muted-foreground border-border border-b px-3 py-2 text-xs">
                {userName}
              </div>
            )}
            <DropdownMenuItem onClick={handleLogout} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              {t(locale, 'signOut')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
