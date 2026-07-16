import { NextResponse } from 'next/server';
import { getCmsIdentity, handleApiError } from '@/lib/cms/server';

export async function GET(): Promise<NextResponse> {
  try {
    const identity = await getCmsIdentity();
    if (!identity) {
      return NextResponse.json({ identity: null }, { status: 401 });
    }
    return NextResponse.json({ identity });
  } catch (error) {
    return handleApiError(error);
  }
}
