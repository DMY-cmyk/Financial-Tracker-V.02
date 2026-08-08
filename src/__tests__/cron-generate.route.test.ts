import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the service to isolate route auth logic
vi.mock('@/server/services/recurring-transaction.service', () => ({
  generateRecurringTransactions: vi.fn().mockResolvedValue({
    data: { generated: 3, skipped: 0, totalIncome: 5000000, totalExpense: 0 },
  }),
}));

// Import AFTER mock is set up
const { POST } = await import('@/app/api/cron/generate-recurring/route');

function makeRequest(headers: Record<string, string> = {}): Request {
  return new Request('http://localhost:3000/api/cron/generate-recurring', {
    method: 'POST',
    headers,
  });
}

describe('POST /api/cron/generate-recurring', () => {
  beforeEach(() => {
    vi.stubEnv('CRON_SECRET', 'test-secret-12345');
  });

  it('returns 401 without any auth header', async () => {
    const response = await POST(makeRequest());
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 401 with wrong CRON_SECRET', async () => {
    const response = await POST(makeRequest({ authorization: 'Bearer wrong-secret' }));
    expect(response.status).toBe(401);
  });

  it('returns 401 with only x-vercel-cron-signature (header is client-settable)', async () => {
    const response = await POST(makeRequest({ 'x-vercel-cron-signature': 'spoofed' }));
    expect(response.status).toBe(401);
  });

  it('returns 401 when CRON_SECRET env is missing (fail-closed)', async () => {
    vi.stubEnv('CRON_SECRET', '');
    const response = await POST(makeRequest({ authorization: 'Bearer ' }));
    expect(response.status).toBe(401);
  });

  it('returns 200 with correct Bearer token', async () => {
    const response = await POST(makeRequest({ authorization: 'Bearer test-secret-12345' }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.generated).toBe(3);
    expect(body.data.skipped).toBe(0);
    expect(body.data.failed).toBe(0);
  });

  it('continues past a failing user and reports it in failed count', async () => {
    const { generateRecurringTransactions } =
      await import('@/server/services/recurring-transaction.service');
    vi.mocked(generateRecurringTransactions).mockResolvedValueOnce({
      error: { message: 'Database error', code: 'DB_ERROR' },
    });

    const response = await POST(makeRequest({ authorization: 'Bearer test-secret-12345' }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.failed).toBeGreaterThanOrEqual(1);
  });
});
