/* eslint-disable @typescript-eslint/no-unused-vars */
// API boundary placeholders — fake async for future backend integration
// Replace these with real API calls when backend is ready

import { type Transaction, type ExportFormat, type ExportScope } from './types';

// Simulate network latency
function delay(ms: number = 300): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- Dashboard ---

export interface DashboardStats {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpense: number;
  savingsRate: number;
  transactionCount: number;
}

export async function fetchDashboardStats(
  month: number,
  year: number,
  transactions: Transaction[]
): Promise<DashboardStats> {
  await delay(100);
  const monthly = transactions.filter((t) => {
    const d = new Date(t.date);
    return d.getMonth() === month && d.getFullYear() === year;
  });
  const income = monthly.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = monthly.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  return {
    totalBalance: income - expense,
    monthlyIncome: income,
    monthlyExpense: expense,
    savingsRate: income > 0 ? Math.round(((income - expense) / income) * 100) : 0,
    transactionCount: monthly.length,
  };
}

// --- Transactions ---

export async function saveTransaction(
  _data: Omit<Transaction, 'id'>
): Promise<{ success: boolean; id: string }> {
  await delay(200);
  // In real app, POST to /api/transactions
  return { success: true, id: `tx_${Date.now()}` };
}

export async function deleteTransactionRemote(_id: string): Promise<{ success: boolean }> {
  await delay(200);
  return { success: true };
}

// --- Export ---

export interface ExportJob {
  id: string;
  format: ExportFormat;
  scope: ExportScope;
  status: 'pending' | 'processing' | 'complete' | 'error';
  filename?: string;
  createdAt: string;
}

export async function createExportJob(
  format: ExportFormat,
  scope: ExportScope
): Promise<ExportJob> {
  await delay(500);
  return {
    id: `exp_${Date.now()}`,
    format,
    scope,
    status: 'complete',
    filename: `transactions.${format}`,
    createdAt: new Date().toISOString(),
  };
}

// --- OCR / Upload ---

export interface OcrResponse {
  text: string;
  confidence: number;
  amount?: string;
  date?: string;
  description?: string;
}

export async function processReceiptOcr(_file: File): Promise<OcrResponse> {
  // In real app, POST file to /api/ocr or use Tesseract.js
  await delay(1000);
  return {
    text: 'Mock OCR result',
    confidence: 75,
    amount: '150000',
    date: new Date().toISOString().split('T')[0],
    description: 'Receipt item',
  };
}
