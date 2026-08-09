'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Home } from 'lucide-react';
import { t, useLocale } from '@/lib/i18n';

export default function NotFound() {
  const locale = useLocale();

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="space-y-1">
        <p className="text-primary text-6xl font-bold">404</p>
        <h2 className="text-xl font-semibold">{t(locale, 'pageNotFound')}</h2>
        <p className="text-muted-foreground max-w-md text-sm">{t(locale, 'pageNotFoundBody')}</p>
      </div>
      <Link href="/">
        <Button className="gap-2">
          <Home className="h-4 w-4" />
          {t(locale, 'backToDashboard')}
        </Button>
      </Link>
    </div>
  );
}
