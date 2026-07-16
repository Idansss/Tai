import { revokeSession, SESSION_COOKIE } from '@tms/site-content';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { cms, handleApiError } from '@/lib/cms/server';

export async function POST(): Promise<NextResponse> {
  try {
    const store = await cookies();
    await revokeSession(cms(), store.get(SESSION_COOKIE)?.value);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, '', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 0,
    });
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
