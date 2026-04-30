import { describe, it, expect } from 'vitest';
import { renderPasswordResetEmail } from '@/server/email/templates/password-reset';

describe('renderPasswordResetEmail', () => {
  it('returns subject + html + text for EN locale', () => {
    const out = renderPasswordResetEmail({
      locale: 'en',
      resetUrl: 'https://app/reset?token=x',
    });
    expect(out.subject.toLowerCase()).toContain('reset');
    expect(out.html).toContain('https://app/reset?token=x');
    expect(out.text).toContain('https://app/reset?token=x');
  });

  it('returns Indonesian copy for ID locale', () => {
    const out = renderPasswordResetEmail({
      locale: 'id',
      resetUrl: 'https://app/reset?token=y',
    });
    expect(out.subject.toLowerCase()).toMatch(/reset|sandi/);
    expect(out.html).toContain('https://app/reset?token=y');
  });
});
