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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, locale }),
      });
      setSent(true);
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
            <h2 className="ft-display-up text-4xl">
              {locale === 'en' ? 'Sent.' : 'Terkirim.'}
            </h2>
            <p className="ft-display text-[15px] text-[var(--ink-3)]">
              {locale === 'en'
                ? 'Check your inbox for a link to reset your password.'
                : 'Periksa kotak masuk Anda untuk tautan setel ulang.'}
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="flex max-w-md flex-col gap-3">
            <div className="ft-eyebrow">
              {locale === 'en' ? 'RESET' : 'SETEL ULANG'}
            </div>
            <h2 className="ft-display-up text-4xl">{t(locale, 'forgotTitle')}</h2>
            <p className="ft-display text-[15px] text-[var(--ink-3)]">
              {t(locale, 'forgotSubtitle')}
            </p>
            <EditorialField
              label="Email"
              value={email}
              onChange={setEmail}
              type="email"
              required
              autoFocus
            />
            <button
              type="submit"
              disabled={busy || !email}
              className="mt-3 w-full bg-[var(--ink)] px-4 py-3.5 text-xs font-semibold uppercase tracking-widest text-[var(--paper)] disabled:opacity-50"
            >
              {t(locale, 'forgotSubmit')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
