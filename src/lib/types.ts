export interface Transaction {
  id: string;
  date: string; // ISO date string YYYY-MM-DD
  description: string;
  category: string;
  type: 'income' | 'expense';
  amount: number;
  paymentMethod: string;
  notes: string;
}

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  color: string;
  icon: string;
  budget: number;
}

export interface PaymentMethod {
  id: string;
  name: string;
  icon: string;
  type: 'bank' | 'cash' | 'ewallet';
}

export interface Bill {
  id: string;
  name: string;
  amount: number;
  dueDate: number; // day of month
  isPaid: boolean;
  month: number;
  year: number;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  color: string;
}

export interface UIState {
  selectedMonth: number;
  selectedYear: number;
  theme: 'light' | 'dark' | 'system';
  locale: 'en' | 'id';
}

export interface FinancialStore {
  transactions: Transaction[];
  categories: Category[];
  paymentMethods: PaymentMethod[];
  bills: Bill[];
  savingsGoals: SavingsGoal[];
  ui: UIState;
  initialized: boolean;

  // Transaction actions
  addTransaction: (t: Omit<Transaction, 'id'>) => void;
  updateTransaction: (id: string, t: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;

  // Category actions
  addCategory: (c: Omit<Category, 'id'>) => void;
  updateCategory: (id: string, c: Partial<Category>) => void;
  deleteCategory: (id: string) => void;

  // Payment method actions
  addPaymentMethod: (p: Omit<PaymentMethod, 'id'>) => void;
  updatePaymentMethod: (id: string, p: Partial<PaymentMethod>) => void;
  deletePaymentMethod: (id: string) => void;

  // Bill actions
  addBill: (b: Omit<Bill, 'id'>) => void;
  updateBill: (id: string, b: Partial<Bill>) => void;
  deleteBill: (id: string) => void;
  toggleBillPaid: (id: string) => void;

  // Savings actions
  addSavingsGoal: (s: Omit<SavingsGoal, 'id'>) => void;
  updateSavingsGoal: (id: string, s: Partial<SavingsGoal>) => void;
  deleteSavingsGoal: (id: string) => void;

  // UI actions
  setMonth: (month: number) => void;
  setYear: (year: number) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setLocale: (locale: 'en' | 'id') => void;

  // Data actions
  initialize: (data: {
    transactions: Transaction[];
    categories: Category[];
    paymentMethods: PaymentMethod[];
    bills: Bill[];
    savingsGoals: SavingsGoal[];
  }) => void;
  clearAllData: () => void;
}
