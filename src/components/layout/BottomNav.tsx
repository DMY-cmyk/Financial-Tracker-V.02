'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { t, useLocale } from '@/lib/i18n';
import {
  LayoutDashboard,
  Receipt,
  Upload,
  Download,
  Settings,
} from 'lucide-react';

type NavKey = 'dashboard' | 'transactions' | 'upload' | 'export' | 'settings';

const items: { href: string; key: NavKey; icon: typeof LayoutDashboard }[] = [
  { href: '/', key: 'dashboard', icon: LayoutDashboard },
  { href: '/transactions', key: 'transactions', icon: Receipt },
  { href: '/upload', key: 'upload', icon: Upload },
  { href: '/export', key: 'export', icon: Download },
  { href: '/settings', key: 'settings', icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();
  const locale = useLocale();

  return (
    <nav
      aria-label={locale === 'id' ? 'Navigasi bawah' : 'Bottom navigation'}
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-md lg:hidden"
    >
      <div className="flex items-center justify-around py-2">
        {items.map(({ href, key, icon: Icon }) => {
          const isActive =
            href === '/' ? pathname === '/' : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-1 text-xs transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{t(locale, key)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
