import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { getDb } from '@/server/db/client';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'financial-tracker-secret-key-change-in-production'
);
const JWT_ISSUER = 'financial-tracker';
const JWT_EXPIRY = '7d';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

interface UserRow {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  created_at: string;
}

export async function registerUser(
  email: string,
  name: string,
  password: string
): Promise<{ user: AuthUser; token: string } | { error: string }> {
  const db = await getDb();

  // Check if email already exists
  const existing = await db.query<UserRow>('SELECT id FROM users WHERE email = ?', [
    email.toLowerCase(),
  ]);
  if (existing.rows.length > 0) {
    return { error: 'Email already registered' };
  }

  const id = crypto.randomUUID();
  const passwordHash = await bcrypt.hash(password, 12);

  try {
    await db.query('INSERT INTO users (id, email, name, password_hash) VALUES (?, ?, ?, ?)', [
      id,
      email.toLowerCase(),
      name,
      passwordHash,
    ]);
  } catch (err: unknown) {
    // Handle unique constraint violation (Postgres: 23505, SQLite: UNIQUE constraint)
    const message = err instanceof Error ? err.message : String(err);
    const code = (err as { code?: string }).code;
    if (code === '23505' || message.includes('UNIQUE constraint')) {
      return { error: 'Email already registered' };
    }
    throw err;
  }

  const user: AuthUser = {
    id,
    email: email.toLowerCase(),
    name,
    createdAt: new Date().toISOString(),
  };
  const token = await createToken(user);

  return { user, token };
}

export async function loginUser(
  email: string,
  password: string
): Promise<{ user: AuthUser; token: string } | { error: string }> {
  const db = await getDb();

  const result = await db.query<UserRow>('SELECT * FROM users WHERE email = ?', [
    email.toLowerCase(),
  ]);

  if (result.rows.length === 0) {
    return { error: 'Invalid email or password' };
  }

  const row = result.rows[0];
  const validPassword = await bcrypt.compare(password, row.password_hash);

  if (!validPassword) {
    return { error: 'Invalid email or password' };
  }

  const user: AuthUser = {
    id: row.id,
    email: row.email,
    name: row.name,
    createdAt: row.created_at,
  };
  const token = await createToken(user);

  return { user, token };
}

export async function getUserFromToken(token: string): Promise<AuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, { issuer: JWT_ISSUER });
    return {
      id: payload.sub as string,
      email: payload.email as string,
      name: payload.name as string,
      createdAt: payload.createdAt as string,
    };
  } catch {
    return null;
  }
}

async function createToken(user: AuthUser): Promise<string> {
  return new SignJWT({
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuer(JWT_ISSUER)
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRY)
    .sign(JWT_SECRET);
}
