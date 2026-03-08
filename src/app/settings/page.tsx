'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '@/store';
import { t, useLocale } from '@/lib/i18n';
import { fadeInUp, staggerContainer, staggerItem } from '@/lib/motion';
import { PageHeader } from '@/components/layout/PageHeader';
import { SettingsSection } from '@/components/settings/SettingsSection';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ImportDialog } from '@/components/settings/ImportDialog';
import { Moon, Sun, Monitor, Globe, Trash2, FolderOpen, Download, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LANGUAGE_OPTIONS } from '@/lib/mock-data';
import { toast } from 'sonner';

export default function SettingsPage() {
  const theme = useStore((s) => s.ui.theme);
  const setTheme = useStore((s) => s.setTheme);
  const locale = useLocale();
  const setLocale = useStore((s) => s.setLocale);
  const clearAllData = useStore((s) => s.clearAllData);

  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const themes = [
    { value: 'light' as const, label: t(locale, 'light'), icon: Sun },
    { value: 'dark' as const, label: t(locale, 'dark'), icon: Moon },
    { value: 'system' as const, label: t(locale, 'system'), icon: Monitor },
  ];

  const handleClearData = () => {
    clearAllData();
    toast.success(t(locale, 'dataClearedToast'));
    setClearDialogOpen(false);
    window.location.reload();
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4 sm:space-y-6">
      <motion.div {...fadeInUp}>
        <PageHeader title={t(locale, 'settings')} />
      </motion.div>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="space-y-4 sm:space-y-6"
      >
        {/* Appearance */}
        <motion.div variants={staggerItem}>
          <SettingsSection
            title={t(locale, 'appearance')}
            description={
              locale === 'id' ? 'Sesuaikan tampilan aplikasi' : 'Customize how the app looks'
            }
          >
            <div
              className="grid grid-cols-3 gap-2 sm:gap-3"
              role="radiogroup"
              aria-label={t(locale, 'theme')}
            >
              {themes.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  role="radio"
                  aria-checked={theme === value}
                  onClick={() => setTheme(value)}
                  className={cn(
                    'flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-colors sm:p-4',
                    theme === value
                      ? 'border-primary bg-primary/5'
                      : 'bg-muted/50 hover:bg-muted border-transparent'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-xs font-medium">{label}</span>
                </button>
              ))}
            </div>
          </SettingsSection>
        </motion.div>

        {/* Language */}
        <motion.div variants={staggerItem}>
          <SettingsSection
            title={t(locale, 'language')}
            description={locale === 'id' ? 'Pilih bahasa tampilan' : 'Choose display language'}
          >
            <div className="space-y-2" role="radiogroup" aria-label={t(locale, 'language')}>
              {LANGUAGE_OPTIONS.map((opt) => (
                <button
                  key={opt.code}
                  role="radio"
                  aria-checked={locale === opt.code}
                  onClick={() => setLocale(opt.code)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl border-2 p-3 text-left transition-colors sm:p-4',
                    locale === opt.code
                      ? 'border-primary bg-primary/5'
                      : 'bg-muted/50 hover:bg-muted border-transparent'
                  )}
                >
                  <Globe className="h-4 w-4 shrink-0" />
                  <div>
                    <span className="text-sm font-medium">{opt.nativeLabel}</span>
                    <span className="text-muted-foreground ml-2 text-xs">{opt.flag}</span>
                  </div>
                </button>
              ))}
            </div>
          </SettingsSection>
        </motion.div>

        {/* Categories & Payment Methods */}
        <motion.div variants={staggerItem}>
          <SettingsSection
            title={t(locale, 'categories')}
            description={
              locale === 'id'
                ? 'Kelola kategori dan metode pembayaran'
                : 'Manage categories and payment methods'
            }
          >
            <Link href="/settings/categories">
              <Button variant="outline" className="w-full gap-2">
                <FolderOpen className="h-4 w-4" />
                {locale === 'id'
                  ? 'Kelola Kategori & Metode Pembayaran'
                  : 'Manage Categories & Payment Methods'}
              </Button>
            </Link>
          </SettingsSection>
        </motion.div>

        {/* Data Management */}
        <motion.div variants={staggerItem}>
          <SettingsSection
            title={t(locale, 'dataManagement')}
            description={
              locale === 'id'
                ? 'Ekspor, impor, atau hapus data'
                : 'Export, import, or clear your data'
            }
          >
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <Link href="/export">
                  <Button variant="outline" className="w-full gap-2">
                    <Download className="h-4 w-4" />
                    {t(locale, 'exportData')}
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => setImportDialogOpen(true)}
                >
                  <Upload className="h-4 w-4" />
                  {t(locale, 'importData')}
                </Button>
              </div>

              <div className="border-border border-t pt-3">
                <Button
                  variant="destructive"
                  className="w-full gap-2"
                  onClick={() => setClearDialogOpen(true)}
                >
                  <Trash2 className="h-4 w-4" />
                  {t(locale, 'clearData')}
                </Button>
              </div>
            </div>
          </SettingsSection>
        </motion.div>
      </motion.div>

      {/* Import dialog */}
      <ImportDialog open={importDialogOpen} onOpenChange={setImportDialogOpen} />

      {/* Clear data confirmation */}
      <ConfirmDialog
        open={clearDialogOpen}
        onOpenChange={setClearDialogOpen}
        title={t(locale, 'clearData')}
        description={t(locale, 'confirmDelete')}
        confirmLabel={t(locale, 'clear')}
        cancelLabel={t(locale, 'cancel')}
        onConfirm={handleClearData}
      />
    </div>
  );
}
