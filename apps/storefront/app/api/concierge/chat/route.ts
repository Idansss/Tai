import { ConciergeChatRequestSchema } from '@tms/contracts';
import { runConciergeTurn } from '@/lib/concierge/orchestrator';
import { checkRateLimit } from '@/lib/concierge/security/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 16_384;

function clientKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || request.headers.get('x-real-ip') || 'anonymous';
}

/**
 * Concierge chat BFF. Streams NDJSON events so the UI can show progress without
 * fake typing delays. Provider keys never leave the server.
 */
export async function POST(request: Request): Promise<Response> {
  if (process.env.AI_ENABLED === 'false') {
    return Response.json(
      { error: { code: 'INTEGRATION_UNAVAILABLE', message: 'The Concierge is temporarily unavailable.' } },
      { status: 503 },
    );
  }

  const limit = checkRateLimit(`concierge:${clientKey(request)}`, {
    windowMs: 60_000,
    max: 20,
  });
  if (!limit.ok) {
    return Response.json(
      {
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many Concierge requests. Please wait a moment.',
          retryAfterSeconds: limit.retryAfterSeconds,
        },
      },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
    );
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return Response.json(
      { error: { code: 'VALIDATION_FAILED', message: 'Request too large.' } },
      { status: 413 },
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return Response.json(
      { error: { code: 'VALIDATION_FAILED', message: 'Invalid JSON body.' } },
      { status: 400 },
    );
  }

  const body = ConciergeChatRequestSchema.safeParse(parsed);
  if (!body.success) {
    return Response.json(
      {
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid Concierge request.',
          details: body.error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        },
      },
      { status: 400 },
    );
  }

  const cookie = request.headers.get('cookie') ?? undefined;
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };
      try {
        send({ type: 'status', phase: 'routing' });
        const started = Date.now();
        const result = await runConciergeTurn(body.data, {
          cookie,
          requestId: body.data.clientRequestId,
        });
        send({ type: 'status', phase: 'generating' });
        // Stream the text in small chunks for perceived responsiveness.
        const chunkSize = 48;
        for (let i = 0; i < result.text.length; i += chunkSize) {
          send({ type: 'token', text: result.text.slice(i, i + chunkSize) });
        }
        send({
          type: 'final',
          result: {
            ...result,
            latencyMs: Date.now() - started,
          },
        });
      } catch (error) {
        send({
          type: 'error',
          message:
            error instanceof Error
              ? 'The Concierge hit an unexpected error. Please try again.'
              : 'The Concierge is unavailable.',
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Concierge-Stream': '1',
    },
  });
}
