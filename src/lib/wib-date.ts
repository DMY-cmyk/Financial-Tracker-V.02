/**
 * Server-side "today" in Indonesia (WIB, UTC+7).
 *
 * Vercel functions run in UTC by default. Calling `new Date().toISOString()` on
 * the server near midnight WIB returns yesterday's date for Indonesian users —
 * recurring transactions due "today" then get skipped or duplicated. All
 * server code that needs a local-date string should go through this helper.
 *
 * Returns 'YYYY-MM-DD' (the same format used by `transactions.date`).
 */
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

export function todayInWIB(now: Date = new Date()): string {
  const shifted = new Date(now.getTime() + WIB_OFFSET_MS);
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const d = String(shifted.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
