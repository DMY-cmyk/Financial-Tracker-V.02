'use client';

import { useStore } from '@/store';
import { useLocale } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface LanguageSwitcherProps {
  className?: string;
}

export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const locale = useLocale();
  const setLocale = useStore(s => s.setLocale);

  return (
    <div className={cn('inline-flex rounded-lg border border-border p-0.5', className)}>
      {(['en', 'id'] as const).map((code) => (
        <button
          key={code}
          onClick={() => setLocale(code)}
          className={cn(
            'rounded-md px-3 py-1 text-xs font-medium transition-all',
            locale === code
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
