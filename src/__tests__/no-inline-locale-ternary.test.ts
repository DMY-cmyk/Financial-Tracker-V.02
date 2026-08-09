import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, resolve, sep } from 'path';

// String pengguna wajib lewat t(locale, key). Ternary inline `locale === '..' ?`
// adalah kebocoran i18n — kecuali daftar file yang memang memetakan locale ke
// mekanisme non-kamus (Intl tag, date-fns locale, dsb.).
const WHITELIST = [
  `${sep}lib${sep}i18n.ts`,
  `${sep}lib${sep}formatters.ts`,
  `${sep}lib${sep}constants.ts`,
  `${sep}lib${sep}api${sep}validation.ts`,
  `${sep}features${sep}insights${sep}DayOfWeekPills.tsx`,
  // Locale-code toggle (updateLocale(locale === 'en' ? 'id' : 'en')) — swaps the
  // locale value itself, not a displayed string.
  `${sep}components${sep}layout${sep}Sidebar.tsx`,
  // Radio-button active-state comparison (aria-checked / active tab styling) —
  // compares current locale to a code, not a displayed string.
  `${sep}components${sep}layout${sep}MobileNav.tsx`,
  // Intl.toLocaleString/toLocaleDateString locale tag selection ('id-ID' vs
  // 'en-US') — not a user-facing string, just which Intl locale to format with.
  `${sep}features${sep}insights${sep}OutlierAlerts.tsx`,
  `${sep}features${sep}insights${sep}BiggestTransactionsCard.tsx`,
  // Net worth: month-array pick / Intl locale tag selection — verified legit
  // non-string uses.
  `${sep}features${sep}net-worth${sep}MonthOverMonthCard.tsx`,
  `${sep}features${sep}net-worth${sep}SnapshotButton.tsx`,
  `${sep}features${sep}net-worth${sep}NetWorthTrendChart.tsx`,
];

function collect(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...collect(full));
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

describe('no inline locale ternaries outside the whitelist', () => {
  const roots = ['src/app', 'src/components', 'src/features'].map((r) => resolve(r));
  const files = roots.flatMap(collect).filter((f) => !WHITELIST.some((w) => f.endsWith(w)));
  const offenders = files.filter((f) => /locale === '(en|id)'\s*\?/.test(readFileSync(f, 'utf-8')));
  it('every user-facing string goes through t()', () => {
    expect(offenders).toEqual([]);
  });
});
