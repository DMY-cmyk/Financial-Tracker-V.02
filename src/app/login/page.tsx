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
  const oauthError = params.get('error') ?? undefined;

  return (
    <div className="grid min-h-screen grid-cols-1 bg-[var(--paper)] lg:grid-cols-2">
      <div className="hidden lg:block">
        <EditorialHero locale={locale} />
      </div>
      <div className="flex items-center justify-center">
        <LoginForm locale={locale} sessionExpired={sessionExpired} oauthError={oauthError} />
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
