'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { t, type Locale } from '@/lib/i18n';
import { EditorialField } from './EditorialField';

export interface LoginFormProps {
  locale: Locale;
  onSuccess?: () => void;
  sessionExpired?: boolean;
}

export function LoginForm({ locale, onSuccess, sessionExpired }: LoginFormProps) {
  let router: ReturnType<typeof useRouter> | null = null;
  try {
    router = useRouter();
  } catch {
    // No router context (e.g., test env) — fall back to no-op redirect.
  }

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [keep, setKeep] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, keepSignedIn: keep }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message ?? 'Login failed');
      } else {
        onSuccess?.();
        router?.push?.('/home');
        router?.refresh?.();
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="relative flex max-w-xl flex-col justify-center gap-3.5 px-14 py-14"
    >
      <div className="ft-eyebrow ft-rise-1">{locale === 'en' ? 'SIGN IN' : 'MASUK'}</div>
      <h2 className="ft-display-up ft-rise-2 text-[44px] leading-none tracking-tight">
        {t(locale, 'authWelcomeBack')}
      </h2>
      <p className="ft-display ft-rise-3 text-[15px] text-[var(--ink-3)]">
        {t(locale, 'authSignInSubtitle')}
      </p>

      {sessionExpired && (
        <div className="ft-rise-3 border border-[var(--warn)] bg-[var(--warn-soft)] px-3 py-2 text-xs text-[var(--warn)]">
          <span className="ft-eyebrow mr-2">{t(locale, 'authSessionEnded')}</span>
        </div>
      )}

      <div className="ft-rise-4 mt-3 flex flex-col gap-3">
        <EditorialField
          label="Email"
          value={email}
          onChange={setEmail}
          type="email"
          required
          autoFocus
          autoComplete="email"
        />
        <EditorialField
          label={t(locale, 'authPasswordLabel')}
          value={password}
          onChange={setPassword}
          type="password"
          required
          autoComplete="current-password"
        />
        <label className="mt-0.5 flex items-center gap-2 text-xs text-[var(--ink-3)]">
          <input
            type="checkbox"
            checked={keep}
            onChange={(e) => setKeep(e.target.checked)}
            style={{ accentColor: 'var(--accent)' }}
          />
          {t(locale, 'authKeepSignedIn')}
        </label>
      </div>

      {error && (
        <div
          role="alert"
          className="ft-rise-4 border border-[var(--neg)] bg-[var(--neg-soft)] px-3 py-2 text-xs text-[var(--neg)]"
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={busy}
        className="ft-rise-4 mt-3 w-full bg-[var(--ink)] px-4 py-3.5 text-xs font-semibold uppercase tracking-widest text-[var(--paper)] transition-transform active:scale-[0.99] disabled:cursor-default"
      >
        {busy
          ? t(locale, 'authOpeningBooks')
          : locale === 'en'
            ? 'Sign in →'
            : 'Masuk →'}
      </button>

      <div className="my-3 flex items-center gap-3">
        <div className="h-px flex-1 bg-[var(--rule-soft)]" />
        <span className="ft-eyebrow">{t(locale, 'authOr')}</span>
        <div className="h-px flex-1 bg-[var(--rule-soft)]" />
      </div>

      <button
        type="button"
        onClick={() => window.location.assign('/api/auth/google')}
        className="flex items-center justify-center gap-2.5 border border-[var(--rule-soft)] bg-[var(--card)] px-4 py-3 text-sm font-medium text-[var(--ink)]"
      >
        <span className="ft-mono" style={{ color: 'var(--accent)' }}>
          G
        </span>
        {t(locale, 'authContinueGoogle')}
      </button>

      <div className="mt-6 flex justify-between border-t border-[var(--rule-soft)] pt-4 text-xs text-[var(--ink-3)]">
        <Link href="/forgot-password" className="underline">
          {t(locale, 'authForgotPassword')}
        </Link>
        <Link href="/register" className="underline">
          {t(locale, 'authCreateAccount')}
        </Link>
      </div>

      <div className="ft-eyebrow absolute right-14 bottom-6 left-14 flex justify-between">
        <span>
          <span className="ft-live-dot mr-1.5 align-middle" />
          {t(locale, 'authTLSEncrypted')}
        </span>
        <span>v 2.0.4</span>
      </div>
    </form>
  );
}
