import type { Transaction } from '@/lib/types';
import { getStore } from '@/server/db/store';
import { nanoid } from 'nanoid';

export interface TransactionRepository {
  findAll(): Transaction[];
  findById(id: string): Transaction | undefined;
  findByMonth(month: number, year: number): Transaction[];
  create(data: Omit<Transaction, 'id'>): Transaction;
  update(id: string, data: Partial<Transaction>): Transaction | undefined;
  delete(id: string): boolean;
}

export function createTransactionRepository(): TransactionRepository {
  return {
    findAll() {
      return getStore().transactions;
    },

    findById(id: string) {
      return getStore().transactions.find((t) => t.id === id);
    },

    findByMonth(month: number, year: number) {
      return getStore().transactions.filter((t) => {
        const d = new Date(t.date);
        return d.getMonth() === month && d.getFullYear() === year;
      });
    },

    create(data: Omit<Transaction, 'id'>) {
      const transaction: Transaction = { ...data, id: nanoid() };
      getStore().transactions.push(transaction);
      return transaction;
    },

    update(id: string, data: Partial<Transaction>) {
      const store = getStore();
      const index = store.transactions.findIndex((t) => t.id === id);
      if (index === -1) return undefined;
      store.transactions[index] = { ...store.transactions[index], ...data };
      return store.transactions[index];
    },

    delete(id: string) {
      const store = getStore();
      const index = store.transactions.findIndex((t) => t.id === id);
      if (index === -1) return false;
      store.transactions.splice(index, 1);
      return true;
    },
  };
}
