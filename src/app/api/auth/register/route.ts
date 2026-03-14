import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { registerUser } from '@/server/services/auth.service';

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
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
