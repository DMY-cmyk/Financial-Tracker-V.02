'use client';

import { createContext, useContext } from 'react';

export type Locale = 'en' | 'id';

type TranslationKeys = {
  // Navigation
  dashboard: string;
  transactions: string;
  upload: string;
  export: string;
  settings: string;
  categories: string;

  // Dashboard
  netBalance: string;
  totalIncome: string;
  totalExpense: string;
  income: string;
  expense: string;
  budget: string;
  spent: string;
  remaining: string;
  savingsRate: string;
  cashFlow: string;
  categoryBreakdown: string;
  budgetProgress: string;
  paymentMethods: string;
  billsChecklist: string;
  savingsGoals: string;
  recentTransactions: string;
  viewAll: string;
  quickActions: string;

  // Transactions
  addTransaction: string;
  editTransaction: string;
  deleteTransaction: string;
  description: string;
  category: string;
  amount: string;
  date: string;
  paymentMethod: string;
  notes: string;

  // Common actions
  save: string;
  cancel: string;
  search: string;
  filter: string;
  allMonths: string;
  viewEntireYear: string;
  yearOverYear: string;
  vsLastYear: string;
  ok: string;
  back: string;
  clear: string;
  confirm: string;

  // States
  noData: string;
  loading: string;
  success: string;
  error: string;

  // Bills
  paid: string;
  unpaid: string;
  overdue: string;
  dueDate: string;

  // Savings
  target: string;
  saved: string;
  of: string;

  // Filters
  all: string;
  thisMonth: string;

  // Settings
  language: string;
  theme: string;
  light: string;
  dark: string;
  system: string;
  appearance: string;
  dataManagement: string;

  // Export
  exportData: string;
  importData: string;
  clearData: string;
  confirmDelete: string;
  exportFormat: string;
  exportScope: string;
  exportOptions: string;
  exportPreview: string;
  includeSummary: string;
  groupByDate: string;
  downloadReady: string;

  // Upload & OCR
  uploadReceipt: string;
  extractData: string;
  extractedData: string;
  processing: string;
  uploadImage: string;
  dropHere: string;
  orClickBrowse: string;
  extractText: string;
  saveTransaction: string;
  confidence: string;
  reviewExtracted: string;

  // Budget
  overBudget: string;
  onTrack: string;
  budgetWarning: string;
  categoriesOverBudget: string;
  categoriesAtLimit: string;
  viewBudget: string;
  categoryOverBudget: string;

  // Validation
  required: string;
  invalidAmount: string;
  selectCategory: string;

  // Import
  importFile: string;
  importSuccess: string;
  importError: string;
  selectFile: string;
  supportedFormats: string;
  transactionsFound: string;
  rowsSkipped: string;
  importNow: string;
  tryAgain: string;

  // Navigation
  menu: string;
  newTransaction: string;
  collapse: string;

  // Toasts
  transactionSaved: string;
  transactionDeleted: string;
  undo: string;
  itemRestored: string;
  exportSuccess: string;
  dataClearedToast: string;

  // Pages
  pageNotFound: string;
  somethingWentWrong: string;
  refreshPage: string;
  backToDashboard: string;

  // Misc
  type: string;

  // Bulk Import
  bulkImport: string;
  bulkImportDesc: string;
  receiptScan: string;
  downloadTemplate: string;
  uploadExcel: string;
  uploadImageBulk: string;
  parsingFile: string;
  validatingData: string;
  importingData: string;
  previewTransactions: string;
  validRows: string;
  invalidRows: string;
  importAll: string;
  importValid: string;
  removeInvalid: string;
  importComplete: string;
  transactionsCreated: string;
  transactionsFailed: string;
  duplicatesSkipped: string;
  invalidHeaders: string;
  emptyFile: string;
  tooManyRows: string;
  noTransactionsInFile: string;
  reviewBeforeImport: string;
  importMore: string;
  viewTransactions: string;
  dropExcelOrImage: string;
  supportedBulkFormats: string;
  row: string;
  totalIncomeLabel: string;
  totalExpenseLabel: string;
  autoDescription: string;
  net: string;
  noResults: string;
  clearFilters: string;
  and: string;
  more: string;
  delete: string;
  duplicate: string;
  edit: string;
  editBudget: string;
  exportFiltered: string;
  dueSoon: string;
  add: string;
  name: string;
  transactionType: string;
  previousYear: string;
  nextYear: string;
  clearFile: string;
  receiptPreview: string;
  uploadAnother: string;
  failedExtract: string;
  noTransactionsMatch: string;
  addFirstTransaction: string;
  backToTransactions: string;
  recordTransaction: string;
  transactionCount: string;
  expenseCategories: string;
  incomeSources: string;
  addCategory: string;
  categoryName: string;
  methodName: string;
  transactionUpdated: string;
  transactionAdded: string;
  failedSave: string;
  exportFailed: string;
  fixExtractedErrors: string;
  savedFromReceipt: string;
  appearanceDesc: string;
  languageDesc: string;
  categoriesDesc: string;
  manageCategoriesMethods: string;
  dataManagementDesc: string;

  // Bills page
  bills: string;
  addBill: string;
  editBill: string;
  billName: string;
  billAmount: string;
  billDueDate: string;
  billSaved: string;
  billDeleted: string;
  noBills: string;
  deleteBill: string;
  recurringBill: string;
  generateBills: string;
  generatedBills: string;
  markAsRecurring: string;

  // Cascade guards
  cannotDeleteInUse: string;

  // Export custom range
  customRange: string;
  selectDateRange: string;
  startDate: string;
  endDate: string;

  // Budget page
  budgetPage: string;
  totalBudget: string;
  totalSpent: string;
  setBudget: string;
  unbudgeted: string;
  budgetUpdated: string;
  noBudgetCategories: string;
  budgetOverview: string;
  percentUsed: string;

  // Savings page
  savingsPage: string;
  addSavingsGoal: string;
  editSavingsGoal: string;
  goalName: string;
  targetAmount: string;
  savedAmount: string;
  goalColor: string;
  goalSaved: string;
  goalDeleted: string;
  noSavingsGoals: string;
  deleteSavingsGoal: string;
  updateSaved: string;

  // Recurring transactions
  recurringTransactions: string;
  addRecurring: string;
  editRecurring: string;
  deleteRecurring: string;
  recurringDeleted: string;
  recurringAdded: string;
  recurringUpdated: string;
  frequency: string;
  daily: string;
  weekly: string;
  monthly: string;
  yearly: string;
  nextDueDate: string;
  active: string;
  inactive: string;
  generateNow: string;
  generated: string;
  noRecurring: string;
  indefinite: string;

  // Reports
  reports: string;
  financialTrends: string;
  incomeVsExpense: string;
  monthlyBreakdown: string;
  last6Months: string;
  last12Months: string;
  avgSavingsRate: string;
  month: string;
  annualReport: string;
  topCategories: string;
  totalTransactions: string;

  // Language switcher
  switchLanguage: string;

  // Upload history
  uploadHistory: string;
  noUploadHistory: string;
  uploadDate: string;
  extracted: string;

  // Category icons
  selectIcon: string;

  // Reorder
  reorderCategories: string;

  // Folder navigation
  browseByYear: string;
  selectMonth: string;
  folderTransactions: string;
  noTransactionsYet: string;
  currentYear: string;
  currentMonth: string;
  allYears: string;
  noDataYet: string;

  // Home screen
  home: string;
  welcomeBack: string;
  welcomeMorning: string;
  welcomeAfternoon: string;
  welcomeEvening: string;
  homeSubtitle: string;
  viewDashboard: string;
  manageTransactions: string;
  manageBudget: string;
  manageBills: string;
  manageRecurring: string;
  manageSavings: string;
  viewReports: string;
  uploadReceipts: string;
  appSettings: string;

  // Bulk delete
  bulkDeleteTitle: string;
  bulkDeleteDescription: string;
  bulkDeleteSuccess: string;
  selected: string;
  selectAll: string;
  deselectAll: string;

  // Confirmation
  deleteConfirmDescription: string;

  // Report download keys
  downloadReport: string;
  reportTypeMonthly: string;
  reportTypeYearly: string;
  generatingReport: string;
  reportDownloaded: string;
  reportError: string;
  annualSummary: string;
  transactionDetail: string;
  accountBalances: string;

  // Load-more transaction keys
  loadMore: string;
  allLoaded: string;
  showing: string;

  // Sidebar group keys
  groupFinance: string;
  groupTools: string;

  // Beginning Balance
  beginningBalance: string;
  beginningBalanceHelp: string;
  existingDebt: string;
  existingDebtHelp: string;
  closing: string;

  // Sort order
  newest: string;
  oldest: string;

  // End-of-month reminder
  endOfMonthTitle: string;
  endOfMonthBody: string;
  goToTransactions: string;
  dismiss: string;

  // Advanced Filters
  advancedFilters: string;
  amountRange: string;
  minAmount: string;
  maxAmount: string;
  multiCategory: string;
  dateRange: string;
  dateFrom: string;
  dateTo: string;
  includeNotes: string;
  filterPresets: string;
  savePreset: string;
  presetName: string;
  clearAllFilters: string;
  activeFilters: string;
  dateRangeOverridesMonth: string;
  dateRangeBothRequired: string;
  amountRangeError: string;
  deletePreset: string;

  // Auth
  signIn: string;
  createAccount: string;
  signOut: string;
  emailLabel: string;
  passwordLabel: string;
  fullName: string;
  invalidCredentials: string;
  sessionExpired: string;
  loginRequired: string;

  // Budget templates
  saveAsTemplate: string;
  applyTemplate: string;
  smartSuggest: string;
  templateName: string;
  budgetTemplates: string;
  applyConfirm: string;
  templateApplied: string;
  suggestionsBasedOn: string;
  noTemplates: string;
  applySuggestions: string;
  templateSaved: string;
  deleteTemplateConfirm: string;
  notEnoughData: string;
  noExpenseCategories: string;
  savingCategories: string;
  noBudgetsSet: string;
  nCategoriesLabel: string;
  failedToUpdateCategories: string;

  // Forecast
  forecast: string;
  cashFlowForecast: string;
  expectedThisMonth: string;
  actualSoFar: string;
  projected: string;
  projectedIncome: string;
  projectedExpense: string;
  projectedNet: string;
  forecastBasis: string;
  noRecurringForForecast: string;
  forecastMonths: string;
  total: string;
  today: string;

  // Net Worth
  netWorth: string; // widget title + nav label
  netWorthPage: string; // PageHeader title (same value, different context)
  assets: string;
  liabilities: string;
  totalAssets: string;
  totalLiabilities: string;
  noLiabilities: string;
  addLiability: string;
  editLiability: string;
  deleteLiability: string;
  liabilityName: string;
  liabilityCategory: string;
  loanType: string;
  creditCardType: string;
  otherType: string;
  recordSnapshot: string;
  netWorthHistory: string;
  noSnapshotsYet: string;
  liabilityDeleted: string;
  liabilitySaved: string;
  snapshotRecorded: string;
};

const translations: Record<Locale, TranslationKeys> = {
  en: {
    dashboard: 'Dashboard',
    transactions: 'Transactions',
    upload: 'Upload',
    export: 'Export',
    settings: 'Settings',
    categories: 'Categories',
    netBalance: 'Net Balance',
    totalIncome: 'Total Income',
    totalExpense: 'Total Expense',
    income: 'Income',
    expense: 'Expense',
    budget: 'Budget',
    spent: 'Spent',
    remaining: 'Remaining',
    savingsRate: 'Savings Rate',
    cashFlow: 'Cash Flow',
    categoryBreakdown: 'Category Breakdown',
    budgetProgress: 'Budget Progress',
    paymentMethods: 'Payment Methods',
    billsChecklist: 'Bills Checklist',
    savingsGoals: 'Savings Goals',
    recentTransactions: 'Recent Transactions',
    viewAll: 'View all',
    quickActions: 'Quick Actions',
    addTransaction: 'Add Transaction',
    editTransaction: 'Edit Transaction',
    deleteTransaction: 'Delete Transaction',
    description: 'Description',
    category: 'Category',
    amount: 'Amount',
    date: 'Date',
    paymentMethod: 'Payment Method',
    notes: 'Notes',
    save: 'Save',
    cancel: 'Cancel',
    search: 'Search',
    filter: 'Filter',
    allMonths: 'All Months',
    viewEntireYear: 'View Year',
    yearOverYear: 'Year-over-Year',
    vsLastYear: 'vs last year',
    ok: 'OK',
    back: 'Back',
    clear: 'Clear',
    confirm: 'Confirm',
    noData: 'No data yet',
    loading: 'Loading...',
    success: 'Success',
    error: 'Something went wrong',
    paid: 'Paid',
    unpaid: 'Unpaid',
    overdue: 'Overdue',
    dueDate: 'Due Date',
    target: 'Target',
    saved: 'Saved',
    of: 'of',
    all: 'All',
    thisMonth: 'This Month',
    language: 'Language',
    theme: 'Theme',
    light: 'Light',
    dark: 'Dark',
    system: 'System',
    appearance: 'Appearance',
    dataManagement: 'Data Management',
    exportData: 'Export Data',
    importData: 'Import Data',
    clearData: 'Clear All Data',
    confirmDelete: 'Are you sure? This will permanently delete all your data.',
    exportFormat: 'Format',
    exportScope: 'Scope',
    exportOptions: 'Options',
    exportPreview: 'Preview',
    includeSummary: 'Include summary totals',
    groupByDate: 'Group by date',
    downloadReady: 'Ready to download',
    uploadReceipt: 'Upload Receipt',
    extractData: 'Extract Data',
    extractedData: 'Extracted Data',
    processing: 'Processing...',
    uploadImage: 'Upload Image',
    dropHere: 'Drop receipt image here',
    orClickBrowse: 'or click to browse',
    extractText: 'Extract Text',
    saveTransaction: 'Save Transaction',
    confidence: 'Confidence',
    reviewExtracted: 'Review extracted data before saving',
    overBudget: 'Over Budget',
    onTrack: 'On Track',
    budgetWarning: 'approaching budget limit',
    categoriesOverBudget: '{n} categories over budget this month',
    categoriesAtLimit: '{n} categories approaching budget limit',
    viewBudget: 'View Budget',
    categoryOverBudget: '{name} is over budget this month',
    required: 'This field is required',
    invalidAmount: 'Enter a valid amount',
    selectCategory: 'Select a category',

    importFile: 'Import File',
    importSuccess: 'Import successful',
    importError: 'Import failed',
    selectFile: 'Choose or drag a file',
    supportedFormats: '.json, .csv',
    transactionsFound: 'transactions found',
    rowsSkipped: 'rows skipped',
    importNow: 'Import Now',
    tryAgain: 'Try Again',

    menu: 'Menu',
    newTransaction: 'New Transaction',
    collapse: 'Collapse',

    transactionSaved: 'Transaction saved',
    transactionDeleted: 'Transaction deleted',
    undo: 'Undo',
    itemRestored: 'Item restored',
    exportSuccess: 'Export successful',
    dataClearedToast: 'All data cleared',

    pageNotFound: 'Page Not Found',
    somethingWentWrong: 'Something went wrong',
    refreshPage: 'Refresh Page',
    backToDashboard: 'Back to Dashboard',

    type: 'Type',

    // Bulk Import
    bulkImport: 'Bulk Import',
    bulkImportDesc: 'Import multiple transactions from Excel or image',
    receiptScan: 'Receipt Scan',
    downloadTemplate: 'Download Template',
    uploadExcel: 'Upload Excel File',
    uploadImageBulk: 'Upload Image',
    parsingFile: 'Parsing file...',
    validatingData: 'Validating data...',
    importingData: 'Importing transactions...',
    previewTransactions: 'Preview Transactions',
    validRows: 'valid',
    invalidRows: 'invalid',
    importAll: 'Import All',
    importValid: 'Import Valid Rows',
    removeInvalid: 'Remove Invalid',
    importComplete: 'Import Complete',
    transactionsCreated: 'transactions created',
    transactionsFailed: 'transactions failed',
    duplicatesSkipped: 'duplicates skipped',
    invalidHeaders: 'Invalid file headers. Please use the template.',
    emptyFile: 'No data found in file',
    tooManyRows: 'Too many rows. Maximum 500 per import.',
    noTransactionsInFile: 'No valid transactions found in file',
    reviewBeforeImport: 'Review transactions before importing',
    importMore: 'Import More',
    viewTransactions: 'View Transactions',
    dropExcelOrImage: 'Drop Excel file or image here',
    supportedBulkFormats: '.xlsx, .png, .jpg, .jpeg',
    row: 'Row',
    totalIncomeLabel: 'Total Income',
    totalExpenseLabel: 'Total Expense',
    autoDescription: 'Bulk import',
    net: 'Net',
    noResults: 'No results found',
    clearFilters: 'Clear Filters',
    and: 'and',
    more: 'more',
    delete: 'Delete',
    duplicate: 'Duplicate',
    edit: 'Edit',
    editBudget: 'Edit Budget',
    exportFiltered: 'Export',
    dueSoon: 'Due soon',
    add: 'Add',
    name: 'Name',
    transactionType: 'Transaction type',
    previousYear: 'Previous year',
    nextYear: 'Next year',
    clearFile: 'Clear file',
    receiptPreview: 'Receipt preview',
    uploadAnother: 'Upload Another',
    failedExtract: 'Failed to extract text',
    noTransactionsMatch: 'No transactions match your filters',
    addFirstTransaction: 'Start by adding your first transaction.',
    backToTransactions: 'Back to Transactions',
    recordTransaction: 'Record a new income or expense transaction',
    transactionCount: 'transactions this month',
    expenseCategories: 'Expense Categories',
    incomeSources: 'Income Sources',
    addCategory: 'Add Category',
    categoryName: 'Category name',
    methodName: 'Method name',
    transactionUpdated: 'Transaction updated',
    transactionAdded: 'Transaction added',
    failedSave: 'Failed to save',
    exportFailed: 'Export failed',
    fixExtractedErrors: 'Please fix extracted data errors',
    savedFromReceipt: 'Transaction saved from receipt',
    appearanceDesc: 'Customize how the app looks',
    languageDesc: 'Choose display language',
    categoriesDesc: 'Manage categories and payment methods',
    manageCategoriesMethods: 'Manage Categories & Payment Methods',
    dataManagementDesc: 'Export, import, or clear your data',

    // Bills page
    bills: 'Bills',
    addBill: 'Add Bill',
    editBill: 'Edit Bill',
    billName: 'Bill Name',
    billAmount: 'Amount',
    billDueDate: 'Due Date (day)',
    billSaved: 'Bill saved',
    billDeleted: 'Bill deleted',
    noBills: 'No bills for this month',
    deleteBill: 'Delete Bill',
    recurringBill: 'Recurring',
    generateBills: 'Generate from recurring',
    generatedBills: 'Generated {count} recurring bills',
    markAsRecurring: 'Mark as recurring',

    // Cascade guards
    cannotDeleteInUse: 'Cannot delete — still in use by transactions',

    // Export custom range
    customRange: 'Custom Range',
    selectDateRange: 'Select date range',
    startDate: 'Start Date',
    endDate: 'End Date',

    // Budget page
    budgetPage: 'Budget',
    totalBudget: 'Total Budget',
    totalSpent: 'Total Spent',
    setBudget: 'Set Budget',
    unbudgeted: 'Unbudgeted',
    budgetUpdated: 'Budget updated',
    noBudgetCategories: 'No budget set for any category',
    budgetOverview: 'Budget Overview',
    percentUsed: 'used',

    // Budget templates
    saveAsTemplate: 'Save as Template',
    applyTemplate: 'Apply Template',
    smartSuggest: 'Smart Suggest',
    templateName: 'Template Name',
    budgetTemplates: 'Budget Templates',
    applyConfirm: 'This will overwrite all current budget amounts. Continue?',
    templateApplied: '{n} budgets updated',
    suggestionsBasedOn: 'Based on last {n} months',
    noTemplates: 'No templates saved yet',
    applySuggestions: 'Apply Suggestions',
    templateSaved: 'Template saved',
    deleteTemplateConfirm: 'Delete "{name}"? This cannot be undone.',
    notEnoughData: 'Not enough data',
    noExpenseCategories: 'No expense categories found',
    savingCategories: 'Saving {n} categories with budgets',
    noBudgetsSet: 'No categories currently have budgets set',
    nCategoriesLabel: '{n} categories',
    failedToUpdateCategories: 'Failed to update {n} categories',

    // Savings page
    savingsPage: 'Savings Goals',
    addSavingsGoal: 'Add Savings Goal',
    editSavingsGoal: 'Edit Savings Goal',
    goalName: 'Goal Name',
    targetAmount: 'Target Amount',
    savedAmount: 'Saved Amount',
    goalColor: 'Color',
    goalSaved: 'Goal saved',
    goalDeleted: 'Goal deleted',
    noSavingsGoals: 'No savings goals yet',
    deleteSavingsGoal: 'Delete Savings Goal',
    updateSaved: 'Update Saved',
    recurringTransactions: 'Recurring Transactions',
    addRecurring: 'Add Recurring',
    editRecurring: 'Edit Recurring',
    deleteRecurring: 'Delete Recurring',
    recurringDeleted: 'Recurring transaction deleted',
    recurringAdded: 'Recurring transaction added',
    recurringUpdated: 'Recurring transaction updated',
    frequency: 'Frequency',
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
    yearly: 'Yearly',
    nextDueDate: 'Next Due',
    active: 'Active',
    inactive: 'Inactive',
    generateNow: 'Generate Now',
    generated: 'Generated',
    noRecurring: 'No recurring transactions yet',
    indefinite: 'Indefinite',
    reports: 'Reports',
    financialTrends: 'Financial trends across months',
    incomeVsExpense: 'Income vs Expense',
    monthlyBreakdown: 'Monthly Breakdown',
    last6Months: '6 months',
    last12Months: '12 months',
    avgSavingsRate: 'Savings Rate',
    month: 'Month',
    annualReport: 'Annual Report',
    topCategories: 'Top Expense Categories',
    totalTransactions: 'Transactions',
    switchLanguage: 'Switch Language',
    uploadHistory: 'Upload History',
    noUploadHistory: 'No uploads yet',
    uploadDate: 'Upload Date',
    extracted: 'Extracted',
    selectIcon: 'Select Icon',
    reorderCategories: 'Reorder Categories',
    browseByYear: 'Browse by Year',
    selectMonth: 'Select Month',
    folderTransactions: 'transactions',
    noTransactionsYet: 'No transactions yet',
    currentYear: 'Current Year',
    currentMonth: 'Current Month',
    allYears: 'All Years',
    noDataYet: 'No data',

    // Home screen
    home: 'Home',
    welcomeBack: 'Welcome back',
    welcomeMorning: 'Good morning',
    welcomeAfternoon: 'Good afternoon',
    welcomeEvening: 'Good evening',
    homeSubtitle: 'What would you like to do today?',
    viewDashboard: 'View your financial overview',
    manageTransactions: 'Record and manage transactions',
    manageBudget: 'Set and track spending limits',
    manageBills: 'Track upcoming bills',
    manageRecurring: 'Manage recurring transactions',
    manageSavings: 'Track savings progress',
    viewReports: 'Analyze financial trends',
    uploadReceipts: 'Scan and import receipts',
    appSettings: 'Customize your experience',

    // Bulk delete
    bulkDeleteTitle: 'Delete Selected Transactions',
    bulkDeleteDescription:
      '{count} transactions will be permanently deleted. This action cannot be undone.',
    bulkDeleteSuccess: 'Transactions deleted',
    selected: 'selected',
    selectAll: 'Select All',
    deselectAll: 'Deselect All',

    // Confirmation
    deleteConfirmDescription: 'This will be permanently deleted. This action cannot be undone.',

    // Report download keys
    downloadReport: 'Download Report',
    reportTypeMonthly: 'Monthly',
    reportTypeYearly: 'Yearly',
    generatingReport: 'Generating...',
    reportDownloaded: 'Report downloaded',
    reportError: 'Failed to generate report',
    annualSummary: 'Annual Summary',
    transactionDetail: 'Transaction Detail',
    accountBalances: 'Account Balances',

    // Load-more transaction keys
    loadMore: 'Load more',
    allLoaded: 'All loaded',
    showing: 'Showing',

    // Sidebar group keys
    groupFinance: 'Finance',
    groupTools: 'Tools',

    // Beginning Balance
    beginningBalance: 'Beginning Balance',
    beginningBalanceHelp: 'The amount already in this account before you started tracking.',
    existingDebt: 'Existing Debt',
    existingDebtHelp: 'Enter how much you already owe on this card before you started tracking.',
    closing: 'Closing',

    // Sort order
    newest: 'Newest',
    oldest: 'Oldest',

    // End-of-month reminder
    endOfMonthTitle: 'End of Month Reminder',
    endOfMonthBody:
      "Today is the last day of the month. Make sure you've recorded all transactions before midnight so next month's opening balance is accurate.",
    goToTransactions: 'Go to Transactions',
    dismiss: 'Dismiss',

    // Advanced Filters
    advancedFilters: 'Advanced Filters',
    amountRange: 'Amount Range',
    minAmount: 'Minimum',
    maxAmount: 'Maximum',
    multiCategory: 'Categories',
    dateRange: 'Date Range',
    dateFrom: 'From',
    dateTo: 'To',
    includeNotes: 'Include notes in search',
    filterPresets: 'Saved Filters',
    savePreset: 'Save current filters',
    presetName: 'Preset name',
    clearAllFilters: 'Clear All',
    activeFilters: 'Filters ({n})',
    dateRangeOverridesMonth: 'Overrides month selector',
    dateRangeBothRequired: 'Both date fields are required',
    amountRangeError: 'Minimum must be ≤ maximum',
    deletePreset: 'Delete preset {name}',

    // Auth
    signIn: 'Sign In',
    createAccount: 'Create Account',
    signOut: 'Sign Out',
    emailLabel: 'Email',
    passwordLabel: 'Password',
    fullName: 'Full Name',
    invalidCredentials: 'Invalid email or password',
    sessionExpired: 'Your session has expired. Please sign in again.',
    // Forecast
    forecast: 'Forecast',
    cashFlowForecast: 'Cash Flow Forecast',
    expectedThisMonth: 'Expected This Month',
    actualSoFar: 'Actual so far',
    projected: 'Projected',
    projectedIncome: 'Projected Income',
    projectedExpense: 'Projected Expense',
    projectedNet: 'Projected Net',
    forecastBasis: 'Based on recurring transactions only',
    noRecurringForForecast: 'No recurring transactions to project',
    forecastMonths: '{n} month forecast',
    total: 'Total',
    today: 'Today',

    loginRequired: 'Please sign in to continue',

    netWorth: 'Net Worth',
    netWorthPage: 'Net Worth',
    assets: 'Assets',
    liabilities: 'Liabilities',
    totalAssets: 'Total Assets',
    totalLiabilities: 'Total Liabilities',
    noLiabilities: 'No liabilities added yet',
    addLiability: 'Add Liability',
    editLiability: 'Edit Liability',
    deleteLiability: 'Delete Liability',
    liabilityName: 'Liability Name',
    liabilityCategory: 'Category',
    loanType: 'Loan',
    creditCardType: 'Credit Card Debt',
    otherType: 'Other',
    recordSnapshot: 'Re-record snapshot',
    netWorthHistory: 'Net Worth History',
    noSnapshotsYet: 'Visit this page monthly to build your net worth history.',
    liabilityDeleted: 'Liability deleted',
    liabilitySaved: 'Liability saved',
    snapshotRecorded: 'Snapshot recorded',
  },
  id: {
    dashboard: 'Dasbor',
    transactions: 'Transaksi',
    upload: 'Unggah',
    export: 'Ekspor',
    settings: 'Pengaturan',
    categories: 'Kategori',
    netBalance: 'Saldo Bersih',
    totalIncome: 'Total Pemasukan',
    totalExpense: 'Total Pengeluaran',
    income: 'Pemasukan',
    expense: 'Pengeluaran',
    budget: 'Anggaran',
    spent: 'Terpakai',
    remaining: 'Tersisa',
    savingsRate: 'Tingkat Tabungan',
    cashFlow: 'Arus Kas',
    categoryBreakdown: 'Rincian Kategori',
    budgetProgress: 'Progres Anggaran',
    paymentMethods: 'Metode Pembayaran',
    billsChecklist: 'Daftar Tagihan',
    savingsGoals: 'Target Tabungan',
    recentTransactions: 'Transaksi Terbaru',
    viewAll: 'Lihat semua',
    quickActions: 'Aksi Cepat',
    addTransaction: 'Tambah Transaksi',
    editTransaction: 'Edit Transaksi',
    deleteTransaction: 'Hapus Transaksi',
    description: 'Deskripsi',
    category: 'Kategori',
    amount: 'Jumlah',
    date: 'Tanggal',
    paymentMethod: 'Metode Pembayaran',
    notes: 'Catatan',
    save: 'Simpan',
    cancel: 'Batal',
    search: 'Cari',
    filter: 'Filter',
    allMonths: 'Semua Bulan',
    viewEntireYear: 'Lihat Tahun',
    yearOverYear: 'Tahun ke Tahun',
    vsLastYear: 'vs tahun lalu',
    ok: 'OK',
    back: 'Kembali',
    clear: 'Hapus',
    confirm: 'Konfirmasi',
    noData: 'Belum ada data',
    loading: 'Memuat...',
    success: 'Berhasil',
    error: 'Terjadi kesalahan',
    paid: 'Lunas',
    unpaid: 'Belum Lunas',
    overdue: 'Terlambat',
    dueDate: 'Jatuh Tempo',
    target: 'Target',
    saved: 'Tersimpan',
    of: 'dari',
    all: 'Semua',
    thisMonth: 'Bulan Ini',
    language: 'Bahasa',
    theme: 'Tema',
    light: 'Terang',
    dark: 'Gelap',
    system: 'Sistem',
    appearance: 'Tampilan',
    dataManagement: 'Manajemen Data',
    exportData: 'Ekspor Data',
    importData: 'Impor Data',
    clearData: 'Hapus Semua Data',
    confirmDelete: 'Yakin? Semua data akan dihapus secara permanen.',
    exportFormat: 'Format',
    exportScope: 'Cakupan',
    exportOptions: 'Opsi',
    exportPreview: 'Pratinjau',
    includeSummary: 'Sertakan total ringkasan',
    groupByDate: 'Kelompokkan berdasarkan tanggal',
    downloadReady: 'Siap diunduh',
    uploadReceipt: 'Unggah Struk',
    extractData: 'Ekstrak Data',
    extractedData: 'Data Terekstrak',
    processing: 'Memproses...',
    uploadImage: 'Unggah Gambar',
    dropHere: 'Letakkan gambar struk di sini',
    orClickBrowse: 'atau klik untuk pilih file',
    extractText: 'Ekstrak Teks',
    saveTransaction: 'Simpan Transaksi',
    confidence: 'Kepercayaan',
    reviewExtracted: 'Periksa data terekstrak sebelum menyimpan',
    overBudget: 'Melebihi Anggaran',
    onTrack: 'Sesuai',
    budgetWarning: 'mendekati batas anggaran',
    categoriesOverBudget: '{n} kategori melebihi anggaran bulan ini',
    categoriesAtLimit: '{n} kategori mendekati batas anggaran',
    viewBudget: 'Lihat Anggaran',
    categoryOverBudget: '{name} melebihi anggaran bulan ini',
    required: 'Kolom ini wajib diisi',
    invalidAmount: 'Masukkan jumlah yang valid',
    selectCategory: 'Pilih kategori',

    importFile: 'Impor File',
    importSuccess: 'Impor berhasil',
    importError: 'Impor gagal',
    selectFile: 'Pilih atau seret file',
    supportedFormats: '.json, .csv',
    transactionsFound: 'transaksi ditemukan',
    rowsSkipped: 'baris dilewati',
    importNow: 'Impor Sekarang',
    tryAgain: 'Coba Lagi',

    menu: 'Menu',
    newTransaction: 'Transaksi Baru',
    collapse: 'Perkecil',

    transactionSaved: 'Transaksi disimpan',
    transactionDeleted: 'Transaksi dihapus',
    undo: 'Batalkan',
    itemRestored: 'Item dipulihkan',
    exportSuccess: 'Ekspor berhasil',
    dataClearedToast: 'Semua data dihapus',

    pageNotFound: 'Halaman Tidak Ditemukan',
    somethingWentWrong: 'Terjadi Kesalahan',
    refreshPage: 'Muat Ulang',
    backToDashboard: 'Kembali ke Dasbor',

    type: 'Tipe',

    // Bulk Import
    bulkImport: 'Impor Massal',
    bulkImportDesc: 'Impor banyak transaksi dari Excel atau gambar',
    receiptScan: 'Scan Struk',
    downloadTemplate: 'Unduh Template',
    uploadExcel: 'Unggah File Excel',
    uploadImageBulk: 'Unggah Gambar',
    parsingFile: 'Membaca file...',
    validatingData: 'Memvalidasi data...',
    importingData: 'Mengimpor transaksi...',
    previewTransactions: 'Pratinjau Transaksi',
    validRows: 'valid',
    invalidRows: 'tidak valid',
    importAll: 'Impor Semua',
    importValid: 'Impor Baris Valid',
    removeInvalid: 'Hapus Tidak Valid',
    importComplete: 'Impor Selesai',
    transactionsCreated: 'transaksi dibuat',
    transactionsFailed: 'transaksi gagal',
    duplicatesSkipped: 'duplikat dilewati',
    invalidHeaders: 'Header file tidak valid. Gunakan template yang disediakan.',
    emptyFile: 'Tidak ada data dalam file',
    tooManyRows: 'Terlalu banyak baris. Maksimal 500 per impor.',
    noTransactionsInFile: 'Tidak ada transaksi valid dalam file',
    reviewBeforeImport: 'Periksa transaksi sebelum mengimpor',
    importMore: 'Impor Lagi',
    viewTransactions: 'Lihat Transaksi',
    dropExcelOrImage: 'Letakkan file Excel atau gambar di sini',
    supportedBulkFormats: '.xlsx, .png, .jpg, .jpeg',
    row: 'Baris',
    totalIncomeLabel: 'Total Pemasukan',
    totalExpenseLabel: 'Total Pengeluaran',
    autoDescription: 'Impor massal',
    net: 'Bersih',
    noResults: 'Tidak ada hasil',
    clearFilters: 'Hapus Filter',
    and: 'dan',
    more: 'lainnya',
    delete: 'Hapus',
    duplicate: 'Duplikat',
    edit: 'Edit',
    editBudget: 'Edit Anggaran',
    exportFiltered: 'Ekspor',
    dueSoon: 'Segera jatuh tempo',
    add: 'Tambah',
    name: 'Nama',
    transactionType: 'Tipe transaksi',
    previousYear: 'Tahun sebelumnya',
    nextYear: 'Tahun berikutnya',
    clearFile: 'Hapus file',
    receiptPreview: 'Pratinjau struk',
    uploadAnother: 'Unggah Lagi',
    failedExtract: 'Gagal mengekstrak teks',
    noTransactionsMatch: 'Tidak ada transaksi yang cocok dengan filter',
    addFirstTransaction: 'Tambahkan transaksi pertama Anda.',
    backToTransactions: 'Kembali ke Transaksi',
    recordTransaction: 'Catat transaksi baru',
    transactionCount: 'transaksi bulan ini',
    expenseCategories: 'Kategori Pengeluaran',
    incomeSources: 'Sumber Pemasukan',
    addCategory: 'Tambah Kategori',
    categoryName: 'Nama kategori',
    methodName: 'Nama metode',
    transactionUpdated: 'Transaksi diperbarui',
    transactionAdded: 'Transaksi ditambahkan',
    failedSave: 'Gagal menyimpan',
    exportFailed: 'Ekspor gagal',
    fixExtractedErrors: 'Periksa data yang diekstrak',
    savedFromReceipt: 'Transaksi disimpan dari struk',
    appearanceDesc: 'Sesuaikan tampilan aplikasi',
    languageDesc: 'Pilih bahasa tampilan',
    categoriesDesc: 'Kelola kategori dan metode pembayaran',
    manageCategoriesMethods: 'Kelola Kategori & Metode Pembayaran',
    dataManagementDesc: 'Ekspor, impor, atau hapus data',

    // Bills page
    bills: 'Tagihan',
    addBill: 'Tambah Tagihan',
    editBill: 'Edit Tagihan',
    billName: 'Nama Tagihan',
    billAmount: 'Jumlah',
    billDueDate: 'Tanggal Jatuh Tempo',
    billSaved: 'Tagihan disimpan',
    billDeleted: 'Tagihan dihapus',
    noBills: 'Tidak ada tagihan bulan ini',
    deleteBill: 'Hapus Tagihan',
    recurringBill: 'Berulang',
    generateBills: 'Buat dari tagihan berulang',
    generatedBills: 'Berhasil membuat {count} tagihan berulang',
    markAsRecurring: 'Tandai sebagai berulang',

    // Cascade guards
    cannotDeleteInUse: 'Tidak dapat dihapus — masih digunakan oleh transaksi',

    // Export custom range
    customRange: 'Rentang Kustom',
    selectDateRange: 'Pilih rentang tanggal',
    startDate: 'Tanggal Mulai',
    endDate: 'Tanggal Akhir',

    // Budget page
    budgetPage: 'Anggaran',
    totalBudget: 'Total Anggaran',
    totalSpent: 'Total Terpakai',
    setBudget: 'Atur Anggaran',
    unbudgeted: 'Belum Dianggarkan',
    budgetUpdated: 'Anggaran diperbarui',
    noBudgetCategories: 'Belum ada anggaran untuk kategori',
    budgetOverview: 'Ringkasan Anggaran',
    percentUsed: 'terpakai',

    // Budget templates
    saveAsTemplate: 'Simpan sebagai Template',
    applyTemplate: 'Terapkan Template',
    smartSuggest: 'Saran Cerdas',
    templateName: 'Nama Template',
    budgetTemplates: 'Template Anggaran',
    applyConfirm: 'Ini akan menimpa semua anggaran saat ini. Lanjutkan?',
    templateApplied: '{n} anggaran diperbarui',
    suggestionsBasedOn: 'Berdasarkan {n} bulan terakhir',
    noTemplates: 'Belum ada template tersimpan',
    applySuggestions: 'Terapkan Saran',
    templateSaved: 'Template disimpan',
    deleteTemplateConfirm: 'Hapus "{name}"? Tindakan ini tidak dapat dibatalkan.',
    notEnoughData: 'Data tidak cukup',
    noExpenseCategories: 'Tidak ada kategori pengeluaran',
    savingCategories: 'Menyimpan {n} kategori dengan anggaran',
    noBudgetsSet: 'Belum ada kategori dengan anggaran',
    nCategoriesLabel: '{n} kategori',
    failedToUpdateCategories: 'Gagal memperbarui {n} kategori',

    // Savings page
    savingsPage: 'Target Tabungan',
    addSavingsGoal: 'Tambah Target Tabungan',
    editSavingsGoal: 'Edit Target Tabungan',
    goalName: 'Nama Target',
    targetAmount: 'Jumlah Target',
    savedAmount: 'Jumlah Tersimpan',
    goalColor: 'Warna',
    goalSaved: 'Target disimpan',
    goalDeleted: 'Target dihapus',
    noSavingsGoals: 'Belum ada target tabungan',
    deleteSavingsGoal: 'Hapus Target Tabungan',
    updateSaved: 'Perbarui Tersimpan',
    recurringTransactions: 'Transaksi Berulang',
    addRecurring: 'Tambah Berulang',
    editRecurring: 'Edit Berulang',
    deleteRecurring: 'Hapus Berulang',
    recurringDeleted: 'Transaksi berulang dihapus',
    recurringAdded: 'Transaksi berulang ditambahkan',
    recurringUpdated: 'Transaksi berulang diperbarui',
    frequency: 'Frekuensi',
    daily: 'Harian',
    weekly: 'Mingguan',
    monthly: 'Bulanan',
    yearly: 'Tahunan',
    nextDueDate: 'Jatuh Tempo Berikutnya',
    active: 'Aktif',
    inactive: 'Nonaktif',
    generateNow: 'Buat Sekarang',
    generated: 'Dibuat',
    noRecurring: 'Belum ada transaksi berulang',
    indefinite: 'Tidak terbatas',
    reports: 'Laporan',
    financialTrends: 'Tren keuangan lintas bulan',
    incomeVsExpense: 'Pemasukan vs Pengeluaran',
    monthlyBreakdown: 'Rincian Bulanan',
    last6Months: '6 bulan',
    last12Months: '12 bulan',
    avgSavingsRate: 'Rasio Tabungan',
    month: 'Bulan',
    annualReport: 'Laporan Tahunan',
    topCategories: 'Kategori Pengeluaran Teratas',
    totalTransactions: 'Transaksi',
    switchLanguage: 'Ganti Bahasa',
    uploadHistory: 'Riwayat Unggahan',
    noUploadHistory: 'Belum ada unggahan',
    uploadDate: 'Tanggal Unggah',
    extracted: 'Diekstrak',
    selectIcon: 'Pilih Ikon',
    reorderCategories: 'Urutkan Kategori',
    browseByYear: 'Jelajahi per Tahun',
    selectMonth: 'Pilih Bulan',
    folderTransactions: 'transaksi',
    noTransactionsYet: 'Belum ada transaksi',
    currentYear: 'Tahun Ini',
    currentMonth: 'Bulan Ini',
    allYears: 'Semua Tahun',
    noDataYet: 'Belum ada data',

    // Home screen
    home: 'Beranda',
    welcomeBack: 'Selamat datang kembali',
    welcomeMorning: 'Selamat pagi',
    welcomeAfternoon: 'Selamat siang',
    welcomeEvening: 'Selamat malam',
    homeSubtitle: 'Apa yang ingin Anda lakukan hari ini?',
    viewDashboard: 'Lihat ringkasan keuangan',
    manageTransactions: 'Catat dan kelola transaksi',
    manageBudget: 'Atur dan pantau batas pengeluaran',
    manageBills: 'Pantau tagihan mendatang',
    manageRecurring: 'Kelola transaksi berulang',
    manageSavings: 'Pantau progres tabungan',
    viewReports: 'Analisis tren keuangan',
    uploadReceipts: 'Pindai dan impor struk',
    appSettings: 'Sesuaikan pengalaman Anda',

    // Bulk delete
    bulkDeleteTitle: 'Hapus Transaksi Terpilih',
    bulkDeleteDescription:
      '{count} transaksi akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.',
    bulkDeleteSuccess: 'Transaksi dihapus',
    selected: 'dipilih',
    selectAll: 'Pilih Semua',
    deselectAll: 'Batal Pilih Semua',

    // Confirmation
    deleteConfirmDescription:
      'Ini akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.',

    // Report download keys
    downloadReport: 'Unduh Laporan',
    reportTypeMonthly: 'Bulanan',
    reportTypeYearly: 'Tahunan',
    generatingReport: 'Membuat...',
    reportDownloaded: 'Laporan diunduh',
    reportError: 'Gagal membuat laporan',
    annualSummary: 'Ringkasan Tahunan',
    transactionDetail: 'Detail Transaksi',
    accountBalances: 'Saldo Akun',

    // Load-more transaction keys
    loadMore: 'Muat lagi',
    allLoaded: 'Semua dimuat',
    showing: 'Menampilkan',

    // Sidebar group keys
    groupFinance: 'Keuangan',
    groupTools: 'Alat',

    // Beginning Balance
    beginningBalance: 'Saldo Awal',
    beginningBalanceHelp: 'Jumlah yang sudah ada di akun ini sebelum Anda mulai mencatat.',
    existingDebt: 'Utang Awal',
    existingDebtHelp: 'Masukkan jumlah utang kartu kredit sebelum Anda mulai mencatat.',
    closing: 'Penutupan',

    // Sort order
    newest: 'Terbaru',
    oldest: 'Terlama',

    // End-of-month reminder
    endOfMonthTitle: 'Pengingat Akhir Bulan',
    endOfMonthBody:
      'Hari ini adalah hari terakhir bulan ini. Pastikan semua transaksi sudah dicatat sebelum tengah malam agar saldo awal bulan berikutnya akurat.',
    goToTransactions: 'Ke Transaksi',
    dismiss: 'Tutup',

    // Advanced Filters
    advancedFilters: 'Filter Lanjutan',
    amountRange: 'Rentang Jumlah',
    minAmount: 'Minimum',
    maxAmount: 'Maksimum',
    multiCategory: 'Kategori',
    dateRange: 'Rentang Tanggal',
    dateFrom: 'Dari',
    dateTo: 'Sampai',
    includeNotes: 'Sertakan catatan dalam pencarian',
    filterPresets: 'Filter Tersimpan',
    savePreset: 'Simpan filter saat ini',
    presetName: 'Nama preset',
    clearAllFilters: 'Hapus Semua',
    activeFilters: 'Filter ({n})',
    dateRangeOverridesMonth: 'Menimpa pemilih bulan',
    dateRangeBothRequired: 'Kedua field tanggal diperlukan',
    amountRangeError: 'Minimum harus ≤ maksimum',
    deletePreset: 'Hapus preset {name}',

    // Auth
    signIn: 'Masuk',
    createAccount: 'Buat Akun',
    signOut: 'Keluar',
    emailLabel: 'Email',
    passwordLabel: 'Kata Sandi',
    fullName: 'Nama Lengkap',
    invalidCredentials: 'Email atau kata sandi salah',
    sessionExpired: 'Sesi Anda telah berakhir. Silakan masuk kembali.',
    // Forecast
    forecast: 'Proyeksi',
    cashFlowForecast: 'Proyeksi Arus Kas',
    expectedThisMonth: 'Proyeksi Bulan Ini',
    actualSoFar: 'Aktual sejauh ini',
    projected: 'Proyeksi',
    projectedIncome: 'Proyeksi Pemasukan',
    projectedExpense: 'Proyeksi Pengeluaran',
    projectedNet: 'Proyeksi Bersih',
    forecastBasis: 'Berdasarkan transaksi berulang saja',
    noRecurringForForecast: 'Tidak ada transaksi berulang untuk diproyeksikan',
    forecastMonths: 'Proyeksi {n} bulan',
    total: 'Total',
    today: 'Hari Ini',

    loginRequired: 'Silakan masuk untuk melanjutkan',

    netWorth: 'Kekayaan Bersih',
    netWorthPage: 'Kekayaan Bersih',
    assets: 'Aset',
    liabilities: 'Kewajiban',
    totalAssets: 'Total Aset',
    totalLiabilities: 'Total Kewajiban',
    noLiabilities: 'Belum ada kewajiban',
    addLiability: 'Tambah Kewajiban',
    editLiability: 'Edit Kewajiban',
    deleteLiability: 'Hapus Kewajiban',
    liabilityName: 'Nama Kewajiban',
    liabilityCategory: 'Kategori',
    loanType: 'Pinjaman',
    creditCardType: 'Hutang Kartu Kredit',
    otherType: 'Lainnya',
    recordSnapshot: 'Catat ulang snapshot',
    netWorthHistory: 'Riwayat Kekayaan Bersih',
    noSnapshotsYet: 'Kunjungi halaman ini setiap bulan untuk membangun riwayat kekayaan bersih Anda.',
    liabilityDeleted: 'Kewajiban dihapus',
    liabilitySaved: 'Kewajiban disimpan',
    snapshotRecorded: 'Snapshot dicatat',
  },
};

export function t(locale: Locale, key: keyof TranslationKeys): string {
  return translations[locale][key];
}

export const LocaleContext = createContext<Locale>('en');

export function useLocale(): Locale {
  return useContext(LocaleContext);
}
