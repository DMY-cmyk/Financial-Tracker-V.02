'use client';

import { useId } from 'react';

export interface EditorialFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'email' | 'password';
  autoComplete?: string;
  required?: boolean;
  autoFocus?: boolean;
}

export function EditorialField({
  label,
  value,
  onChange,
  type = 'text',
  autoComplete,
  required,
  autoFocus,
}: EditorialFieldProps) {
  const id = useId();
  return (
    <label htmlFor={id} className="block">
      <span className="ft-eyebrow mb-2 block">{label}</span>
      <input
        id={id}
        aria-label={label}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required={required}
        autoFocus={autoFocus}
        className="w-full border border-[var(--rule-soft)] bg-[var(--card-2)] px-3.5 py-3 text-sm text-[var(--ink)] outline-none transition-colors focus:border-[var(--accent)] focus:bg-[var(--card)]"
        style={{ borderRadius: 0, fontFamily: 'var(--font-sans), system-ui, sans-serif' }}
      />
    </label>
  );
}
