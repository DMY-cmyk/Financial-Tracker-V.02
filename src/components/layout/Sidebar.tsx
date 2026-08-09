'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { t, useLocale } from '@/lib/i18n';
import { useSettings } from '@/hooks/useSettings';
import { gentleSpring, DURATION } from '@/lib/motion';
import { Settings, Plus, PanelLeftClose, PanelLeft, Tag, Languages } from 'lucide-react';
import { SidebarGroup } from '@/features/navigation/SidebarGroup';
import { useNavGroups } from '@/features/navigation/useNavGroups';

const NAV_BOTTOM: { href: string; key: Parameters<typeof t>[1]; icon: typeof Settings }[] = [
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
  const { updateLocale } = useSettings();
  const { groups, isGroupCollapsed, toggleGroup } = useNavGroups();

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    if (href === '/home') return pathname === '/home';
    return pathname.startsWith(href);
  };

  const navLinkClass = (href: string) =>
    cn(
      'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
      isActive(href)
        ? 'bg-primary/10 text-primary shadow-sm'
        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      collapsed && 'justify-center px-0'
    );

  return (
    <motion.aside
      aria-label={t(locale, 'mainNavigation')}
      animate={{ width: collapsed ? 72 : 260 }}
      transition={gentleSpring}
      className={cn(
        'border-border bg-card/50 flex flex-col overflow-hidden border-r backdrop-blur-sm',
        className
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          'border-border flex h-14 items-center gap-3 border-b',
          collapsed ? 'justify-center px-2' : 'px-5'
        )}
      >
        <div className="bg-brand-mint text-brand-mint-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded-lg shadow-sm">
          <span className="text-xs font-bold">FT</span>
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: DURATION.fast }}
              className="truncate text-sm font-semibold"
            >
              Financial Tracker
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Quick Add */}
      <div className="p-3">
        <Link
          href="/transactions/new"
          className={cn(
            'bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium shadow-sm transition-all hover:shadow-md',
            collapsed && 'px-0'
          )}
        >
          <Plus className="h-4 w-4 shrink-0" />
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: DURATION.fast }}
              >
                {t(locale, 'newTransaction')}
              </motion.span>
            )}
          </AnimatePresence>
        </Link>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 space-y-3 overflow-y-auto px-3 py-2" aria-label={t(locale, 'menu')}>
        {groups.map((group) => (
          <SidebarGroup
            key={group.id}
            group={group}
            railMode={collapsed}
            isCollapsed={isGroupCollapsed(group.id)}
            onToggle={() => toggleGroup(group.id)}
            locale={locale}
          />
        ))}
      </nav>

      {/* Bottom section */}
      <div className="border-border space-y-1 border-t p-3">
        {!collapsed && (
          <p className="text-muted-foreground/60 mb-2 px-3 text-[10px] font-semibold tracking-wider uppercase">
            {t(locale, 'systemSection')}
          </p>
        )}
        {NAV_BOTTOM.map(({ href, key, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={navLinkClass(href)}
            title={collapsed ? t(locale, key) : undefined}
            aria-label={collapsed ? t(locale, key) : undefined}
            aria-current={isActive(href) ? 'page' : undefined}
          >
            <Icon className="h-[18px] w-[18px] shrink-0" />
            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: DURATION.fast }}
                  className="whitespace-nowrap"
                >
                  {t(locale, key)}
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
        ))}

        {/* Language Switcher */}
        {collapsed ? (
          <button
            onClick={() => updateLocale(locale === 'en' ? 'id' : 'en')}
            aria-label={t(locale, 'switchLanguage')}
            title={t(locale, 'switchLanguage')}
            className={cn(
              'text-muted-foreground/60 hover:bg-muted hover:text-foreground flex w-full items-center justify-center gap-3 rounded-xl px-0 py-2 text-sm transition-colors'
            )}
          >
            <Languages className="h-[18px] w-[18px]" />
          </button>
        ) : (
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
                onClick={() => updateLocale('en')}
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
                onClick={() => updateLocale('id')}
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
        )}

        <button
          onClick={onToggleCollapse}
          aria-label={collapsed ? t(locale, 'expand') : t(locale, 'collapse')}
          aria-expanded={!collapsed}
          className={cn(
            'text-muted-foreground/60 hover:bg-muted hover:text-foreground flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors',
            collapsed && 'justify-center px-0'
          )}
        >
          {collapsed ? (
            <PanelLeft className="h-[18px] w-[18px]" />
          ) : (
            <>
              <PanelLeftClose className="h-[18px] w-[18px]" />
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: DURATION.fast }}
              >
                {t(locale, 'collapse')}
              </motion.span>
            </>
          )}
        </button>
      </div>
    </motion.aside>
  );
}
