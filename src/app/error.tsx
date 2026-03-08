'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { t, useLocale } from '@/lib/i18n';
import { AlertTriangle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const locale = useLocale();

  useEffect(() => {
    console.error('App error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="bg-destructive/10 flex h-16 w-16 items-center justify-center rounded-2xl">
        <AlertTriangle className="text-destructive h-8 w-8" />
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">{t(locale, 'somethingWentWrong')}</h2>
        <p className="text-muted-foreground max-w-md text-sm">
          {locale === 'id'
            ? 'Terjadi kesalahan. Silakan coba lagi atau muat ulang halaman.'
            : 'An unexpected error occurred. Please try again or refresh the page.'}
        </p>
      </div>
      <div className="flex gap-3">
        <Button variant="outline" onClick={() => window.location.reload()}>
          {t(locale, 'refreshPage')}
        </Button>
        <Button onClick={reset}>{t(locale, 'tryAgain')}</Button>
      </div>
    </div>
  );
}
