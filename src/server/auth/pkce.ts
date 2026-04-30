import { randomBytes, createHash } from 'crypto';

export function generateVerifier(): string {
  return randomBytes(48).toString('base64url');
}

export function challengeFromVerifier(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url');
}
