'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { t } from '@/lib/i18n';
import { useStore } from '@/store';
import { staggerList, staggerListItem } from '@/lib/motion';
import type { NavGroup } from './nav-config';

interface SidebarGroupProps {
  group: NavGroup;
  /** True when sidebar is in 72px icon-only rail mode — suppresses group header */
  railMode: boolean;
  isCollapsed: boolean;
  onToggle: () => void;
  locale: 'en' | 'id';
}

export function SidebarGroup({
  group,
  railMode,
  isCollapsed,
  onToggle,
  locale,
}: SidebarGroupProps) {
  const pathname = usePathname();
  const setDashboardView = useStore((s) => s.setDashboardView);

  const isItemActive = (href: string) => {
    if (href === '/') return pathname === '/';
    if (href === '/home') return pathname === '/home';
    return pathname.startsWith(href);
  };

  const navLinkClass = (href: string) =>
    cn(
      'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
      isItemActive(href)
        ? 'bg-primary/10 text-primary shadow-sm'
        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      railMode && 'justify-center px-0'
    );

  const isCollapsible = Boolean(group.labelKey) && !railMode;

  return (
    <div>
      {/* Group header — only shown when expanded sidebar + group has a label */}
      {isCollapsible && (
        <button
          onClick={onToggle}
          className="text-muted-foreground/60 hover:text-muted-foreground mb-1 flex w-full items-center justify-between px-3 py-1 text-[10px] font-semibold tracking-wider uppercase transition-colors"
        >
          <span>{t(locale, group.labelKey as Parameters<typeof t>[1])}</span>
          <motion.span animate={{ rotate: isCollapsed ? 0 : 90 }} transition={{ duration: 0.2 }}>
            <ChevronRight className="h-3 w-3" />
          </motion.span>
        </button>
      )}

      {/* Nav items */}
      <AnimatePresence initial={false}>
        {(!isCollapsible || !isCollapsed) && (
          <motion.div
            key={group.id}
            initial={isCollapsible ? { height: 0, opacity: 0 } : false}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <motion.div
              variants={staggerList}
              initial="hidden"
              animate="show"
              className="space-y-0.5"
            >
              {group.items.map(({ href, labelKey, icon: Icon }) => (
                <motion.div key={href} variants={staggerListItem}>
                  <Link
                    href={href}
                    className={navLinkClass(href)}
                    title={railMode ? t(locale, labelKey as Parameters<typeof t>[1]) : undefined}
                    aria-current={isItemActive(href) ? 'page' : undefined}
                    onClick={(e) => {
                      if (href === '/' && pathname === '/') {
                        e.preventDefault();
                        setDashboardView('years');
                        window.history.pushState({ dashboardView: 'years' }, '');
                      }
                    }}
                  >
                    <Icon className="h-[18px] w-[18px] shrink-0" />
                    <AnimatePresence>
                      {!railMode && (
                        <motion.span
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: 'auto' }}
                          exit={{ opacity: 0, width: 0 }}
                          transition={{ duration: 0.15 }}
                          className="whitespace-nowrap"
                        >
                          {t(locale, labelKey as Parameters<typeof t>[1])}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
