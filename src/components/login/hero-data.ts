export interface TickerRow {
  symbol: string;
  value: string;
  delta: string;
  positive: boolean;
}

export const TICKER_ROWS: TickerRow[] = [
  { symbol: 'USD/IDR', value: '16,245', delta: '+0.12%', positive: true },
  { symbol: 'JKSE', value: '7,284.32', delta: '+0.84%', positive: true },
  { symbol: 'BTC', value: 'Rp 1.04B', delta: '−1.2%', positive: false },
  { symbol: 'GOLD', value: 'Rp 1.42M/g', delta: '+0.31%', positive: true },
  { symbol: 'BBCA', value: '9,825', delta: '+0.5%', positive: true },
  { symbol: 'BBRI', value: '4,720', delta: '−0.2%', positive: false },
];

export const HERO_STATS = {
  netWorth: 184_500_000,
  thisMonth: 3_210_000,
  categories: 36,
};
