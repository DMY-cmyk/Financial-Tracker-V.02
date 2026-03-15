'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { staggerGridItem, hoverLift, tapScale } from '@/lib/motion';
import type { LucideIcon } from 'lucide-react';

interface FeatureCardProps {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
}

export function FeatureCard({ href, icon: Icon, title, description }: FeatureCardProps) {
  return (
    <motion.div variants={staggerGridItem} whileHover={hoverLift} whileTap={tapScale}>
      <Link
        href={href}
        className="bg-card hover:border-border flex h-full flex-col rounded-2xl border border-transparent p-5 transition-shadow hover:shadow-md"
      >
        <div className="bg-primary/10 text-primary mb-3 flex h-10 w-10 items-center justify-center rounded-xl">
          <Icon className="h-5 w-5" />
        </div>
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{description}</p>
      </Link>
    </motion.div>
  );
}
