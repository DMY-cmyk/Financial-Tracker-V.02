'use client';

import { useState } from 'react';
import { EditorialHero } from '@/components/login/EditorialHero';
import { EditorialField } from '@/components/login/EditorialField';
import { t, useLocale } from '@/lib/i18n';

export default function ForgotPasswordPage() {
  const locale = useLocale();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, locale }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error?.message ?? t(locale, 'authGenericError'));
        return;
      }
      setSent(true);
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
      <div className="flex items-center justify-center px-14 py-14">
        {sent ? (
          <div className="ft-rise flex max-w-md flex-col gap-3">
            <div className="ft-eyebrow">{t(locale, 'forgotSent')}</div>
            <h2 className="ft-display-up text-4xl">{t(locale, 'authForgotSentHeading')}</h2>
            <p className="ft-display text-[15px] text-[var(--ink-3)]">
              {t(locale, 'authForgotSentBody')}
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="flex max-w-md flex-col gap-3">
            <div className="ft-eyebrow">{t(locale, 'authResetEyebrow')}</div>
            <h2 className="ft-display-up text-4xl">{t(locale, 'forgotTitle')}</h2>
            <p className="ft-display text-[15px] text-[var(--ink-3)]">
              {t(locale, 'forgotSubtitle')}
            </p>
            <EditorialField
              label="Email"
              value={email}
              onChange={setEmail}
              type="email"
              autoComplete="email"
              required
              autoFocus
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
              disabled={busy || !email}
              className="mt-3 w-full bg-[var(--ink)] px-4 py-3.5 text-xs font-semibold tracking-widest text-[var(--paper)] uppercase disabled:opacity-50"
            >
              {t(locale, 'forgotSubmit')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
