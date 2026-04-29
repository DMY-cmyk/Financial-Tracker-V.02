import { describe, it, expect } from 'vitest';
import { t } from '@/lib/i18n';

describe('Phase 2 i18n keys', () => {
  const keys = [
    'homeGreeting',
    'homeSubgreetingMorning',
    'homeSubgreetingAfternoon',
    'homeSubgreetingEvening',
    'homeSubgreetingNight',
    'homeTotalBalance',
    'homeTotalExpense',
    'homeBudgetCaptionUnder30',
    'homeBudgetCaptionUnder70',
    'homeBudgetCaptionUnder100',
    'homeBudgetCaptionAtLimit',
    'homeBudgetCaptionOver',
    'homeBudgetCaptionNoBudget',
    'homeSavingsTitle',
    'homeSavingsEmpty',
    'homeStatsRevenueLastWeek',
    'homeStatsTopCategoryLastWeek',
    'homeStatsEmpty',
    'periodDaily',
    'periodWeekly',
    'periodMonthly',
    'periodYearly',
    'txSeeAll',
    'txEmpty',
  ] as const;

  it.each(keys)('returns non-empty EN value for %s', (k) => {
    const v = t('en', k);
    expect(v).toBeTruthy();
    expect(v).not.toBe(k);
  });

  it.each(keys)('returns non-empty ID value for %s', (k) => {
    const v = t('id', k);
    expect(v).toBeTruthy();
    expect(v).not.toBe(k);
  });

  it('homeBudgetCaptionOver contains {amount} placeholder in both locales', () => {
    expect(t('en', 'homeBudgetCaptionOver')).toContain('{amount}');
    expect(t('id', 'homeBudgetCaptionOver')).toContain('{amount}');
  });
});
