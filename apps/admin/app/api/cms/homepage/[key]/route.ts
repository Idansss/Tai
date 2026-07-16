import {
  getHomepageEditable,
  saveHomepageSection,
  HOMEPAGE_KEYS,
  type HomepageKey,
} from '@tms/site-content';
import { NextResponse } from 'next/server';
import { cms, handleApiError, requireApi } from '@/lib/cms/server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string }> },
): Promise<NextResponse> {
  try {
    await requireApi('content.read');
    const { key } = await params;
    if (!(HOMEPAGE_KEYS as string[]).includes(key)) {
      return NextResponse.json({ error: 'Unknown section.' }, { status: 404 });
    }
    const result = await getHomepageEditable(cms(), key as HomepageKey);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ key: string }> },
): Promise<NextResponse> {
  try {
    const { key } = await params;
    if (!(HOMEPAGE_KEYS as string[]).includes(key)) {
      return NextResponse.json({ error: 'Unknown section.' }, { status: 404 });
    }
    const body = (await request.json().catch(() => ({}))) as {
      content?: unknown;
      publish?: boolean;
    };
    const publish = body.publish === true;
    const identity = await requireApi(publish ? 'content.publish' : 'content.write');
    const saved = await saveHomepageSection(
      cms(),
      key as HomepageKey,
      body.content,
      identity,
      publish,
    );
    return NextResponse.json({ status: saved.status });
  } catch (error) {
    return handleApiError(error);
  }
}
