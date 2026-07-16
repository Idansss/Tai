import { authenticate, SESSION_COOKIE } from '@tms/site-content';
import { NextResponse } from 'next/server';
import { cms, handleApiError } from '@/lib/cms/server';

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      email?: unknown;
      password?: unknown;
    };
    const email = typeof body.email === 'string' ? body.email : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (!email.trim() || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }
    const result = await authenticate(cms(), email, password);
    if (!result) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }
    const response = NextResponse.json({ identity: result.identity });
    response.cookies.set(SESSION_COOKIE, result.token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      expires: result.expiresAt,
    });
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
