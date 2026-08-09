import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/reports/trends/route';
import { getDb, resetDb } from '@/server/db/client';
import { resetSeeded, markSeeded } from '@/server/db/seed';

function makeReq(userId?: string, months?: number) {
  const url = `http://localhost/api/reports/trends${months ? `?months=${months}` : ''}`;
  return new NextRequest(url, {
    headers: userId ? { 'x-user-id': userId } : {},
  });
}

async function insertUserWithTx(id: string, amount: number) {
  const db = await getDb();
  await db.query(`INSERT INTO users (id, email, name) VALUES (?, ?, ?)`, [id, `${id}@x.co`, id]);
  await db.query(
    `INSERT INTO transactions (id, user_id, date, description, category, category_id, type, amount, payment_method, notes)
     VALUES (?, ?, '2026-07-15', 'seed', 'Cat', '', 'income', ?, 'Cash', '')`,
    [`tx-${id}`, id, amount]
  );
}

beforeEach(async () => {
  await resetDb();
  resetSeeded();
  markSeeded();
});

describe('GET /api/reports/trends', () => {
  it('returns 401 without x-user-id', async () => {
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("only aggregates the requesting user's transactions", async () => {
    await insertUserWithTx('user-a', 1_000_000);
    await insertUserWithTx('user-b', 7);

    const res = await GET(makeReq('user-b'));
    expect(res.status).toBe(200);
    const body = await res.json();
    const july = body.data.months.find((m: { monthKey: string }) => m.monthKey === '2026-07');
    expect(july).toBeDefined();
    expect(july.income).toBe(7); // BUKAN 1.000.007
  });
});
