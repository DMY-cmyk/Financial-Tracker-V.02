'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fadeInUp } from '@/lib/motion';
import { t, useLocale } from '@/lib/i18n';
import { Eye, EyeOff, Loader2, LogIn } from 'lucide-react';

function LoginPageInner() {
  const router = useRouter();
  const locale = useLocale();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Show session-expired banner when redirected by middleware
  const searchParams = useSearchParams();
  const reason = searchParams.get('reason');
  const sessionExpiredMessage = reason === 'expired' ? t(locale, 'sessionExpired') : '';

  // SKIP_AUTH: auto-redirect to /register if no users exist (dev only)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error?.message || 'Login failed');
        return;
      }

      router.push('/home');
      router.refresh();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-emerald-50 px-4 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <motion.div
        {...fadeInUp}
        className="border-border bg-card w-full max-w-md rounded-2xl border p-8 shadow-xl"
      >
        <div className="mb-8 text-center">
          <div className="bg-primary mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl shadow-lg">
            <span className="text-primary-foreground text-lg font-bold">FT</span>
          </div>
          <h1 className="text-2xl font-bold">Welcome Back</h1>
          <p className="text-muted-foreground mt-1 text-sm">Sign in to your financial tracker</p>
        </div>

        {sessionExpiredMessage && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-400"
          >
            {sessionExpiredMessage}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400"
            >
              {error}
            </motion.div>
          )}

          <Button type="submit" className="w-full gap-2" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
            Sign In
          </Button>
        </form>

        <p className="text-muted-foreground mt-6 text-center text-sm">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-primary font-medium hover:underline">
            Create one
          </Link>
        </p>
      </motion.div>
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
