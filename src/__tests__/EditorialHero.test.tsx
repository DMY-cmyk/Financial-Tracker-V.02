// @vitest-environment happy-dom
import { afterEach, describe, it, expect } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { EditorialHero } from '@/components/login/EditorialHero';

afterEach(cleanup);

describe('EditorialHero', () => {
  it('renders ISSUE · SECURE LEDGER eyebrow (EN)', () => {
    render(<EditorialHero locale="en" />);
    expect(screen.getByText(/SECURE LEDGER/i)).toBeTruthy();
  });

  it('renders FINANCIAL TRACKER masthead', () => {
    render(<EditorialHero locale="en" />);
    expect(screen.getByText(/FINANCIAL/)).toBeTruthy();
    expect(screen.getByText(/TRACKER/)).toBeTruthy();
  });

  it('renders all three counter labels (EN)', () => {
    render(<EditorialHero locale="en" />);
    expect(screen.getByText(/Net worth/i)).toBeTruthy();
    expect(screen.getByText(/This month/i)).toBeTruthy();
    expect(screen.getByText(/Categories/i)).toBeTruthy();
  });

  it('uses Indonesian labels when locale=id', () => {
    render(<EditorialHero locale="id" />);
    expect(screen.getByText(/Kekayaan bersih/i)).toBeTruthy();
  });
});
