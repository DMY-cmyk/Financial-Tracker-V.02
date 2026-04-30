import { randomBytes, createHash } from 'crypto';
import bcrypt from 'bcryptjs';
import { getDb } from '@/server/db/client';
import {
  createResetToken,
  findResetTokenByHash,
  consumeResetToken,
} from '@/server/repositories/password-reset.repository';
import { sendMail } from '@/server/email/send';
import { renderPasswordResetEmail } from '@/server/email/templates/password-reset';

type ServiceResult<T> = { data?: T; error?: { message: string; code: string } };

const TTL_MS_DEFAULT = 60 * 60 * 1000;

function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

export interface RequestResetInput {
  email: string;
  locale: 'en' | 'id';
  appUrl: string;
  ttlMs?: number;
}

export async function requestPasswordReset(
  input: RequestResetInput
): Promise<ServiceResult<{ sent: boolean; devToken?: string }>> {
  const ttl = input.ttlMs ?? TTL_MS_DEFAULT;
  const db = await getDb();
  const result = await db.query<{ id: string; email: string }>(
    'SELECT id, email FROM users WHERE email = ?',
    [input.email.toLowerCase()]
  );
  const users = result.rows;
  if (users.length === 0) return { data: { sent: true } };

  const raw = randomBytes(32).toString('hex');
  const tokenHash = hashToken(raw);
  const expiresAt = new Date(Date.now() + ttl).toISOString();
  await createResetToken({ userId: users[0].id, tokenHash, expiresAt });

  const url = `${input.appUrl.replace(/\/$/, '')}/reset-password?token=${raw}`;
  const email = renderPasswordResetEmail({ locale: input.locale, resetUrl: url });
  await sendMail({ to: input.email, ...email });

  return {
    data: {
      sent: true,
      devToken: process.env.NODE_ENV !== 'production' ? raw : undefined,
    },
  };
}

export interface ConsumeResetInput {
  rawToken: string;
  newPassword: string;
}

export async function consumePasswordReset(
  input: ConsumeResetInput
): Promise<ServiceResult<{ userId: string }>> {
  const row = await findResetTokenByHash(hashToken(input.rawToken));
  if (!row) return { error: { message: 'Token invalid', code: 'TOKEN_INVALID' } };
  if (row.used_at) return { error: { message: 'Token already used', code: 'TOKEN_INVALID' } };
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return { error: { message: 'Token expired', code: 'TOKEN_EXPIRED' } };
  }

  const bcryptRounds = process.env.NODE_ENV === 'test' ? 4 : 12;
  const hash = await bcrypt.hash(input.newPassword, bcryptRounds);
  const db = await getDb();
  await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, row.user_id]);
  await consumeResetToken(row.id);
  return { data: { userId: row.user_id } };
}
