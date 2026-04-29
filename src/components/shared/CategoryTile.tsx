'use client';

import Link from 'next/link';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CategoryTileProps {
  label: string;
  icon: LucideIcon;
  active?: boolean;
  href?: string;
  onClick?: () => void;
}

export function CategoryTile({ label, icon: Icon, active, href, onClick }: CategoryTileProps) {
  const classes = cn(
    'flex aspect-[1/1.05] flex-col items-center justify-center gap-2 rounded-2xl p-3 text-xs font-medium transition-colors',
    active ? 'bg-tile-active text-tile-active-foreground' : 'bg-tile text-tile-foreground'
  );

  const content = (
    <>
      <Icon className="h-6 w-6" aria-hidden="true" />
      <span>{label}</span>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={classes}
        onClick={onClick}
        aria-current={active ? 'page' : undefined}
      >
        {content}
      </Link>
    );
  }

  return (
    <button type="button" className={classes} onClick={onClick}>
      {content}
    </button>
  );
}
