import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb } from '@/server/db/client';
import { resetSeeded, markSeeded } from '@/server/db/seed';
import { registerUser, loginUser, getUserFromToken } from '@/server/services/auth.service';

beforeEach(async () => {
  await resetDb();
  resetSeeded();
  markSeeded();
});

describe('registerUser', () => {
  it('creates a new user and returns user + token', async () => {
    const result = await registerUser('alice@example.com', 'Alice', 'password123');
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.user.email).toBe('alice@example.com');
    expect(result.user.name).toBe('Alice');
    expect(result.user.id).toBeDefined();
    expect(result.token).toBeDefined();
    expect(typeof result.token).toBe('string');
    expect(result.token.split('.').length).toBe(3); // JWT has 3 parts
    expect('password_hash' in result.user).toBe(false);
    expect('password' in result.user).toBe(false);
  });

  it('normalizes email to lowercase', async () => {
    const result = await registerUser('ALICE@EXAMPLE.COM', 'Alice', 'password123');
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.user.email).toBe('alice@example.com');
  });

  it('returns error for duplicate email', async () => {
    await registerUser('alice@example.com', 'Alice', 'password123');
    const result = await registerUser('alice@example.com', 'Alice2', 'password456');
    expect('error' in result).toBe(true);
    if (!('error' in result)) return;
    expect(result.error).toContain('already registered');
  });

  it('duplicate email check is case-insensitive', async () => {
    await registerUser('alice@example.com', 'Alice', 'password123');
    const result = await registerUser('ALICE@EXAMPLE.COM', 'Alice2', 'password456');
    expect('error' in result).toBe(true);
  });
});

describe('loginUser', () => {
  it('returns user + token for valid credentials', async () => {
    await registerUser('bob@example.com', 'Bob', 'mypassword');
    const result = await loginUser('bob@example.com', 'mypassword');
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.user.email).toBe('bob@example.com');
    expect(result.token).toBeDefined();
    expect(result.token.split('.').length).toBe(3); // JWT has 3 parts
  });

  it('login is case-insensitive for email', async () => {
    await registerUser('bob@example.com', 'Bob', 'mypassword');
    const result = await loginUser('BOB@EXAMPLE.COM', 'mypassword');
    expect('error' in result).toBe(false);
  });

  it('returns error for wrong password', async () => {
    await registerUser('bob@example.com', 'Bob', 'mypassword');
    const result = await loginUser('bob@example.com', 'wrongpassword');
    expect('error' in result).toBe(true);
    if (!('error' in result)) return;
    expect(result.error).toContain('Invalid');
  });

  it('returns error for non-existent email', async () => {
    const result = await loginUser('nobody@example.com', 'password123');
    expect('error' in result).toBe(true);
    if (!('error' in result)) return;
    expect(result.error).toContain('Invalid');
  });
});

describe('getUserFromToken', () => {
  it('returns user payload for a valid token', async () => {
    const reg = await registerUser('carol@example.com', 'Carol', 'password123');
    if ('error' in reg) throw new Error('register failed');
    const user = await getUserFromToken(reg.token);
    expect(user).not.toBeNull();
    expect(user!.email).toBe('carol@example.com');
    expect(user!.name).toBe('Carol');
    expect(user!.id).toBe(reg.user.id);
  });

  it('returns null for an invalid token', async () => {
    const user = await getUserFromToken('not.a.valid.token');
    expect(user).toBeNull();
  });

  it('returns null for an empty string', async () => {
    const user = await getUserFromToken('');
    expect(user).toBeNull();
  });

  it('returns null for a tampered token', async () => {
    const reg = await registerUser('dave@example.com', 'Dave', 'password123');
    if ('error' in reg) throw new Error('register failed');
    const tampered = reg.token.slice(0, -5) + 'XXXXX';
    const user = await getUserFromToken(tampered);
    expect(user).toBeNull();
  });
});
