// Lightweight validation — no external library needed for this scope

export interface FieldError {
  field: string;
  message: string;
}

export interface TransactionFormData {
  type: 'income' | 'expense';
  amount: string;
  description: string;
  date: string;
  category: string;
  paymentMethod: string;
  notes: string;
}

export function validateTransactionForm(
  data: TransactionFormData,
  locale: 'en' | 'id' = 'en'
): FieldError[] {
  const errors: FieldError[] = [];
  const msg = locale === 'id' ? MESSAGES_ID : MESSAGES_EN;

  const amount = parseInt(data.amount.replace(/[^\d]/g, ''), 10) || 0;
  if (amount <= 0) {
    errors.push({ field: 'amount', message: msg.invalidAmount });
  }

  if (!data.description.trim()) {
    errors.push({ field: 'description', message: msg.descriptionRequired });
  } else if (data.description.trim().length < 2) {
    errors.push({ field: 'description', message: msg.descriptionTooShort });
  }

  if (!data.date) {
    errors.push({ field: 'date', message: msg.dateRequired });
  }

  if (!data.category) {
    errors.push({ field: 'category', message: msg.categoryRequired });
  }

  if (!data.paymentMethod) {
    errors.push({ field: 'paymentMethod', message: msg.paymentMethodRequired });
  }

  return errors;
}

export function validateOcrFields(data: {
  amount: string;
  description: string;
  date: string;
  category: string;
}): FieldError[] {
  const errors: FieldError[] = [];
  const amount = parseInt(data.amount.replace(/[^\d]/g, ''), 10) || 0;

  if (amount <= 0) errors.push({ field: 'amount', message: 'Enter a valid amount' });
  if (!data.description.trim())
    errors.push({ field: 'description', message: 'Description is required' });
  if (!data.date) errors.push({ field: 'date', message: 'Date is required' });
  if (!data.category) errors.push({ field: 'category', message: 'Select a category' });

  return errors;
}

const MESSAGES_EN = {
  invalidAmount: 'Enter a valid amount',
  descriptionRequired: 'Description is required',
  descriptionTooShort: 'Description must be at least 2 characters',
  dateRequired: 'Date is required',
  categoryRequired: 'Select a category',
  paymentMethodRequired: 'Select a payment method',
};

const MESSAGES_ID = {
  invalidAmount: 'Masukkan jumlah yang valid',
  descriptionRequired: 'Deskripsi wajib diisi',
  descriptionTooShort: 'Deskripsi minimal 2 karakter',
  dateRequired: 'Tanggal wajib diisi',
  categoryRequired: 'Pilih kategori',
  paymentMethodRequired: 'Pilih metode pembayaran',
};

export function getFieldError(errors: FieldError[], field: string): string | undefined {
  return errors.find((e) => e.field === field)?.message;
}
