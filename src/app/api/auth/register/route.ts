import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { readJsonBody } from '@/lib/api/read-json';
import { registerUser } from '@/server/services/auth.service';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export async function POST(request: NextRequest) {
  try {
    const limit = checkRateLimit(`register:${getClientIp(request)}`, 5, 60 * 60 * 1000);
    if (!limit.ok) return rateLimitResponse(limit.retryAfter);

    const parsedBody = await readJsonBody(request);
    if (parsedBody.error) return parsedBody.error;
    const body = parsedBody.data;
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: { message: 'Validation error', details: parsed.error.flatten().fieldErrors } },
        { status: 400 }
      );
    }

    const { email, name, password } = parsed.data;
    const result = await registerUser(email, name, password);

    if ('error' in result) {
      return NextResponse.json({ error: { message: result.error } }, { status: 409 });
    }

    const response = NextResponse.json({ data: { user: result.user } }, { status: 201 });
    response.cookies.set('auth-token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('[register] Internal server error:', error);
    return NextResponse.json({ error: { message: 'Internal server error' } }, { status: 500 });
  }
}
