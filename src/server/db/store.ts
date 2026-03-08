import type { Transaction, Category, PaymentMethod, Bill, SavingsGoal } from '@/lib/types';

interface ServerStore {
  transactions: Transaction[];
  categories: Category[];
  paymentMethods: PaymentMethod[];
  bills: Bill[];
  savingsGoals: SavingsGoal[];
  initialized: boolean;
}

// In-memory store persists across requests in the same server process.
// Resets on server restart. Future: swap for a database.
const store: ServerStore = {
  transactions: [],
  categories: [],
  paymentMethods: [],
  bills: [],
  savingsGoals: [],
  initialized: false,
};

export function getStore(): ServerStore {
  return store;
}

export function initializeStore(data: {
  transactions: Transaction[];
  categories: Category[];
  paymentMethods: PaymentMethod[];
  bills: Bill[];
  savingsGoals: SavingsGoal[];
}) {
  store.transactions = data.transactions;
  store.categories = data.categories;
  store.paymentMethods = data.paymentMethods;
  store.bills = data.bills;
  store.savingsGoals = data.savingsGoals;
  store.initialized = true;
}

export function resetStore() {
  store.transactions = [];
  store.categories = [];
  store.paymentMethods = [];
  store.bills = [];
  store.savingsGoals = [];
  store.initialized = false;
}

export function isStoreInitialized(): boolean {
  return store.initialized;
}
