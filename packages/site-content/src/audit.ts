import type { SiteContentClient } from './client.js';

export interface AuditActor {
  id: string;
  email: string;
}

export interface AuditInput {
  actor: AuditActor | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  summary: string;
  before?: unknown;
  after?: unknown;
}

/**
 * Append an immutable audit record. Never throws into the caller's happy path —
 * a failed audit write is logged, not surfaced, so it cannot mask the mutation
 * result. Callers should still record within the same request that changed data.
 */
export async function recordAudit(client: SiteContentClient, input: AuditInput): Promise<void> {
  try {
    await client.auditEvent.create({
      data: {
        actorId: input.actor?.id ?? null,
        actorEmail: input.actor?.email ?? null,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId ?? null,
        summary: input.summary.slice(0, 500),
        before: toJson(input.before),
        after: toJson(input.after),
      },
    });
  } catch (error) {
    console.error('[cms] failed to record audit event', {
      action: input.action,
      resourceType: input.resourceType,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

function toJson(value: unknown): object | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  // Structured clone through JSON so Dates/BigInts don't break the JsonB column.
  return JSON.parse(JSON.stringify(value)) as object;
}
