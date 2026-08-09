import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { readJsonBody } from '@/lib/api/read-json';
import { loginUser } from '@/server/services/auth.service';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  keepSignedIn: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const limit = checkRateLimit(`login:${getClientIp(request)}`, 5, 5 * 60 * 1000);
    if (!limit.ok) return rateLimitResponse(limit.retryAfter);

    const parsedBody = await readJsonBody(request);
    if (parsedBody.error) return parsedBody.error;
    const body = parsedBody.data;
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: { message: 'Validation error', details: parsed.error.flatten().fieldErrors } },
        { status: 400 }
      );
    }

    const { email, password, keepSignedIn } = parsed.data;
    const result = await loginUser(email, password, keepSignedIn === true);

    if ('error' in result) {
      return NextResponse.json({ error: { message: result.error } }, { status: 401 });
    }

    const response = NextResponse.json({ data: { user: result.user } });
    const maxAge = keepSignedIn ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7;
    response.cookies.set('auth-token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('[login] Internal server error:', error);
    return NextResponse.json({ error: { message: 'Internal server error' } }, { status: 500 });
  }
}
