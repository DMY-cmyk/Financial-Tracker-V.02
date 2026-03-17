import { z } from 'zod';

export const createTransactionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  description: z.string().min(1, 'Description is required').max(200),
  category: z.string().min(1, 'Category is required'),
  categoryId: z.string().min(1, 'Category ID is required'),
  type: z.enum(['income', 'expense']),
  amount: z.number().positive('Amount must be positive'),
  paymentMethod: z.string().min(1, 'Payment method is required'),
  notes: z.string().max(500).optional().default(''),
});

export const updateTransactionSchema = createTransactionSchema.partial();

export const bulkCreateTransactionSchema = z.object({
  transactions: z
    .array(createTransactionSchema)
    .min(1, 'At least one transaction is required')
    .max(500, 'Maximum 500 transactions per import'),
});

export const bulkDeleteTransactionSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(500),
});

export const listTransactionsQuerySchema = z.object({
  month: z.number().int().min(0).max(11).optional(),
  year: z.number().int().min(2000).max(2100).optional(),
  yearOnly: z.boolean().optional(),
  type: z.enum(['income', 'expense']).optional(),
  categoryId: z.string().optional(),
  paymentMethod: z.string().optional(),
  search: z.string().optional(),
  page: z.number().int().min(1).optional().default(1),
  pageSize: z.number().int().min(1).max(100).optional().default(25),
});

export const dashboardSummaryQuerySchema = z.object({
  month: z.number().int().min(0).max(11),
  year: z.number().int().min(2000).max(2100),
});

// === Category schemas ===

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  type: z.enum(['income', 'expense']),
  color: z.string().min(1, 'Color is required').max(20),
  icon: z.string().max(50).optional().default('circle'),
  budget: z.number().min(0, 'Budget must be non-negative').optional().default(0),
});

export const updateCategorySchema = createCategorySchema.partial();

// === Payment method schemas ===

export const createPaymentMethodSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  icon: z.string().max(50).optional().default('wallet'),
  type: z.enum(['bank', 'cash', 'ewallet']),
});

export const updatePaymentMethodSchema = createPaymentMethodSchema.partial();

// === Settings schema ===

export const updateSettingsSchema = z
  .record(z.string(), z.string())
  .refine((obj) => Object.keys(obj).length > 0, { message: 'At least one setting is required' });

// === Upload schemas ===

export const createUploadSchema = z.object({
  filename: z.string().min(1, 'Filename is required').max(255),
  fileSize: z.number().int().min(0).optional().default(0),
  mimeType: z.string().max(100).optional().default(''),
});

export const updateUploadSchema = z.object({
  status: z.enum(['pending', 'processing', 'extracted', 'saved', 'error']).optional(),
  extractedData: z.string().optional(),
});

// === Bill schemas ===

export const createBillSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  amount: z.number().positive('Amount must be positive'),
  dueDate: z.number().int().min(1).max(31),
  isPaid: z.boolean().optional().default(false),
  isRecurring: z.boolean().optional().default(false),
  month: z.number().int().min(0).max(11),
  year: z.number().int().min(2000).max(2100),
});

export const updateBillSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).optional(),
  amount: z.number().positive('Amount must be positive').optional(),
  dueDate: z.number().int().min(1).max(31).optional(),
  isPaid: z.boolean().optional(),
  isRecurring: z.boolean().optional(),
  month: z.number().int().min(0).max(11).optional(),
  year: z.number().int().min(2000).max(2100).optional(),
});

// === Savings goal schemas ===

export const createSavingsGoalSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  targetAmount: z.number().positive('Target amount must be positive'),
  savedAmount: z.number().min(0, 'Saved amount must be non-negative').optional().default(0),
  color: z.string().min(1, 'Color is required').max(20),
});

export const updateSavingsGoalSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).optional(),
  targetAmount: z.number().positive('Target amount must be positive').optional(),
  savedAmount: z.number().min(0, 'Saved amount must be non-negative').optional(),
  color: z.string().min(1, 'Color is required').max(20).optional(),
});

// === Export job schema ===

export const createExportJobSchema = z.object({
  format: z.enum(['csv', 'json', 'xlsx', 'pdf']),
  scope: z.enum(['current', 'all', 'range']),
  filters: z.string().optional(),
  options: z.string().optional(),
  recordCount: z.number().int().min(0).optional().default(0),
});

// === Recurring transaction schemas ===

export const createRecurringTransactionSchema = z.object({
  description: z.string().min(1, 'Description is required').max(200),
  category: z.string().min(1, 'Category is required'),
  categoryId: z.string().min(1, 'Category ID is required'),
  type: z.enum(['income', 'expense']),
  amount: z.number().positive('Amount must be positive'),
  paymentMethod: z.string().min(1, 'Payment method is required'),
  notes: z.string().max(500).optional().default(''),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional()
    .default(null),
  nextDueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  isActive: z.boolean().optional().default(true),
});

export const updateRecurringTransactionSchema = z.object({
  description: z.string().min(1, 'Description is required').max(200).optional(),
  category: z.string().min(1, 'Category is required').optional(),
  categoryId: z.string().min(1, 'Category ID is required').optional(),
  type: z.enum(['income', 'expense']).optional(),
  amount: z.number().positive('Amount must be positive').optional(),
  paymentMethod: z.string().min(1, 'Payment method is required').optional(),
  notes: z.string().max(500).optional(),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']).optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  nextDueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
    .optional(),
  isActive: z.boolean().optional(),
});

export const listRecurringTransactionsQuerySchema = z.object({
  isActive: z.boolean().optional(),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']).optional(),
});

// === Inferred types ===

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
export type BulkCreateTransactionInput = z.infer<typeof bulkCreateTransactionSchema>;
export type BulkDeleteTransactionInput = z.infer<typeof bulkDeleteTransactionSchema>;
export type ListTransactionsQuery = z.infer<typeof listTransactionsQuerySchema>;
export type DashboardSummaryQuery = z.infer<typeof dashboardSummaryQuerySchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type CreatePaymentMethodInput = z.infer<typeof createPaymentMethodSchema>;
export type UpdatePaymentMethodInput = z.infer<typeof updatePaymentMethodSchema>;
export type CreateUploadInput = z.infer<typeof createUploadSchema>;
export type UpdateUploadInput = z.infer<typeof updateUploadSchema>;
export type CreateExportJobInput = z.infer<typeof createExportJobSchema>;
export type CreateBillInput = z.infer<typeof createBillSchema>;
export type UpdateBillInput = z.infer<typeof updateBillSchema>;
export type CreateSavingsGoalInput = z.infer<typeof createSavingsGoalSchema>;
export type UpdateSavingsGoalInput = z.infer<typeof updateSavingsGoalSchema>;
export type CreateRecurringTransactionInput = z.infer<typeof createRecurringTransactionSchema>;
export type UpdateRecurringTransactionInput = z.infer<typeof updateRecurringTransactionSchema>;
export type ListRecurringTransactionsQuery = z.infer<typeof listRecurringTransactionsQuerySchema>;
