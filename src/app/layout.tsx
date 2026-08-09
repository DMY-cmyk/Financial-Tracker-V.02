import type { Metadata } from 'next';
import { Geist, Geist_Mono, Fraunces } from 'next/font/google';
import './globals.css';
import { StoreProvider } from '@/components/providers/StoreProvider';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { HtmlLangSync } from '@/components/providers/HtmlLangSync';
import { AppShell } from '@/components/layout/AppShell';
import { SkipLink } from '@/components/layout/SkipLink';
import { Toaster } from '@/components/ui/sonner';
import { EndOfMonthReminder } from '@/components/shared/EndOfMonthReminder';

const geistSans = Geist({
  variable: '--font-sans',
  subsets: ['latin'],
  display: 'swap',
});

const geistMono = Geist_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  display: 'swap',
});

const fraunces = Fraunces({
  variable: '--font-display',
  subsets: ['latin'],
  axes: ['opsz'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Financial Tracker',
    template: '%s | Financial Tracker',
  },
  description:
    'Modern personal finance tracking dashboard for Indonesian Rupiah budgeting with bilingual support.',
  keywords: ['finance', 'tracker', 'budget', 'IDR', 'personal finance', 'dashboard'],
  authors: [{ name: 'Financial Tracker' }],
  openGraph: {
    title: 'Financial Tracker',
    description: 'Modern personal finance tracking dashboard',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');var s=window.matchMedia('(prefers-color-scheme: dark)').matches;if(t==='dark'||(t==='system'&&s)||(!t&&s)){document.documentElement.classList.add('dark');}}catch(e){}})();`,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} font-sans antialiased`}
      >
        <StoreProvider>
          <SkipLink />
          <HtmlLangSync />
          <QueryProvider>
            <AppShell>{children}</AppShell>
            <EndOfMonthReminder />
            <Toaster position="top-right" duration={3000} />
          </QueryProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
