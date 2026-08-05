'use client';

import { Suspense, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { EditorialHero } from '@/components/login/EditorialHero';
import { EditorialField } from '@/components/login/EditorialField';
import { t, useLocale } from '@/lib/i18n';

function strengthScore(pwd: string): number {
  let s = 0;
  if (pwd.length >= 8) s++;
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) s++;
  if (/\d/.test(pwd)) s++;
  if (/[^A-Za-z0-9]/.test(pwd)) s++;
  return s;
}

function ResetPasswordInner() {
  const router = useRouter();
  const locale = useLocale();
  const params = useSearchParams();
  const token = params?.get('token') ?? '';

  const [pwd, setPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const score = useMemo(() => strengthScore(pwd), [pwd]);
  const matches = pwd === confirm && pwd.length > 0;
  const canSubmit = score >= 2 && matches && !busy;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: pwd }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error?.message ?? t(locale, 'authGenericError'));
      } else {
        router.push('/login');
      }
    } catch {
      setError(t(locale, 'authGenericError'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen grid-cols-1 bg-[var(--paper)] lg:grid-cols-2">
      <div className="hidden lg:block">
        <EditorialHero locale={locale} />
      </div>
      <form
        onSubmit={submit}
        className="flex flex-col items-stretch justify-center gap-3 px-14 py-14"
      >
        <div className="ft-eyebrow">{locale === 'en' ? 'RESET' : 'SETEL ULANG'}</div>
        <h2 className="ft-display-up text-4xl">{t(locale, 'resetTitle')}</h2>
        <p className="ft-display text-[15px] text-[var(--ink-3)]">{t(locale, 'resetSubtitle')}</p>

        <EditorialField
          label={t(locale, 'authPasswordLabel')}
          value={pwd}
          onChange={setPwd}
          type="password"
          autoComplete="new-password"
          required
          autoFocus
        />
        <div className="flex gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-1 flex-1 bg-[var(--paper-2)]">
              <div
                className="h-full transition-[width]"
                style={{
                  width: score > i ? '100%' : '0%',
                  background: 'var(--accent)',
                }}
              />
            </div>
          ))}
        </div>
        <div className="ft-eyebrow">
          {t(locale, 'resetStrength')} · {score}/4
        </div>

        <EditorialField
          label={locale === 'en' ? 'Confirm password' : 'Konfirmasi kata sandi'}
          value={confirm}
          onChange={setConfirm}
          type="password"
          autoComplete="new-password"
          required
          error={confirm && !matches ? t(locale, 'resetMismatch') : undefined}
        />

        {error && (
          <div
            role="alert"
            className="border border-[var(--neg)] bg-[var(--neg-soft)] px-3 py-2 text-xs text-[var(--neg)]"
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="mt-3 w-full bg-[var(--ink)] px-4 py-3.5 text-xs font-semibold tracking-widest text-[var(--paper)] uppercase disabled:opacity-50"
        >
          {t(locale, 'resetSubmit')}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordInner />
    </Suspense>
  );
}
