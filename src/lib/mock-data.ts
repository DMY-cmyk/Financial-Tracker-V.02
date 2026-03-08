// Sample constants and fallback data for pages

import { LanguageOption } from './types';

export const QUICK_ACTIONS = [
  {
    id: 'add-transaction',
    label: 'Add Transaction',
    description: 'Record income or expense',
    href: '/transactions/new',
    icon: 'plus',
  },
  {
    id: 'upload-receipt',
    label: 'Upload Receipt',
    description: 'Scan and extract data',
    href: '/upload',
    icon: 'upload',
  },
  {
    id: 'export-data',
    label: 'Export Data',
    description: 'Download as CSV or JSON',
    href: '/export',
    icon: 'download',
  },
] as const;

export const EMPTY_MESSAGES = {
  dashboard: {
    title: 'No data yet',
    description: 'Start by adding your first transaction to see your financial overview.',
  },
  transactions: {
    title: 'No transactions found',
    description: 'Try adjusting your filters or add a new transaction.',
  },
  upload: {
    title: 'No receipt uploaded',
    description: 'Upload a receipt image to extract transaction data automatically.',
  },
  export: {
    title: 'Nothing to export',
    description: 'Add some transactions first, then export your data.',
  },
} as const;

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'en', label: 'English', nativeLabel: 'English', flag: 'EN' },
  { code: 'id', label: 'Bahasa Indonesia', nativeLabel: 'Bahasa Indonesia', flag: 'ID' },
];

export const EXPORT_FORMATS = [
  { value: 'csv' as const, label: 'CSV', description: 'Spreadsheet compatible', available: true },
  { value: 'json' as const, label: 'JSON', description: 'Raw data format', available: true },
  { value: 'xlsx' as const, label: 'Excel', description: 'Formatted workbook', available: false },
  { value: 'pdf' as const, label: 'PDF', description: 'Print-ready report', available: false },
] as const;

export const UPLOAD_ACCEPTED_TYPES = 'image/png,image/jpeg,image/webp,image/heic';
export const UPLOAD_MAX_SIZE_MB = 10;
