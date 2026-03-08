'use client';

import { motion, type HTMLMotionProps } from 'framer-motion';
import { fadeInUp } from '@/lib/motion';
import { cn } from '@/lib/utils';

interface MotionWrapperProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export function MotionWrapper({ children, className, delay = 0, ...props }: MotionWrapperProps) {
  return (
    <motion.div
      initial={fadeInUp.initial}
      animate={fadeInUp.animate}
      transition={{ ...fadeInUp.transition, delay }}
      className={cn(className)}
      {...props}
    >
      {children}
    </motion.div>
  );
}
