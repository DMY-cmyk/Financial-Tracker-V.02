// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { Button } from '@/components/ui/button';

afterEach(() => cleanup());

describe('Button variant="mint"', () => {
  it('applies brand-mint background and foreground', () => {
    const { container } = render(<Button variant="mint">Save</Button>);
    const btn = container.querySelector('button')!;
    expect(btn.className).toContain('bg-brand-mint');
    expect(btn.className).toContain('text-brand-mint-foreground');
  });

  it('uses brand-mint-strong on hover', () => {
    const { container } = render(<Button variant="mint">Save</Button>);
    expect(container.querySelector('button')!.className).toContain('hover:bg-brand-mint-strong');
  });

  it('default variant is unchanged (still bg-primary)', () => {
    const { container } = render(<Button>Default</Button>);
    expect(container.querySelector('button')!.className).toContain('bg-primary');
  });
});
