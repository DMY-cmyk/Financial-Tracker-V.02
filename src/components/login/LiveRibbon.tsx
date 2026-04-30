'use client';

const POINTS: number[] = Array.from(
  { length: 30 },
  (_, i) => 50 + Math.sin(i * 0.4) * 18 + Math.cos(i * 0.2) * 8
);

export function LiveRibbon() {
  const w = 460;
  const h = 70;
  const path = POINTS.map(
    (p, i) => `${i === 0 ? 'M' : 'L'}${(i / (POINTS.length - 1)) * w},${p}`
  ).join(' ');
  const area = `${path} L${w},${h} L0,${h} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="block h-auto w-full" aria-hidden>
      <defs>
        <linearGradient id="ftRibbon" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--accent-2)" stopOpacity="0.32" />
          <stop offset="100%" stopColor="var(--accent-2)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#ftRibbon)" />
      <path
        d={path}
        fill="none"
        stroke="var(--accent-2)"
        strokeWidth={1.5}
        strokeDasharray="4 3"
        style={{ animation: 'ftFlow 4s linear infinite' }}
      />
      <circle
        cx={w}
        cy={POINTS[POINTS.length - 1]}
        r={3.5}
        fill="var(--accent-2)"
        style={{ animation: 'ftPulseSoft 1.6s ease-in-out infinite' }}
      />
    </svg>
  );
}
