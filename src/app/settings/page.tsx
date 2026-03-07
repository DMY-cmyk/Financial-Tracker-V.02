'use client';

import { useStore } from '@/store';
import { t, useLocale } from '@/lib/i18n';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { Moon, Sun, Monitor, Globe, Trash2, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const theme = useStore(s => s.ui.theme);
  const setTheme = useStore(s => s.setTheme);
  const locale = useLocale();
  const setLocale = useStore(s => s.setLocale);
  const clearAllData = useStore(s => s.clearAllData);

  const themes = [
    { value: 'light' as const, label: t(locale, 'light'), icon: Sun },
    { value: 'dark' as const, label: t(locale, 'dark'), icon: Moon },
    { value: 'system' as const, label: t(locale, 'system'), icon: Monitor },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title={t(locale, 'settings')} />

      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold">{t(locale, 'theme')}</h3>
        <div className="grid grid-cols-3 gap-3">
          {themes.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className={cn(
                'flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-colors',
                theme === value
                  ? 'border-primary bg-primary/5'
                  : 'border-transparent bg-muted/50 hover:bg-muted'
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold">{t(locale, 'language')}</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: 'en' as const, label: 'English', flag: 'EN' },
            { value: 'id' as const, label: 'Bahasa Indonesia', flag: 'ID' },
          ].map(({ value, label, flag }) => (
            <button
              key={value}
              onClick={() => setLocale(value)}
              className={cn(
                'flex items-center gap-3 rounded-xl border-2 p-4 transition-colors',
                locale === value
                  ? 'border-primary bg-primary/5'
                  : 'border-transparent bg-muted/50 hover:bg-muted'
              )}
            >
              <Globe className="h-4 w-4" />
              <div className="text-left">
                <span className="text-sm font-medium">{label}</span>
                <span className="ml-2 text-xs text-muted-foreground">{flag}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold">{t(locale, 'categories')}</h3>
        <Link href="/settings/categories">
          <Button variant="outline" className="w-full gap-2">
            <FolderOpen className="h-4 w-4" />
            Manage Categories & Payment Methods
          </Button>
        </Link>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold">Data</h3>
        <Button
          variant="destructive"
          className="w-full gap-2"
          onClick={() => {
            if (confirm(t(locale, 'confirmDelete'))) {
              clearAllData();
              window.location.reload();
            }
          }}
        >
          <Trash2 className="h-4 w-4" />
          {t(locale, 'clearData')}
        </Button>
      </div>
    </div>
  );
}
