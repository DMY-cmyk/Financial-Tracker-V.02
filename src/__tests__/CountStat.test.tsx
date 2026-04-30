// @vitest-environment happy-dom
import { afterEach, describe, it, expect } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import { CountStat } from '@/components/login/CountStat';

afterEach(cleanup);

describe('CountStat', () => {
  it('renders eyebrow label and final formatted value after animation completes', async () => {
    render(<CountStat label="Net worth" target={100} format={(v) => `Rp ${Math.round(v)}`} />);
    expect(screen.getByText('Net worth')).toBeTruthy();
    // Animation completes within 1.4s; advance enough.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 1600));
    });
    expect(screen.getByText('Rp 100')).toBeTruthy();
  });
});
