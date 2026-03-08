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
  Plus,
  PanelLeftClose,
  PanelLeft,
  Tag,
} from 'lucide-react';

type NavKey = 'dashboard' | 'transactions' | 'upload' | 'export' | 'settings' | 'categories';

const NAV_MAIN: { href: string; key: NavKey; icon: typeof LayoutDashboard }[] = [
  { href: '/', key: 'dashboard', icon: LayoutDashboard },
  { href: '/transactions', key: 'transactions', icon: Receipt },
  { href: '/upload', key: 'upload', icon: Upload },
  { href: '/export', key: 'export', icon: Download },
];

const NAV_BOTTOM: { href: string; key: NavKey; icon: typeof Settings }[] = [
  { href: '/settings', key: 'settings', icon: Settings },
  { href: '/settings/categories', key: 'categories', icon: Tag },
];

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  className?: string;
}

export function Sidebar({ collapsed, onToggleCollapse, className }: SidebarProps) {
  const pathname = usePathname();
  const locale = useLocale();

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  const navLinkClass = (href: string) =>
    cn(
      'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
      isActive(href)
        ? 'bg-primary/10 text-primary shadow-sm'
        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      collapsed && 'justify-center px-0'
    );

  return (
    <aside
      aria-label={locale === 'id' ? 'Navigasi utama' : 'Main navigation'}
      className={cn(
        'flex flex-col border-r border-border bg-card/50 backdrop-blur-sm transition-all duration-300',
        collapsed ? 'w-[72px]' : 'w-[260px]',
        className
      )}
    >
      {/* Logo */}
      <div className={cn('flex h-14 items-center gap-3 border-b border-border', collapsed ? 'justify-center px-2' : 'px-5')}>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary shadow-sm">
          <span className="text-xs font-bold text-primary-foreground">FT</span>
        </div>
        {!collapsed && (
          <span className="truncate text-sm font-semibold">Financial Tracker</span>
        )}
      </div>

      {/* Quick Add */}
      <div className="p-3">
        <Link
          href="/transactions/new"
          className={cn(
            'flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md',
            collapsed && 'px-0'
          )}
        >
          <Plus className="h-4 w-4 shrink-0" />
          {!collapsed && <span>{t(locale, 'newTransaction')}</span>}
        </Link>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 space-y-1 px-3" aria-label={t(locale, 'menu')}>
        {!collapsed && (
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            {t(locale, 'menu')}
          </p>
        )}
        {NAV_MAIN.map(({ href, key, icon: Icon }) => (
          <Link key={href} href={href} className={navLinkClass(href)} title={collapsed ? t(locale, key) : undefined} aria-current={isActive(href) ? 'page' : undefined}>
            <Icon className="h-[18px] w-[18px] shrink-0" />
            {!collapsed && <span>{t(locale, key)}</span>}
          </Link>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="space-y-1 border-t border-border p-3">
        {!collapsed && (
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            {locale === 'id' ? 'Sistem' : 'System'}
          </p>
        )}
        {NAV_BOTTOM.map(({ href, key, icon: Icon }) => (
          <Link key={href} href={href} className={navLinkClass(href)} title={collapsed ? t(locale, key) : undefined} aria-current={isActive(href) ? 'page' : undefined}>
            <Icon className="h-[18px] w-[18px] shrink-0" />
            {!collapsed && <span>{t(locale, key)}</span>}
          </Link>
        ))}

        <button
          onClick={onToggleCollapse}
          aria-label={t(locale, 'collapse')}
          className={cn(
            'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground',
            collapsed && 'justify-center px-0'
          )}
        >
          {collapsed ? (
            <PanelLeft className="h-[18px] w-[18px]" />
          ) : (
            <>
              <PanelLeftClose className="h-[18px] w-[18px]" />
              <span>{t(locale, 'collapse')}</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
