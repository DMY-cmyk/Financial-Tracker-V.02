'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { EditorialHero } from '@/components/login/EditorialHero';
import { EditorialField } from '@/components/login/EditorialField';
import { useLocale } from '@/lib/i18n';

export default function RegisterPage() {
  const router = useRouter();
  const locale = useLocale();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    if (password !== confirmPassword) {
      setError(locale === 'en' ? 'Passwords do not match' : 'Kata sandi tidak cocok');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error?.details) {
          setFieldErrors(data.error.details);
        } else {
          setError(
            data.error?.message ||
              (locale === 'en' ? 'Registration failed' : 'Pendaftaran gagal'),
          );
        }
        return;
      }

      router.push('/home');
      router.refresh();
    } catch {
      setError(
        locale === 'en'
          ? 'Something went wrong. Please try again.'
          : 'Terjadi kesalahan. Silakan coba lagi.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen grid-cols-1 bg-[var(--paper)] lg:grid-cols-2">
      <div className="hidden lg:block">
        <EditorialHero locale={locale} />
      </div>
      <form
        onSubmit={handleSubmit}
        className="relative flex max-w-xl flex-col justify-center gap-3.5 px-14 py-14"
      >
        <div className="ft-eyebrow ft-rise-1">
          {locale === 'en' ? 'CREATE ACCOUNT' : 'BUAT AKUN'}
        </div>
        <h2 className="ft-display-up ft-rise-2 text-[44px] leading-none tracking-tight">
          {locale === 'en' ? 'Welcome.' : 'Selamat datang.'}
        </h2>
        <p className="ft-display ft-rise-3 text-[15px] text-[var(--ink-3)]">
          {locale === 'en' ? 'Create your ledger.' : 'Buat buku besar Anda.'}
        </p>

        <div className="ft-rise-4 mt-3 flex flex-col gap-3">
          <div>
            <EditorialField
              label={locale === 'en' ? 'Name' : 'Nama'}
              value={name}
              onChange={setName}
              type="text"
              required
              autoFocus
              autoComplete="name"
            />
            {fieldErrors.name && (
              <p className="mt-1 text-xs text-[var(--neg)]">{fieldErrors.name[0]}</p>
            )}
          </div>
          <div>
            <EditorialField
              label="Email"
              value={email}
              onChange={setEmail}
              type="email"
              required
              autoComplete="email"
            />
            {fieldErrors.email && (
              <p className="mt-1 text-xs text-[var(--neg)]">{fieldErrors.email[0]}</p>
            )}
          </div>
          <div>
            <EditorialField
              label={locale === 'en' ? 'Password' : 'Kata Sandi'}
              value={password}
              onChange={setPassword}
              type="password"
              required
              autoComplete="new-password"
            />
            {fieldErrors.password && (
              <p className="mt-1 text-xs text-[var(--neg)]">{fieldErrors.password[0]}</p>
            )}
          </div>
          <EditorialField
            label={locale === 'en' ? 'Confirm Password' : 'Konfirmasi Kata Sandi'}
            value={confirmPassword}
            onChange={setConfirmPassword}
            type="password"
            required
            autoComplete="new-password"
          />
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
          disabled={loading}
          className="ft-rise-4 mt-3 w-full bg-[var(--ink)] px-4 py-3.5 text-xs font-semibold uppercase tracking-widest text-[var(--paper)] transition-transform active:scale-[0.99] disabled:cursor-default"
        >
          {loading
            ? locale === 'en'
              ? 'Creating…'
              : 'Membuat…'
            : locale === 'en'
              ? 'Create account →'
              : 'Buat akun →'}
        </button>

        <div className="mt-6 flex justify-between border-t border-[var(--rule-soft)] pt-4 text-xs text-[var(--ink-3)]">
          <Link href="/login" className="underline">
            {locale === 'en' ? 'Already have an account? Sign in' : 'Sudah punya akun? Masuk'}
          </Link>
        </div>
      </form>
    </div>
  );
}
