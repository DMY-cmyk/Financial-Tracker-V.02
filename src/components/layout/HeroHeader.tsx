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
    <span aria-label={t(locale, 'heroBellAria')} className="text-hero-foreground inline-flex">
      <Bell className="h-5 w-5" aria-hidden="true" />
    </span>
  );

  return (
    <div className={cn('lg:hidden', className)}>
      <div className="bg-hero text-hero-foreground rounded-b-3xl px-5 pt-6 pb-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {showBack && (
              <button
                type="button"
                onClick={onBack}
                aria-label={t(locale, 'heroBackAria')}
                className="-ml-1 p-1"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              </button>
            )}
            <h1 className="text-base font-semibold">{title}</h1>
          </div>
          <div className="flex items-center">{rightAction ?? fallbackRight}</div>
        </div>

        {(greeting || subgreeting) && (
          <div className="mt-4 space-y-0.5">
            {greeting && <p className="text-xs font-medium opacity-90">{greeting}</p>}
            {subgreeting && <p className="text-base font-bold">{subgreeting}</p>}
          </div>
        )}

        {children && <div className="mt-4">{children}</div>}
      </div>
    </div>
  );
}
