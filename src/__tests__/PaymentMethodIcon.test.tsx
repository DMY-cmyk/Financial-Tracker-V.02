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
