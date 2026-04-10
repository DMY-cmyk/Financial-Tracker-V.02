'use client';

import { cn } from '@/lib/utils';
import {
  Landmark,
  Building2,
  Smartphone,
  Wallet,
  CreditCard,
  Banknote,
  Coins,
  PiggyBank,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { normalizeIconValue, computeInitials } from '@/lib/payment-method-icon-utils';

// Static map of supported Lucide icons.
// Add new entries here to support more icon options in the picker.
const ICON_MAP: Record<string, LucideIcon> = {
  'lucide:landmark': Landmark,
  'lucide:building-2': Building2,
  'lucide:smartphone': Smartphone,
  'lucide:wallet': Wallet,
  'lucide:credit-card': CreditCard,
  'lucide:banknote': Banknote,
  'lucide:coins': Coins,
  'lucide:piggy-bank': PiggyBank,
};

const SIZE_CONTAINER: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'h-6 w-6',
  md: 'h-8 w-8',
  lg: 'h-10 w-10',
};

const SIZE_ICON: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

const SIZE_TEXT: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'text-[8px]',
  md: 'text-[10px]',
  lg: 'text-xs',
};

const TYPE_COLORS: Record<'bank' | 'cash' | 'ewallet', string> = {
  bank: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  cash: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  ewallet: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
};

export interface PaymentMethodIconProps {
  name: string;
  icon: string | null;
  type: 'bank' | 'cash' | 'ewallet';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function PaymentMethodIcon({
  name,
  icon,
  type,
  size = 'md',
  className,
}: PaymentMethodIconProps) {
  const normalized = normalizeIconValue(icon);
  const colorClass = TYPE_COLORS[type];

  // Try to look up a Lucide icon from the static map
  const LucideIconComponent = ICON_MAP[normalized];
  if (LucideIconComponent) {
    return (
      <div
        className={cn(
          'flex shrink-0 items-center justify-center rounded-lg',
          SIZE_CONTAINER[size],
          colorClass,
          className
        )}
        aria-hidden="true"
      >
        <LucideIconComponent className={SIZE_ICON[size]} />
      </div>
    );
  }

  // Initials badge: used for 'initials' value OR unknown lucide icon names (graceful fallback)
  const initials = computeInitials(name);
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-lg font-mono',
        SIZE_CONTAINER[size],
        colorClass,
        className
      )}
      aria-hidden="true"
    >
      <span className={cn('font-semibold leading-none', SIZE_TEXT[size])}>{initials}</span>
    </div>
  );
}
