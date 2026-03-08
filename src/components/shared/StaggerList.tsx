'use client';

import { motion } from 'framer-motion';
import { staggerContainer, staggerItem, staggerGrid, staggerGridItem } from '@/lib/motion';
import { cn } from '@/lib/utils';

interface StaggerListProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'list' | 'grid';
}

export function StaggerList({ children, className, variant = 'list' }: StaggerListProps) {
  const containerVariant = variant === 'grid' ? staggerGrid : staggerContainer;

  return (
    <motion.div
      variants={containerVariant}
      initial="hidden"
      animate="show"
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}

interface StaggerItemProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'list' | 'grid';
}

export function StaggerItem({ children, className, variant = 'list' }: StaggerItemProps) {
  const itemVariant = variant === 'grid' ? staggerGridItem : staggerItem;

  return (
    <motion.div variants={itemVariant} className={cn(className)}>
      {children}
    </motion.div>
  );
}
