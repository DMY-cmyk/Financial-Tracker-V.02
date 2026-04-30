import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb } from '@/server/db/client';
import {
  createResetToken,
  findResetTokenByHash,
  consumeResetToken,
} from '@/server/repositories/password-reset.repository';

describe('passwordResetRepository', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('creates and finds by hash', async () => {
    const token = await createResetToken({
      userId: 'user-1',
      tokenHash: 'hash-1',
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
    });
    expect(token.id).toBeTruthy();
    const found = await findResetTokenByHash('hash-1');
    expect(found?.user_id).toBe('user-1');
  });

  it('marks token as used', async () => {
    const token = await createResetToken({
      userId: 'user-1',
      tokenHash: 'hash-2',
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
    });
    await consumeResetToken(token.id);
    const found = await findResetTokenByHash('hash-2');
    expect(found?.used_at).toBeTruthy();
  });

  it('returns null for unknown hash', async () => {
    const found = await findResetTokenByHash('nonexistent');
    expect(found).toBeNull();
  });
});
