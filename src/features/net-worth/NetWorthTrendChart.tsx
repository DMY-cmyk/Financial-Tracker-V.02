'use client';

import { t, useLocale } from '@/lib/i18n';
import { formatCurrency } from '@/lib/formatters';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { NetWorthSnapshot } from '@/lib/types';

interface NetWorthTrendChartProps {
  history: NetWorthSnapshot[];
}

const MONTH_NAMES_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTH_NAMES_ID = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

function CustomTooltip({
  active,
  payload,
  locale,
}: {
  active?: boolean;
  payload?: { payload: NetWorthSnapshot & { label: string } }[];
  locale: string;
}) {
  if (!active || !payload?.length) return null;
  const snap = payload[0].payload;

  return (
    <div className="bg-popover border-border rounded-xl border p-3 text-xs shadow-lg">
      <p className="mb-2 font-semibold">{snap.label} · {formatCurrency(snap.netWorth)}</p>
      {snap.snapshotData && (
        <div className="space-y-1 text-[11px]">
          <div className="flex justify-between gap-8">
            <span className="text-muted-foreground">{locale === 'id' ? 'Rekening' : 'Accounts'}</span>
            <span className="font-mono">{formatCurrency(snap.snapshotData.paymentMethodBalances)}</span>
          </div>
          <div className="flex justify-between gap-8">
            <span className="text-muted-foreground">{locale === 'id' ? 'Tabungan' : 'Savings'}</span>
            <span className="font-mono">{formatCurrency(snap.snapshotData.savingsGoals)}</span>
          </div>
          <div className="flex justify-between gap-8">
            <span className="text-muted-foreground">{locale === 'id' ? 'Kewajiban' : 'Liabilities'}</span>
            <span className="font-mono text-red-500">−{formatCurrency(snap.snapshotData.liabilities)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function NetWorthTrendChart({ history }: NetWorthTrendChartProps) {
  const locale = useLocale();
  const months = locale === 'id' ? MONTH_NAMES_ID : MONTH_NAMES_EN;

  const data = history.map((snap) => ({
    ...snap,
    label: `${months[snap.month]} ${snap.year}`,
  }));

  if (data.length === 0) {
    return (
      <div className="border-border bg-card rounded-2xl border p-6">
        <p className="mb-4 text-sm font-semibold">{t(locale, 'netWorthHistory')}</p>
        <p className="text-muted-foreground py-8 text-center text-sm">
          {t(locale, 'noSnapshotsYet')}
        </p>
      </div>
    );
  }

  return (
    <div className="border-border bg-card rounded-2xl border p-6">
      <p className="mb-4 text-sm font-semibold">{t(locale, 'netWorthHistory')}</p>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="nwGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tickFormatter={(v: number) => {
              if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(0)}jt`;
              if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}rb`;
              return String(v);
            }}
            tick={{ fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            width={48}
          />
          <Tooltip content={<CustomTooltip locale={locale} />} />
          <Area
            type="monotone"
            dataKey="netWorth"
            stroke="#2563eb"
            strokeWidth={2}
            fill="url(#nwGradient)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
