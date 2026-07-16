import { NextResponse } from 'next/server';
import { cms, handleApiError, requireApi } from '@/lib/cms/server';

/** Recent audit events (who changed what, when). Read-only, permission-gated. */
export async function GET(request: Request): Promise<NextResponse> {
  try {
    await requireApi('audit.read');
    const url = new URL(request.url);
    const take = Math.min(200, Math.max(1, Number(url.searchParams.get('limit') ?? '100') || 100));
    const resourceType = url.searchParams.get('resourceType');
    const events = await cms().auditEvent.findMany({
      where: resourceType ? { resourceType } : undefined,
      orderBy: { createdAt: 'desc' },
      take,
    });
    return NextResponse.json({
      items: events.map((e) => ({
        id: e.id,
        actorEmail: e.actorEmail,
        action: e.action,
        resourceType: e.resourceType,
        resourceId: e.resourceId,
        summary: e.summary,
        createdAt: e.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
