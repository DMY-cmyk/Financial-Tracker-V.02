import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb } from '@/server/db/sqlite';
import { resetSeeded, markSeeded } from '@/server/db/seed';
import { getSettings, updateSettings } from '@/server/services/settings.service';

beforeEach(() => {
  resetDb();
  resetSeeded();
  markSeeded();
});

describe('getSettings', () => {
  it('returns settings (may be empty on fresh DB)', () => {
    const result = getSettings();
    expect(result.error).toBeUndefined();
    expect(result.data).toBeDefined();
    expect(typeof result.data).toBe('object');
  });
});

describe('updateSettings', () => {
  it('sets and retrieves settings', () => {
    const result = updateSettings({ theme: 'dark', locale: 'id' });
    expect(result.error).toBeUndefined();
    expect(result.data).toBeDefined();
    expect(result.data!.theme).toBe('dark');
    expect(result.data!.locale).toBe('id');
  });

  it('updates existing settings', () => {
    updateSettings({ theme: 'dark' });
    const result = updateSettings({ theme: 'light' });
    expect(result.data!.theme).toBe('light');
  });

  it('preserves unmodified settings', () => {
    updateSettings({ theme: 'dark', locale: 'en' });
    updateSettings({ theme: 'light' });
    const result = getSettings();
    expect(result.data!.theme).toBe('light');
    expect(result.data!.locale).toBe('en');
  });

  it('returns validation error for empty object', () => {
    const result = updateSettings({});
    expect(result.error).toBeDefined();
    expect(result.error!.code).toBe('VALIDATION_ERROR');
  });

  it('returns validation error for non-string values', () => {
    const result = updateSettings({ theme: 123 as unknown as string });
    expect(result.error).toBeDefined();
    expect(result.error!.code).toBe('VALIDATION_ERROR');
  });
});
