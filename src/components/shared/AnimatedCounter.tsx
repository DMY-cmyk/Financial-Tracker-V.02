'use client';

import { useEffect, useRef } from 'react';
import { useSpring, useMotionValue, motion, useTransform } from 'framer-motion';
import { counterSpring } from '@/lib/motion';

interface AnimatedCounterProps {
  value: number;
  format?: (n: number) => string;
  className?: string;
}

export function AnimatedCounter({ value, format, className }: AnimatedCounterProps) {
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, counterSpring);
  const display = useTransform(spring, (v) =>
    format ? format(Math.round(v)) : Math.round(v).toLocaleString()
  );
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    motionValue.set(value);
  }, [value, motionValue]);

  useEffect(() => {
    const unsub = display.on('change', (latest) => {
      if (ref.current) ref.current.textContent = latest;
    });
    return unsub;
  }, [display]);

  return <motion.span ref={ref} className={className} />;
}
