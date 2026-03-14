'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store';
import { MONTH_NAMES } from '@/lib/constants';
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
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const router = useRouter();
  const month = useStore((s) => s.ui.selectedMonth);
  const year = useStore((s) => s.ui.selectedYear);
  const setMonth = useStore((s) => s.setMonth);
  const setYear = useStore((s) => s.setYear);
  const locale = useLocale();

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
    router.push('/login');
    router.refresh();
  }, [router]);

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
      <div className="flex items-center gap-2 lg:hidden">
        <button
          onClick={onMenuClick}
          aria-label={locale === 'id' ? 'Buka menu' : 'Open menu'}
          className="text-muted-foreground hover:bg-muted hover:text-foreground -ml-1 rounded-lg p-1.5 transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="bg-primary flex h-8 w-8 items-center justify-center rounded-lg shadow-sm">
          <span className="text-primary-foreground text-xs font-bold">FT</span>
        </div>
        <span className="text-sm font-semibold">Financial Tracker</span>
      </div>

      {/* Desktop: spacer */}
      <div className="hidden lg:block" />

      <div className="flex items-center gap-3">
        {/* Month Navigation */}
        <div
          className="border-border bg-card flex items-center gap-1 rounded-xl border px-1 py-1"
          role="group"
          aria-label={locale === 'id' ? 'Navigasi bulan' : 'Month navigation'}
        >
          <button
            onClick={handlePrev}
            aria-label={locale === 'id' ? 'Bulan sebelumnya' : 'Previous month'}
            className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg p-1.5 transition-colors"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <div className="flex items-center gap-1.5 px-2">
            <Calendar className="text-muted-foreground h-3.5 w-3.5" />
            <span className="min-w-[110px] text-center text-xs font-medium">
              {MONTH_NAMES[month]} {year}
            </span>
          </div>
          <button
            onClick={handleNext}
            aria-label={locale === 'id' ? 'Bulan berikutnya' : 'Next month'}
            className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg p-1.5 transition-colors"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger
            className="bg-primary/10 text-primary hover:bg-primary/20 flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors"
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
            <DropdownMenuItem onClick={handleLogout} className="text-red-600 dark:text-red-400">
              <LogOut className="mr-2 h-4 w-4" />
              {locale === 'id' ? 'Keluar' : 'Logout'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
