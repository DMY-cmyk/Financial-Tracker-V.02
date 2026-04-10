// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PaymentMethodIcon } from '@/components/shared/PaymentMethodIcon';

describe('PaymentMethodIcon — initials badge', () => {
  it('renders initials "BCA" for icon=initials name=BCA', () => {
    render(<PaymentMethodIcon name="BCA" icon="initials" type="bank" />);
    expect(screen.getByText('BCA')).toBeDefined();
  });

  it('renders initials fallback for icon=null without crashing', () => {
    render(<PaymentMethodIcon name="Test" icon={null} type="cash" />);
    // computeInitials('Test') → 'TES'
    expect(screen.getByText('TES')).toBeDefined();
  });
});

describe('PaymentMethodIcon — Lucide icons', () => {
  it('renders an SVG for icon=lucide:landmark with blue container (bank)', () => {
    const { container } = render(
      <PaymentMethodIcon name="BCA" icon="lucide:landmark" type="bank" />
    );
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain('bg-blue-100');
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('renders an SVG for icon=lucide:smartphone with emerald container (ewallet)', () => {
    const { container } = render(
      <PaymentMethodIcon name="GoPay" icon="lucide:smartphone" type="ewallet" />
    );
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain('bg-emerald-100');
    expect(container.querySelector('svg')).not.toBeNull();
  });
});

describe('PaymentMethodIcon — size variants', () => {
  it('size=sm → container has class h-6 w-6', () => {
    const { container } = render(
      <PaymentMethodIcon name="BCA" icon="initials" type="bank" size="sm" />
    );
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain('h-6');
    expect(el.className).toContain('w-6');
  });

  it('size=lg → container has class h-10 w-10', () => {
    const { container } = render(
      <PaymentMethodIcon name="BCA" icon="initials" type="bank" size="lg" />
    );
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain('h-10');
    expect(el.className).toContain('w-10');
  });
});

describe('PaymentMethodIcon — edge cases', () => {
  it('icon="wallet" (legacy bare name) renders Wallet SVG via normalization', () => {
    const { container } = render(
      <PaymentMethodIcon name="My Wallet" icon="wallet" type="cash" />
    );
    // normalizeIconValue('wallet') → 'lucide:wallet', which is in ICON_MAP → renders SVG
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('unknown lucide icon name falls back to initials without crashing', () => {
    render(<PaymentMethodIcon name="Test" icon="lucide:nonexistent" type="cash" />);
    // computeInitials('Test') → 'TES'
    expect(screen.getAllByText('TES').length).toBeGreaterThan(0);
  });
});
