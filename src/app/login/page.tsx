'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { EditorialHero } from '@/components/login/EditorialHero';
import { LoginForm } from '@/components/login/LoginForm';
import { useLocale } from '@/lib/i18n';

function LoginPageInner() {
  const locale = useLocale();
  const params = useSearchParams();
  const sessionExpired = params.get('reason') === 'expired';

  // Class string assembled below to keep `grid-cols-1 lg:grid-cols-2` adjacent
  // (Tailwind plugin re-sorts tokens inside JSX className).
  const shellClass = 'grid min-h-screen grid-cols-1 lg:grid-cols-2 bg-[var(--paper)]';

  return (
    <div className={shellClass}>
      <div className="hidden lg:block">
        <EditorialHero locale={locale} />
      </div>
      <div className="flex items-center justify-center">
        <LoginForm locale={locale} sessionExpired={sessionExpired} />
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}
