// src/lib/chart-renderer.ts
// CLIENT-ONLY — never import from Server Components or API routes.
// All chart.js imports are dynamic so this module is safe to import in hooks.

// Chart-export palette. Values mirror the editorial chart-color tokens in globals.css.
// Canvas renderers cannot resolve CSS variables, so we keep literal hex shades here.
const PIE_COLORS = [
  '#1d4ed8',
  '#059669',
  '#d97706',
  '#dc2626',
  '#8b5cf6',
  '#06b6d4',
  '#f97316',
  '#84cc16',
  '#ec4899',
];

function formatAmountShort(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return `${sign}${(abs / 1_000_000_000).toFixed(1)}M`;
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}jt`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(0)}rb`;
  return `${sign}${abs}`;
}

/**
 * Renders a doughnut chart of income vs expense.
 * Center label shows net balance via a custom afterDraw plugin.
 * Returns a base64 PNG data URL.
 */
export async function renderDonutChart(income: number, expense: number): Promise<string> {
  const { Chart } = await import('chart.js/auto');
  const canvas = document.createElement('canvas');
  canvas.width = 300;
  canvas.height = 300;
  const ctx = canvas.getContext('2d')!;
  const net = income - expense;

  const chart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Pemasukan', 'Pengeluaran'],
      datasets: [
        {
          data: [income, expense],
          backgroundColor: ['#059669', '#dc2626'],
          borderWidth: 2,
          borderColor: '#ffffff',
        },
      ],
    },
    options: {
      responsive: false,
      animation: false,
      plugins: {
        legend: { position: 'bottom', labels: { font: { size: 11 } } },
      },
    },
    plugins: [
      {
        id: 'centerLabel',
        afterDraw(ch) {
          const {
            ctx: c,
            chartArea: { left, right, top, bottom },
          } = ch;
          const cx = (left + right) / 2;
          const cy = (top + bottom) / 2;
          c.save();
          c.textAlign = 'center';
          c.textBaseline = 'middle';
          c.font = 'bold 13px sans-serif';
          c.fillStyle = net >= 0 ? '#059669' : '#dc2626';
          c.fillText('Saldo', cx, cy - 9);
          c.font = 'bold 12px sans-serif';
          c.fillText(formatAmountShort(net), cx, cy + 9);
          c.restore();
        },
      },
    ],
  });

  const dataUrl = canvas.toDataURL('image/png');
  chart.destroy();
  return dataUrl;
}

/**
 * Renders a horizontal bar chart showing income, expense, and net (cashflow).
 * Bar colour for Saldo is blue (positive) or amber (negative).
 * Returns a base64 PNG data URL.
 */
export async function renderCashflowChart(
  income: number,
  expense: number,
  net: number
): Promise<string> {
  const { Chart } = await import('chart.js/auto');
  const canvas = document.createElement('canvas');
  canvas.width = 500;
  canvas.height = 200;
  const ctx = canvas.getContext('2d')!;

  const chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Pemasukan', 'Pengeluaran', 'Saldo'],
      datasets: [
        {
          data: [income, expense, Math.abs(net)],
          backgroundColor: ['#059669', '#dc2626', net >= 0 ? '#1d4ed8' : '#d97706'],
          borderWidth: 0,
          borderRadius: 4,
        },
      ],
    },
    options: {
      indexAxis: 'y',
      responsive: false,
      animation: false,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false },
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: {
            callback: (v) => formatAmountShort(Number(v)),
            font: { size: 10 },
          },
        },
        y: { ticks: { font: { size: 11 } } },
      },
    },
  });

  const dataUrl = canvas.toDataURL('image/png');
  chart.destroy();
  return dataUrl;
}

/**
 * Renders a pie chart of expense categories.
 * Top 8 categories shown; the rest summed as "Lainnya".
 * Empty input renders a single grey "Tidak ada data" segment.
 * Returns a base64 PNG data URL.
 */
export async function renderExpensePieChart(
  categories: { category: string; total: number }[]
): Promise<string> {
  const { Chart } = await import('chart.js/auto');
  const canvas = document.createElement('canvas');
  canvas.width = 420;
  canvas.height = 300;
  const ctx = canvas.getContext('2d')!;

  let labels: string[];
  let data: number[];
  let colors: string[];

  if (categories.length === 0) {
    labels = ['Tidak ada data'];
    data = [1];
    colors = ['#d1d5db'];
  } else {
    const sorted = [...categories].sort((a, b) => b.total - a.total);
    const top8 = sorted.slice(0, 8);
    const rest = sorted.slice(8).reduce((s, c) => s + c.total, 0);
    labels = [...top8.map((c) => c.category), ...(rest > 0 ? ['Lainnya'] : [])];
    data = [...top8.map((c) => c.total), ...(rest > 0 ? [rest] : [])];
    colors = labels.map((_, i) => PIE_COLORS[i % PIE_COLORS.length]);
  }

  const chart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels,
      datasets: [{ data, backgroundColor: colors, borderWidth: 1, borderColor: '#ffffff' }],
    },
    options: {
      responsive: false,
      animation: false,
      plugins: {
        legend: {
          position: 'right',
          labels: { font: { size: 10 }, boxWidth: 12, padding: 8 },
        },
      },
    },
  });

  const dataUrl = canvas.toDataURL('image/png');
  chart.destroy();
  return dataUrl;
}
