'use client';

import { useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { t, useLocale } from '@/lib/i18n';

export interface EditorialFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'email' | 'password';
  autoComplete?: string;
  required?: boolean;
  autoFocus?: boolean;
  error?: string;
}

export function EditorialField({
  label,
  value,
  onChange,
  type = 'text',
  autoComplete,
  required,
  autoFocus,
  error,
}: EditorialFieldProps) {
  const id = useId();
  const errorId = useId();
  const locale = useLocale();
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword && show ? 'text' : type;

  return (
    <div>
      <label htmlFor={id} className="ft-eyebrow mb-2 block">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          required={required}
          autoFocus={autoFocus}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`w-full border border-[var(--rule-soft)] bg-[var(--card-2)] px-3.5 py-3 text-sm text-[var(--ink)] transition-colors outline-none focus:border-[var(--accent)] focus:bg-[var(--card)] ${isPassword ? 'pr-12' : ''}`}
          style={{ borderRadius: 0, fontFamily: 'var(--font-sans), system-ui, sans-serif' }}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            aria-label={t(locale, show ? 'hidePassword' : 'showPassword')}
            aria-pressed={show}
            className="absolute top-1/2 right-0 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-[var(--ink-3)] transition-colors hover:text-[var(--ink)]"
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-xs text-[var(--neg)]">
          {error}
        </p>
      )}
    </div>
  );
}
