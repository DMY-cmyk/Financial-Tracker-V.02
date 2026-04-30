// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { EditorialField } from '@/components/login/EditorialField';

afterEach(() => cleanup());

describe('EditorialField', () => {
  it('renders label as eyebrow + input', () => {
    render(<EditorialField label="Email" value="" onChange={() => {}} />);
    expect(screen.getByText('Email')).toBeTruthy();
    expect(screen.getByRole('textbox')).toBeTruthy();
  });

  it('emits onChange when typing', () => {
    let val = '';
    const handle = (v: string) => {
      val = v;
    };
    render(<EditorialField label="Email" value={val} onChange={handle} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'a@b.c' } });
    expect(val).toBe('a@b.c');
  });

  it('renders type=password and hides text', () => {
    render(
      <EditorialField label="Password" value="secret" onChange={() => {}} type="password" />,
    );
    const input = screen.getByLabelText('Password') as HTMLInputElement;
    expect(input.type).toBe('password');
  });
});
