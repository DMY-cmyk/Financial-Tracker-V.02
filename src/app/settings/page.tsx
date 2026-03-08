'use client';

import { useStore } from '@/store';
import { t, useLocale } from '@/lib/i18n';
import { PageHeader } from '@/components/layout/PageHeader';
import { SettingsSection } from '@/components/settings/SettingsSection';
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Moon, Sun, Monitor, Globe, Trash2, FolderOpen, Download, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LANGUAGE_OPTIONS } from '@/lib/mock-data';

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

      {/* Appearance */}
      <SettingsSection
        title={t(locale, 'appearance')}
        description={locale === 'id' ? 'Sesuaikan tampilan aplikasi' : 'Customize how the app looks'}
      >
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
      </SettingsSection>

      {/* Language */}
      <SettingsSection
        title={t(locale, 'language')}
        description={locale === 'id' ? 'Pilih bahasa tampilan' : 'Choose display language'}
      >
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            {LANGUAGE_OPTIONS.map((opt) => (
              <button
                key={opt.code}
                onClick={() => setLocale(opt.code)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl border-2 p-4 text-left transition-colors',
                  locale === opt.code
                    ? 'border-primary bg-primary/5'
                    : 'border-transparent bg-muted/50 hover:bg-muted'
                )}
              >
                <Globe className="h-4 w-4 shrink-0" />
                <div>
                  <span className="text-sm font-medium">{opt.nativeLabel}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{opt.flag}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </SettingsSection>

      {/* Categories & Payment Methods */}
      <SettingsSection
        title={t(locale, 'categories')}
        description={locale === 'id' ? 'Kelola kategori dan metode pembayaran' : 'Manage categories and payment methods'}
      >
        <Link href="/settings/categories">
          <Button variant="outline" className="w-full gap-2">
            <FolderOpen className="h-4 w-4" />
            {locale === 'id' ? 'Kelola Kategori & Metode Pembayaran' : 'Manage Categories & Payment Methods'}
          </Button>
        </Link>
      </SettingsSection>

      {/* Data Management */}
      <SettingsSection
        title={t(locale, 'dataManagement')}
        description={locale === 'id' ? 'Ekspor, impor, atau hapus data' : 'Export, import, or clear your data'}
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Link href="/export">
              <Button variant="outline" className="w-full gap-2">
                <Download className="h-4 w-4" />
                {t(locale, 'exportData')}
              </Button>
            </Link>
            <Button variant="outline" className="w-full gap-2" disabled>
              <Upload className="h-4 w-4" />
              {t(locale, 'importData')}
            </Button>
          </div>

          <div className="border-t border-border pt-3">
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
      </SettingsSection>
    </div>
  );
}
