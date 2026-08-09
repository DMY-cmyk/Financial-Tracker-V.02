'use client';

import { t, type Locale } from '@/lib/i18n';
import { LiveRibbon } from './LiveRibbon';
import { CountStat } from './CountStat';
import { MarketTicker } from './MarketTicker';
import { HERO_STATS } from './hero-data';
import { formatCurrencyShort } from '@/lib/formatters';

export interface EditorialHeroProps {
  locale: Locale;
}

export function EditorialHero({ locale }: EditorialHeroProps) {
  return (
    <div className="relative flex h-full flex-col overflow-hidden border-r border-[var(--rule-soft)] bg-[var(--paper-2)] px-14 py-11">
      <div className="ft-eyebrow ft-rise-1">
        {t(locale, 'authIssue')} · {t(locale, 'authSecureLedger')}
      </div>

      <div className="ft-rise-2 mt-3">
        <div
          className="ft-display-up"
          style={{ fontSize: 56, lineHeight: 0.92, letterSpacing: '-0.025em' }}
        >
          FINANCIAL
          <br />
          TRACKER
          <span className="italic" style={{ color: 'var(--accent-2)' }}>
            .
          </span>
        </div>
      </div>

      <p className="ft-display ft-rise-3 mt-4 max-w-md text-lg text-[var(--ink-2)]">
        {t(locale, 'authHeroDek')}
      </p>

      <div className="ft-rise-4 mt-7">
        <div className="ft-eyebrow mb-2">{t(locale, 'authHeroLive30')}</div>
        <LiveRibbon />
      </div>

      <div className="ft-rise-5 mt-6 grid grid-cols-3 gap-5">
        <CountStat
          label={t(locale, 'authHeroNetWorth')}
          target={HERO_STATS.netWorth}
          format={(v) => formatCurrencyShort(v, locale)}
        />
        <CountStat
          label={t(locale, 'authHeroThisMonth')}
          target={HERO_STATS.thisMonth}
          format={(v) => `+${formatCurrencyShort(v, locale)}`}
          color="var(--pos)"
        />
        <CountStat
          label={t(locale, 'authHeroCategories')}
          target={HERO_STATS.categories}
          format={(v) => Math.round(v).toString()}
        />
      </div>

      <div className="ft-rise-6 mt-auto border-t border-[var(--rule-soft)] pt-6">
        <MarketTicker />
      </div>
    </div>
  );
}
