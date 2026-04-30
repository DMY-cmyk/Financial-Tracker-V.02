import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const env = readFileSync(resolve('.env.example'), 'utf-8');

describe('.env.example', () => {
  it('declares Resend + email vars', () => {
    expect(env).toMatch(/^RESEND_API_KEY=/m);
    expect(env).toMatch(/^EMAIL_FROM=/m);
  });
  it('declares APP_URL', () => {
    expect(env).toMatch(/^APP_URL=/m);
  });
  it('declares Google OAuth vars', () => {
    expect(env).toMatch(/^GOOGLE_CLIENT_ID=/m);
    expect(env).toMatch(/^GOOGLE_CLIENT_SECRET=/m);
    expect(env).toMatch(/^GOOGLE_REDIRECT_URI=/m);
  });
});
