'use client';

import { TICKER_ROWS, type TickerRow } from './hero-data';

export function MarketTicker() {
  const rows: TickerRow[] = TICKER_ROWS;
  const tripled: TickerRow[] = [...rows, ...rows, ...rows];
  return (
    <div
      className="overflow-hidden"
      style={{
        maskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
      }}
    >
      <div
        className="flex gap-7 whitespace-nowrap"
        style={{ animation: 'ftMarq 32s linear infinite' }}
      >
        {tripled.map((r, i) => (
          <div key={i} className="ft-mono flex items-baseline gap-2 text-[11px]">
            <span className="tracking-wider text-[var(--ink-3)]">{r.symbol}</span>
            <span className="font-semibold text-[var(--ink)]">{r.value}</span>
            <span style={{ color: r.positive ? 'var(--pos)' : 'var(--neg)' }}>{r.delta}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
