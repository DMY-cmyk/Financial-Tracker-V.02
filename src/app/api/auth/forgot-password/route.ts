import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { readJsonBody } from '@/lib/api/read-json';
import { requestPasswordReset } from '@/server/services/password-reset.service';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { getAppUrl } from '@/lib/auth/app-url';

const schema = z.object({
  email: z.string().email(),
  locale: z.enum(['en', 'id']).default('en'),
});

export async function POST(request: NextRequest) {
  try {
    const limit = checkRateLimit(`forgot:${getClientIp(request)}`, 3, 5 * 60 * 1000);
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
    const appUrl = getAppUrl(new URL(request.url).origin);
    const result = await requestPasswordReset({ ...parsed.data, appUrl });
    if (result.error) {
      return NextResponse.json({ error: { message: result.error.message } }, { status: 500 });
    }
    return NextResponse.json({ data: { sent: true } });
  } catch (error) {
    console.error('[forgot-password] error:', error);
    return NextResponse.json({ error: { message: 'Internal server error' } }, { status: 500 });
  }
}
