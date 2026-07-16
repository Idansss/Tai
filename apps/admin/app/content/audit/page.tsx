import { can } from '@tms/site-content';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { cms, getCmsIdentity } from '@/lib/cms/server';

export const metadata: Metadata = { title: 'Audit log' };
export const dynamic = 'force-dynamic';

export default async function AuditPage() {
  const identity = await getCmsIdentity();
  if (!identity) redirect('/login');
  if (!can(identity.role, 'audit.read')) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-line bg-surface p-8 text-center">
        <p className="text-sm text-muted">Your role does not have access to the audit log.</p>
      </div>
    );
  }

  const events = await cms().auditEvent.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">Audit log</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-2">
          Every content change is recorded with the actor, action, resource and time. This is the
          interim CMS audit trail; platform-wide auditing consolidates with the backend audit
          service when it lands.
        </p>
      </div>

      {events.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-dashed border-line p-10 text-center">
          <p className="text-sm text-muted">No audit events yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-line">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-canvas-2 text-xs uppercase tracking-[0.06em] text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Actor</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Resource</th>
                <th className="px-4 py-3 font-medium">Summary</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id} className="border-b border-line last:border-0">
                  <td className="whitespace-nowrap px-4 py-3 text-ink-2">
                    {e.createdAt.toLocaleString()}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-ink-2">
                    {e.actorEmail ?? 'system'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <code className="rounded bg-canvas-2 px-1.5 py-0.5 text-xs text-ink">
                      {e.action}
                    </code>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-ink-2">{e.resourceType}</td>
                  <td className="px-4 py-3 text-ink">{e.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
