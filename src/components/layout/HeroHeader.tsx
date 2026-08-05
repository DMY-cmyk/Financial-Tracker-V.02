'use client';

import { ReactNode } from 'react';
import { Bell, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { t, useLocale } from '@/lib/i18n';

export interface HeroHeaderProps {
  title: string;
  greeting?: string;
  subgreeting?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function HeroHeader({
  title,
  greeting,
  subgreeting,
  showBack = false,
  onBack,
  rightAction,
  children,
  className,
}: HeroHeaderProps) {
  const locale = useLocale();
  const fallbackRight = (
    <span aria-hidden="true" className="text-hero-foreground inline-flex">
      <Bell className="h-5 w-5" />
    </span>
  );

  return (
    <div className={cn('lg:hidden', className)}>
      <div className="bg-hero text-hero-foreground shadow-card relative overflow-hidden rounded-b-3xl px-5 pt-6 pb-7">
        {/* Subtle radial highlight in the upper-right for depth */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-12 -right-12 h-44 w-44 rounded-full bg-white/20 opacity-50 blur-3xl"
        />

        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-2">
            {showBack && (
              <button
                type="button"
                onClick={onBack}
                aria-label={t(locale, 'heroBackAria')}
                className="-ml-3 flex h-11 w-11 items-center justify-center"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              </button>
            )}
            <h1 className="text-[13px] font-semibold tracking-[0.16em] uppercase">{title}</h1>
          </div>
          <div className="flex items-center">{rightAction ?? fallbackRight}</div>
        </div>

        {(greeting || subgreeting) && (
          <div className="relative mt-5 space-y-1">
            {greeting && (
              <p className="text-[11px] font-medium tracking-wider uppercase opacity-75">
                {greeting}
              </p>
            )}
            {subgreeting && (
              <p className="text-xl leading-tight font-bold tracking-tight">{subgreeting}</p>
            )}
          </div>
        )}

        {children && <div className="relative mt-5">{children}</div>}
      </div>
    </div>
  );
}
