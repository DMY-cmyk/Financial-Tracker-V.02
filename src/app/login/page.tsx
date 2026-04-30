'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { EditorialHero } from '@/components/login/EditorialHero';
import { LoginForm } from '@/components/login/LoginForm';
import { useLocale } from '@/lib/i18n';

function LoginPageInner() {
  const locale = useLocale();
  const router = useRouter();
  const params = useSearchParams();
  const sessionExpired = params.get('reason') === 'expired';

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_SKIP_AUTH !== 'true') return;
    fetch('/api/auth/setup-check')
      .then((r) => r.json())
      .then((data: { data?: { hasUsers: boolean } }) => {
        if (data.data && !data.data.hasUsers) {
          router.replace('/register');
        }
      })
      .catch(() => {
        // Ignore errors — don't block login page on setup-check failure
      });
  }, [router]);

  return (
    <div className="grid min-h-screen grid-cols-1 bg-[var(--paper)] lg:grid-cols-2">
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
