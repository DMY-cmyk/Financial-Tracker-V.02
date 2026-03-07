'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface AnimatedCounterProps {
  value: number;
  className?: string;
  prefix?: string;
}

export function AnimatedCounter({ value, className, prefix }: AnimatedCounterProps) {
  const spring = useSpring(0, { stiffness: 100, damping: 30 });
  const display = useTransform(spring, (v) => formatCurrency(Math.round(v)));
  const [rendered, setRendered] = useState(formatCurrency(0));
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  useEffect(() => {
    const unsubscribe = display.on('change', (v) => {
      setRendered(v);
    });
    return unsubscribe;
  }, [display]);

  return (
    <motion.span
      ref={ref}
      className={cn('font-mono tabular-nums', className)}
    >
      {prefix}{rendered}
    </motion.span>
  );
}
