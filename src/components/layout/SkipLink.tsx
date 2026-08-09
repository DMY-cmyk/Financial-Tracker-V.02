'use client';

import { t, useLocale } from '@/lib/i18n';

export function SkipLink() {
  const locale = useLocale();

  return (
    <a
      href="#main-content"
      className="focus:bg-primary focus:text-primary-foreground sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-lg"
    >
      {t(locale, 'skipToContent')}
    </a>
  );
}
