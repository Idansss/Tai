'use client';

import { Heading, Text } from '@tms/ui';
import { useEffect, useState } from 'react';

interface Metrics {
  totalConversations: number;
  ticketsByStatus: Record<string, number>;
  eventsByType: Record<string, number>;
  retentionDays: number;
  assistantName: string;
}

interface TicketRow {
  reference: string;
  category: string;
  priority: string;
  status: string;
  summary: string;
  createdAt: string;
}

interface KnowledgeRow {
  title: string;
  sourceType: string;
  canonicalUrl: string;
  published: boolean;
  lastSyncedAt: string | null;
  syncError: string | null;
  chunkCount: number;
}

interface ConversationRow {
  publicId: string;
  status: string;
  intent: string | null;
  messageCount: number;
  updatedAt: string;
}

const DEMO_METRICS: Metrics = {
  totalConversations: 0,
  ticketsByStatus: { OPEN: 0 },
  eventsByType: {},
  retentionDays: 90,
  assistantName: 'F.A.T.U Concierge',
};

const DEMO_KNOWLEDGE: KnowledgeRow[] = [
  {
    title: 'Delivery',
    sourceType: 'POLICY',
    canonicalUrl: '/delivery',
    published: true,
    lastSyncedAt: null,
    syncError: null,
    chunkCount: 1,
  },
  {
    title: 'Returns & exchanges',
    sourceType: 'POLICY',
    canonicalUrl: '/returns',
    published: true,
    lastSyncedAt: null,
    syncError: null,
    chunkCount: 1,
  },
  {
    title: 'Size guide',
    sourceType: 'POLICY',
    canonicalUrl: '/size-guide',
    published: true,
    lastSyncedAt: null,
    syncError: null,
    chunkCount: 1,
  },
];

function apiBase(): string {
  return (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000').replace(/\/$/, '');
}

async function adminFetch<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${apiBase()}${path}`, {
      credentials: 'include',
      cache: 'no-store',
    });
    if (!response.ok) return null;
    const json = (await response.json()) as { data: T };
    return json.data;
  } catch {
    return null;
  }
}

/**
 * Concierge operations console. Loads live admin endpoints when the API is
 * reachable; otherwise shows an honest preview seeded from the public knowledge
 * corpus (no fabricated conversation volumes).
 */
export function ConciergeAdminView() {
  const [metrics, setMetrics] = useState<Metrics>(DEMO_METRICS);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [knowledge, setKnowledge] = useState<KnowledgeRow[]>(DEMO_KNOWLEDGE);
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [live, setLive] = useState(false);

  useEffect(() => {
    void (async () => {
      const [m, t, k, c] = await Promise.all([
        adminFetch<Metrics>('/api/v1/concierge/admin/metrics'),
        adminFetch<TicketRow[]>('/api/v1/concierge/admin/tickets'),
        adminFetch<KnowledgeRow[]>('/api/v1/concierge/admin/knowledge'),
        adminFetch<ConversationRow[]>('/api/v1/concierge/admin/conversations'),
      ]);
      if (m || t || k || c) {
        setLive(true);
        if (m) setMetrics(m);
        if (t) setTickets(t);
        if (k) setKnowledge(k);
        if (c) setConversations(c);
      }
    })();
  }, []);

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">Customer care</p>
        <Heading as={1} className="font-display text-3xl text-ink">
          F.A.T.U Concierge
        </Heading>
        <Text className="max-w-2xl text-muted">
          Conversations, support tickets, knowledge sync, and assisted-care metrics. API keys are
          never shown here.
        </Text>
        {!live ? (
          <p className="rounded-[var(--radius-md)] border border-line bg-canvas-2 px-3 py-2 text-xs text-muted">
            Preview mode — connect the API with an admin session to load live queues. Knowledge
            listed below mirrors the storefront seed corpus.
          </p>
        ) : null}
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Assistant" value={metrics.assistantName} />
        <MetricCard label="Conversations" value={String(metrics.totalConversations)} />
        <MetricCard label="Retention (days)" value={String(metrics.retentionDays)} />
        <MetricCard label="Open tickets" value={String(metrics.ticketsByStatus.OPEN ?? 0)} />
      </section>

      <section className="space-y-3">
        <Heading as={2} className="text-xl text-ink">
          Support ticket queue
        </Heading>
        {tickets.length === 0 ? (
          <p className="text-sm text-muted">No tickets yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-[var(--radius-md)] border border-line">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-canvas-2 text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-3 py-2">Reference</th>
                  <th className="px-3 py-2">Priority</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2">Summary</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => (
                  <tr key={ticket.reference} className="border-t border-line">
                    <td className="px-3 py-2 font-medium text-ink">{ticket.reference}</td>
                    <td className="px-3 py-2">{ticket.priority}</td>
                    <td className="px-3 py-2">{ticket.status}</td>
                    <td className="px-3 py-2">{ticket.category}</td>
                    <td className="px-3 py-2 text-muted">{ticket.summary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <Heading as={2} className="text-xl text-ink">
          Recent conversations
        </Heading>
        {conversations.length === 0 ? (
          <p className="text-sm text-muted">No stored conversations yet.</p>
        ) : (
          <ul className="divide-y divide-line rounded-[var(--radius-md)] border border-line">
            {conversations.map((c) => (
              <li
                key={c.publicId}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
              >
                <span className="font-medium text-ink">{c.publicId}</span>
                <span className="text-muted">
                  {c.intent ?? '—'} · {c.messageCount} msgs · {c.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <Heading as={2} className="text-xl text-ink">
          Knowledge sources
        </Heading>
        <ul className="space-y-2">
          {knowledge.map((row) => (
            <li
              key={`${row.sourceType}-${row.title}`}
              className="rounded-[var(--radius-md)] border border-line px-3 py-2 text-sm"
            >
              <p className="font-medium text-ink">{row.title}</p>
              <p className="text-xs text-muted">
                {row.sourceType} · {row.chunkCount} chunks ·{' '}
                {row.published ? 'published' : 'unpublished'}
                {row.canonicalUrl ? ` · ${row.canonicalUrl}` : ''}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-line bg-canvas-2 px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 font-display text-xl text-ink">{value}</p>
    </div>
  );
}
