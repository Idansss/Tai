import { softDeleteAnnouncement, updateAnnouncement } from '@tms/site-content';
import { NextResponse } from 'next/server';
import { cms, handleApiError, requireApi } from '@/lib/cms/server';
import { parseAnnouncementInput } from '@/lib/cms/parse';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const identity = await requireApi('content.write');
    const { id } = await params;
    const input = parseAnnouncementInput(await request.json().catch(() => ({})));
    const updated = await updateAnnouncement(cms(), id, input, identity);
    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const identity = await requireApi('content.delete');
    const { id } = await params;
    await softDeleteAnnouncement(cms(), id, identity);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
