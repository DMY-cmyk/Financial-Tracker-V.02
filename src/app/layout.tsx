import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { StoreProvider } from '@/components/providers/StoreProvider';
import { AppShell } from '@/components/layout/AppShell';
import { Toaster } from '@/components/ui/sonner';

const jakarta = Plus_Jakarta_Sans({
  variable: '--font-sans',
  subsets: ['latin'],
  display: 'swap',
});

const jetbrains = JetBrains_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
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
      <body className={`${jakarta.variable} ${jetbrains.variable} font-sans antialiased`}>
        <a
          href="#main-content"
          className="focus:bg-primary focus:text-primary-foreground sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-lg focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-lg"
        >
          Skip to main content
        </a>
        <StoreProvider>
          <AppShell>{children}</AppShell>
          <Toaster position="top-right" duration={3000} />
        </StoreProvider>
      </body>
    </html>
  );
}
