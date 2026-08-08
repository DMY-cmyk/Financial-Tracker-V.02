import { describe, it, expect, beforeEach } from 'vitest';
import { getDb, resetDb } from '@/server/db/client';
import { resetSeeded, markSeeded } from '@/server/db/seed';
import { registerUser } from '@/server/services/auth.service';
import { handleGoogleCallbackUser } from '@/server/services/oauth.service';
import { provisionDefaultsForUser } from '@/server/services/user-provisioning.service';
import { listCategories } from '@/server/services/category.service';
import { listPaymentMethods } from '@/server/services/payment-method.service';

const profile = (sub: string, email: string) => ({
  sub,
  email,
  email_verified: true,
  name: email.split('@')[0],
  picture: 'p',
});

beforeEach(async () => {
  await resetDb();
  resetSeeded();
  markSeeded();
});

describe('provisionDefaultsForUser', () => {
  it('gives a user default categories and payment methods', async () => {
    const db = await getDb();
    await db.query(`INSERT INTO users (id, email, name) VALUES ('u1', 'u1@x.co', 'U1')`);

    await provisionDefaultsForUser('u1');

    const cats = await listCategories('u1', {});
    const pms = await listPaymentMethods('u1');
    expect(cats.data!.length).toBeGreaterThan(0);
    expect(cats.data!.some((c) => c.type === 'income')).toBe(true);
    expect(cats.data!.some((c) => c.type === 'expense')).toBe(true);
    expect(pms.data!.length).toBeGreaterThan(0);
  });

  it('is a no-op when the user already has categories', async () => {
    const db = await getDb();
    await db.query(`INSERT INTO users (id, email, name) VALUES ('u1', 'u1@x.co', 'U1')`);
    await provisionDefaultsForUser('u1');
    const before = (await listCategories('u1', {})).data!.length;

    await provisionDefaultsForUser('u1');

    expect((await listCategories('u1', {})).data!.length).toBe(before);
  });
});

describe('new accounts are provisioned and independent', () => {
  it('a new Google user gets their own defaults', async () => {
    const r = await handleGoogleCallbackUser(profile('g-new', 'new@x.co'));
    expect(r.data!.isNew).toBe(true);

    const cats = await listCategories(r.data!.user.id, {});
    expect(cats.data!.length).toBeGreaterThan(0);
  });

  it('a new email-registered user gets their own defaults', async () => {
    const r = await registerUser('reg@x.co', 'Reg', 'pw123456');
    expect('user' in r).toBe(true);
    const userId = (r as { user: { id: string } }).user.id;

    const cats = await listCategories(userId, {});
    expect(cats.data!.length).toBeGreaterThan(0);
  });

  it('two different Google accounts become two isolated users', async () => {
    const a = await handleGoogleCallbackUser(profile('g-a', 'alice@x.co'));
    const b = await handleGoogleCallbackUser(profile('g-b', 'bob@x.co'));
    expect(a.data!.user.id).not.toBe(b.data!.user.id);

    // Alice customizes; Bob must not see it
    const db = await getDb();
    await db.query(
      `INSERT INTO categories (id, user_id, name, type, color, icon, budget)
       VALUES ('alice-cat', ?, 'Alice Only', 'expense', '#123456', 'star', 0)`,
      [a.data!.user.id]
    );

    const bobCats = await listCategories(b.data!.user.id, {});
    expect(bobCats.data!.some((c) => c.name === 'Alice Only')).toBe(false);
  });

  it('signing in again with the same Google account does NOT re-provision or duplicate', async () => {
    const first = await handleGoogleCallbackUser(profile('g-same', 'same@x.co'));
    const count1 = (await listCategories(first.data!.user.id, {})).data!.length;

    const second = await handleGoogleCallbackUser(profile('g-same', 'same@x.co'));
    expect(second.data!.isNew).toBe(false);
    expect(second.data!.user.id).toBe(first.data!.user.id);

    const count2 = (await listCategories(first.data!.user.id, {})).data!.length;
    expect(count2).toBe(count1);
  });
});
