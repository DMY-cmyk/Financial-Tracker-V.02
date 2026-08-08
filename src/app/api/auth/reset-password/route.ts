import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { readJsonBody } from '@/lib/api/read-json';
import { consumePasswordReset } from '@/server/services/password-reset.service';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

export async function POST(request: NextRequest) {
  try {
    const limit = checkRateLimit(`reset:${getClientIp(request)}`, 5, 15 * 60 * 1000);
    if (!limit.ok) return rateLimitResponse(limit.retryAfter);

    const parsedBody = await readJsonBody(request);
    if (parsedBody.error) return parsedBody.error;
    const body = parsedBody.data;
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { message: 'Validation error', details: parsed.error.flatten().fieldErrors } },
        { status: 400 }
      );
    }
    const result = await consumePasswordReset({
      rawToken: parsed.data.token,
      newPassword: parsed.data.password,
    });
    if (result.error) {
      return NextResponse.json(
        { error: { message: result.error.message, code: result.error.code } },
        { status: 400 }
      );
    }
    return NextResponse.json({ data: { ok: true } });
  } catch (error) {
    console.error('[reset-password] error:', error);
    return NextResponse.json({ error: { message: 'Internal server error' } }, { status: 500 });
  }
}
