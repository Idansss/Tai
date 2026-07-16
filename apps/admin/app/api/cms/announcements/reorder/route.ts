import { reorderAnnouncements } from '@tms/site-content';
import { NextResponse } from 'next/server';
import { cms, handleApiError, requireApi } from '@/lib/cms/server';

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const identity = await requireApi('content.write');
    const body = (await request.json().catch(() => ({}))) as { orderedIds?: unknown };
    const orderedIds = Array.isArray(body.orderedIds)
      ? body.orderedIds.filter((id): id is string => typeof id === 'string')
      : [];
    await reorderAnnouncements(cms(), orderedIds, identity);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
