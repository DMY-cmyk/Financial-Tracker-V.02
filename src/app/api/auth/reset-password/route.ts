import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { consumePasswordReset } from '@/server/services/password-reset.service';

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
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
