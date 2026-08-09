export function resolveInitialType(param: string | null): 'income' | 'expense' {
  return param === 'income' ? 'income' : 'expense';
}
