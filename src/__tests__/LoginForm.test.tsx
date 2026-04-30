// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { LoginForm } from '@/components/login/LoginForm';

const fetchSpy = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchSpy);
  fetchSpy.mockReset();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('LoginForm', () => {
  it('renders email + password fields, sign-in submit, Google button', () => {
    render(<LoginForm locale="en" />);
    expect(screen.getByLabelText(/email/i)).toBeTruthy();
    expect(screen.getByLabelText(/password/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeTruthy();
  });

  it('posts keepSignedIn=true when checkbox checked', async () => {
    fetchSpy.mockResolvedValue({ ok: true, json: async () => ({ data: { user: {} } }) });
    render(<LoginForm locale="en" />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'a@b.co' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'pw1234' } });
    fireEvent.click(screen.getByLabelText(/keep me signed in/i));
    const form = screen.getByRole('button', { name: /sign in/i }).closest('form')!;
    fireEvent.submit(form);
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body.keepSignedIn).toBe(true);
  });

  it('navigates to /api/auth/google when Google button clicked', () => {
    const assignSpy = vi.fn();
    Object.defineProperty(window, 'location', { value: { ...window.location, assign: assignSpy }, writable: true });
    render(<LoginForm locale="en" />);
    fireEvent.click(screen.getByRole('button', { name: /continue with google/i }));
    expect(assignSpy).toHaveBeenCalledWith('/api/auth/google');
  });
});
