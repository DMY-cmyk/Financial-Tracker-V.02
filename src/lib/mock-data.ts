// Sample constants and fallback data for pages

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
