'use client';

import { useEffect, useState } from 'react';

export interface CountStatProps {
  label: string;
  target: number;
  format: (value: number) => string;
  color?: string;
  delayMs?: number;
}

export function CountStat({ label, target, format, color, delayMs = 0 }: CountStatProps) {
  const [val, setVal] = useState(0);

  useEffect(() => {
    let raf: number;
    let start: number | null = null;
    const dur = 1400;
    const tick = (ts: number) => {
      if (start === null) start = ts;
      const elapsed = ts - start - delayMs;
      const p = Math.min(1, Math.max(0, elapsed / dur));
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(target * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, delayMs]);

  return (
    <div>
      <div className="ft-eyebrow mb-1">{label}</div>
      <div className="ft-mono text-lg font-semibold" style={{ color: color ?? 'var(--ink)' }}>
        {format(val)}
      </div>
    </div>
  );
}
