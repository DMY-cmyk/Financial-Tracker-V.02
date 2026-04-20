// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resetDb } from '@/server/db/client';
import { resetSeeded, markSeeded } from '@/server/db/seed';

beforeEach(async () => {
  await resetDb();
  resetSeeded();
  markSeeded();
});

vi.mock('@/server/services/annual-budget.service', () => ({
  getAnnualBudgetGrid: vi.fn().mockResolvedValue({
    data: { year: 2026, categories: [], overrides: [], spending: [] },
  }),
  upsertMonthlyBudget: vi.fn().mockResolvedValue({
    data: { id: 'mb-1', categoryId: 'cat-1', month: 3, year: 2026, budgetAmount: 1500000 },
  }),
  deleteMonthlyBudget: vi.fn().mockResolvedValue({ data: { success: true } }),
}));

describe('GET /api/budget/annual', () => {
  it('returns 400 when year is missing', async () => {
    const { GET } = await import('@/app/api/budget/annual/route');
    const req = new Request('http://localhost/api/budget/annual');
    const res = await GET(req as never);
    expect(res.status).toBe(400);
  });

  it('returns 200 with grid data', async () => {
    const { GET } = await import('@/app/api/budget/annual/route');
    const req = new Request('http://localhost/api/budget/annual?year=2026');
    const res = await GET(req as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.year).toBe(2026);
  });
});

describe('POST /api/budget/annual', () => {
  it('returns 201 with the upserted override', async () => {
    const { POST } = await import('@/app/api/budget/annual/route');
    const req = new Request('http://localhost/api/budget/annual', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryId: 'cat-1', month: 3, year: 2026, budgetAmount: 1500000 }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.budgetAmount).toBe(1500000);
  });
});

describe('DELETE /api/budget/annual', () => {
  it('returns 200 with success on delete', async () => {
    const { DELETE } = await import('@/app/api/budget/annual/route');
    const req = new Request('http://localhost/api/budget/annual', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryId: 'cat-1', month: 3, year: 2026 }),
    });
    const res = await DELETE(req as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.success).toBe(true);
  });
});
