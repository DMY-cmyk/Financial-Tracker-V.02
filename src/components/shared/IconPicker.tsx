'use client';

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
import { cn } from '@/lib/utils';
import { t } from '@/lib/i18n';
import { computeInitials, suggestIconFromName } from '@/lib/payment-method-icon-utils';

interface IconOption {
  value: string;
  label: string;
  Icon: LucideIcon | null; // null = use initials preview
}

const ICON_OPTIONS: IconOption[] = [
  { value: 'initials', label: 'Auto', Icon: null },
  { value: 'lucide:landmark', label: 'Landmark', Icon: Landmark },
  { value: 'lucide:building-2', label: 'Building', Icon: Building2 },
  { value: 'lucide:smartphone', label: 'Smartphone', Icon: Smartphone },
  { value: 'lucide:wallet', label: 'Wallet', Icon: Wallet },
  { value: 'lucide:credit-card', label: 'Credit Card', Icon: CreditCard },
  { value: 'lucide:banknote', label: 'Banknote', Icon: Banknote },
  { value: 'lucide:coins', label: 'Coins', Icon: Coins },
  { value: 'lucide:piggy-bank', label: 'Piggy Bank', Icon: PiggyBank },
];

export interface IconPickerProps {
  value: string;
  onChange: (icon: string) => void;
  paymentMethodName?: string;
  type?: 'bank' | 'cash' | 'ewallet';
  locale: 'en' | 'id';
}

export function IconPicker({ value, onChange, paymentMethodName = '', locale }: IconPickerProps) {
  const suggestion = paymentMethodName ? suggestIconFromName(paymentMethodName) : null;

  return (
    <div>
      <p className="text-muted-foreground mb-1.5 text-xs">{t(locale, 'chooseIcon')}</p>
      <div className="grid grid-cols-3 gap-1.5">
        {ICON_OPTIONS.map((opt) => {
          const isSelected = value === opt.value;
          const isSuggested = suggestion === opt.value;

          return (
            <button
              key={opt.value}
              type="button"
              aria-label={opt.label}
              aria-pressed={isSelected}
              onClick={() => onChange(opt.value)}
              className={cn(
                'flex h-10 flex-col items-center justify-center gap-0.5 rounded-lg border transition-colors hover:bg-accent',
                isSelected && 'border-primary ring-2 ring-primary ring-offset-1',
                !isSelected && isSuggested && 'border-primary/40',
                !isSelected && !isSuggested && 'border-border'
              )}
            >
              {opt.Icon ? (
                <opt.Icon className="h-4 w-4" />
              ) : (
                <span className="font-mono text-[9px] font-semibold leading-none">
                  {paymentMethodName
                    ? computeInitials(paymentMethodName)
                    : t(locale, 'autoInitials').slice(0, 2)}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {suggestion && suggestion !== value && (
        <p className="text-muted-foreground mt-1 text-[10px]">
          {t(locale, 'iconStyle')}: {ICON_OPTIONS.find((o) => o.value === suggestion)?.label}
        </p>
      )}
    </div>
  );
}
