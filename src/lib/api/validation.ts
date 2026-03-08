import { z } from 'zod';

export const createTransactionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  description: z.string().min(1, 'Description is required').max(200),
  category: z.string().min(1, 'Category is required'),
  type: z.enum(['income', 'expense']),
  amount: z.number().positive('Amount must be positive'),
  paymentMethod: z.string().min(1, 'Payment method is required'),
  notes: z.string().max(500).optional().default(''),
});

export const updateTransactionSchema = createTransactionSchema.partial();

export const listTransactionsQuerySchema = z.object({
  month: z.number().int().min(0).max(11).optional(),
  year: z.number().int().min(2000).max(2100).optional(),
  type: z.enum(['income', 'expense']).optional(),
  category: z.string().optional(),
  search: z.string().optional(),
});

export const dashboardSummaryQuerySchema = z.object({
  month: z.number().int().min(0).max(11),
  year: z.number().int().min(2000).max(2100),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
export type ListTransactionsQuery = z.infer<typeof listTransactionsQuerySchema>;
export type DashboardSummaryQuery = z.infer<typeof dashboardSummaryQuerySchema>;
