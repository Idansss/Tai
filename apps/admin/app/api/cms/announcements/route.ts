import { createAnnouncement, listAnnouncements, type ContentStatus } from '@tms/site-content';
import { NextResponse } from 'next/server';
import { cms, handleApiError, requireApi } from '@/lib/cms/server';
import { parseAnnouncementInput } from '@/lib/cms/parse';

const STATUSES = ['DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED'];

export async function GET(request: Request): Promise<NextResponse> {
  try {
    await requireApi('content.read');
    const url = new URL(request.url);
    const statusParam = url.searchParams.get('status') ?? 'all';
    const result = await listAnnouncements(cms(), {
      status: STATUSES.includes(statusParam) ? (statusParam as ContentStatus) : 'all',
      query: url.searchParams.get('query') ?? undefined,
      includeDeleted: url.searchParams.get('includeDeleted') === 'true',
      page: Number(url.searchParams.get('page') ?? '1') || 1,
      pageSize: Number(url.searchParams.get('pageSize') ?? '20') || 20,
    });
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const identity = await requireApi('content.write');
    const input = parseAnnouncementInput(await request.json().catch(() => ({})));
    const created = await createAnnouncement(cms(), input, identity);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
