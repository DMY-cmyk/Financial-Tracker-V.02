import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/server/services/auth.service';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;

  if (!token) {
    return NextResponse.json({ error: { message: 'Not authenticated' } }, { status: 401 });
  }

  const user = await getUserFromToken(token);

  if (!user) {
    const response = NextResponse.json({ error: { message: 'Invalid token' } }, { status: 401 });
    response.cookies.delete('auth-token');
    return response;
  }

  return NextResponse.json({ data: { user } });
}

export async function DELETE() {
  const response = NextResponse.json({ data: { message: 'Logged out' } });
  response.cookies.delete('auth-token');
  return response;
}
