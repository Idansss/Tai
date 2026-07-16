import {
  archiveAnnouncement,
  publishAnnouncement,
  restoreAnnouncement,
  unpublishAnnouncement,
} from '@tms/site-content';
import { NextResponse } from 'next/server';
import { cms, handleApiError, requireApi } from '@/lib/cms/server';

type Action = 'publish' | 'unpublish' | 'archive' | 'restore';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const body = (await request.json().catch(() => ({}))) as { action?: unknown };
    const action = body.action as Action;
    const { id } = await params;

    switch (action) {
      case 'publish': {
        const identity = await requireApi('content.publish');
        return NextResponse.json(await publishAnnouncement(cms(), id, identity));
      }
      case 'unpublish': {
        const identity = await requireApi('content.publish');
        return NextResponse.json(await unpublishAnnouncement(cms(), id, identity));
      }
      case 'archive': {
        const identity = await requireApi('content.publish');
        return NextResponse.json(await archiveAnnouncement(cms(), id, identity));
      }
      case 'restore': {
        const identity = await requireApi('content.write');
        return NextResponse.json(await restoreAnnouncement(cms(), id, identity));
      }
      default:
        return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
    }
  } catch (error) {
    return handleApiError(error);
  }
}
