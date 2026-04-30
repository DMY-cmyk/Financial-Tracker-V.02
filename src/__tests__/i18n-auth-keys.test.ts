import { describe, it, expect } from 'vitest';
import { t } from '@/lib/i18n';

const KEYS = [
  'authHeroDek',
  'authHeroLive30',
  'authHeroNetWorth',
  'authHeroThisMonth',
  'authHeroCategories',
  'authWelcomeBack',
  'authSignInSubtitle',
  'authPasswordLabel',
  'authKeepSignedIn',
  'authOr',
  'authContinueGoogle',
  'authForgotPassword',
  'authCreateAccount',
  'authTLSEncrypted',
  'authSessionEnded',
  'forgotTitle',
  'forgotSubtitle',
  'forgotSubmit',
  'forgotSent',
  'forgotResendIn',
  'resetTitle',
  'resetSubtitle',
  'resetSubmit',
  'resetStrength',
  'resetMismatch',
  'oauthErrorGeneric',
  'oauthErrorEmailUnverified',
  'oauthErrorStateMismatch',
  'authOpeningBooks',
  'authIssue',
  'authSecureLedger',
] as const;

describe('i18n — auth keys', () => {
  for (const k of KEYS) {
    it(`has EN and ID for "${k}"`, () => {
      const en = t('en', k as Parameters<typeof t>[1]);
      const id = t('id', k as Parameters<typeof t>[1]);
      expect(en).toBeTruthy();
      expect(id).toBeTruthy();
      expect(en).not.toBe(k);
      expect(id).not.toBe(k);
    });
  }
});
