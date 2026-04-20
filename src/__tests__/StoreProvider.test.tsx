// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StoreProvider } from '@/components/providers/StoreProvider';

describe('StoreProvider', () => {
  it('renders children', () => {
    render(
      <StoreProvider>
        <span data-testid="child">hello</span>
      </StoreProvider>
    );
    expect(screen.getByTestId('child')).toBeDefined();
  });
});
