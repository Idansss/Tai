'use client';

import { Alert, Badge, Heading, Skeleton, Text, cn } from '@tms/ui';
import { Check, ChevronLeft, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AdminPageHeader } from '@/components/admin-page-header';
import {
  adminDataProvider,
  type AdminArtworkDetail,
  type ArtworkMockup,
  type ArtworkStatus,
  type VersionProcessing,
} from '@/lib/data';
import {
  applyArtworkAction,
  approvalTally,
  type ArtworkAction,
  artworkActions,
  artworkStatusTone,
  canPublish,
  formatArtworkStatus,
  setMockupApproval,
} from '@/lib/artworks';
import type { StatusTone } from '@/lib/order-status';

const versionTone: Record<VersionProcessing, StatusTone> = {
  processing: 'accent',
  ready: 'success',
  failed: 'error',
};

const versionLabel: Record<VersionProcessing, string> = {
  processing: 'Processing',
  ready: 'Ready',
  failed: 'Failed',
};

function Panel({ title, children, id }: { title: string; id?: string; children: React.ReactNode }) {
  return (
    <section
      aria-labelledby={id}
      className="rounded-[var(--radius-lg)] border border-line bg-surface p-5"
    >
      <Heading
        as={2}
        id={id}
        size="md"
        className="mb-4 font-display text-sm font-bold uppercase tracking-wide"
      >
        {title}
      </Heading>
      {children}
    </section>
  );
}

export function ArtworkDetailView({ id }: { id: string }) {
  const [artwork, setArtwork] = useState<AdminArtworkDetail | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState<ArtworkStatus>('draft');
  const [mockups, setMockups] = useState<ArtworkMockup[]>([]);
  const [notice, setNotice] = useState<{ tone: 'info' | 'warning'; text: string } | null>(null);

  useEffect(() => {
    let active = true;
    adminDataProvider.getArtwork(id).then((a) => {
      if (!active) return;
      setArtwork(a);
      if (a) {
        setStatus(a.status);
        setMockups(a.mockups);
      }
      setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, [id]);

  function runAction(action: ArtworkAction) {
    // Publishing/scheduling requires every mockup approved.
    if ((action === 'publish' || action === 'schedule') && !canPublish(mockups)) {
      setNotice({
        tone: 'warning',
        text: 'Approve every mockup before publishing or scheduling this artwork.',
      });
      return;
    }
    const next = applyArtworkAction(status, action);
    setStatus(next);
    setNotice({
      tone: 'info',
      text: `Preview build — this would call the catalogue API. Status set to “${formatArtworkStatus(next)}” locally.`,
    });
  }

  function approve(mockupId: string, approval: ArtworkMockup['approval']) {
    setMockups((current) => setMockupApproval(current, mockupId, approval));
  }

  if (!loaded) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!artwork) {
    return (
      <div className="space-y-6">
        <Link
          href="/artworks"
          className="inline-flex items-center gap-1 rounded-sm text-sm text-muted outline-none hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
        >
          <ChevronLeft className="size-4" aria-hidden />
          Artworks
        </Link>
        <Alert tone="warning" title="Artwork not found">
          No artwork matches <span className="font-medium">{id}</span>.
        </Alert>
      </div>
    );
  }

  const actions = artworkActions(status);
  const tally = approvalTally(mockups);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link
          href="/artworks"
          className="inline-flex items-center gap-1 rounded-sm text-xs font-medium uppercase tracking-[0.08em] text-muted outline-none hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
        >
          <ChevronLeft className="size-4" aria-hidden />
          Artworks
        </Link>
        <AdminPageHeader
          title={
            <span className="inline-flex flex-wrap items-center gap-3">
              {artwork.title}
              <Badge tone={artworkStatusTone(status)}>{formatArtworkStatus(status)}</Badge>
            </span>
          }
          lead={
            <>
              {artwork.collection}
              {status === 'scheduled' && artwork.scheduledFor
                ? ` · goes live ${new Date(artwork.scheduledFor).toLocaleDateString()}`
                : ''}
            </>
          }
          action={
            <div className="flex flex-wrap gap-2">
              {actions.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => runAction(a.id)}
                  className={cn(
                    'inline-flex h-10 items-center rounded-md px-4 text-xs font-semibold uppercase tracking-[0.08em] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]',
                    a.primary
                      ? 'bg-accent text-on-accent hover:brightness-110'
                      : 'border border-line-2 text-ink hover:bg-canvas-2',
                  )}
                >
                  {a.label}
                </button>
              ))}
            </div>
          }
        />
      </div>

      <div aria-live="polite" className="empty:hidden">
        {notice ? (
          <Alert
            tone={notice.tone}
            title={notice.tone === 'warning' ? 'Action blocked' : 'Preview'}
          >
            {notice.text}
          </Alert>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start">
        <div className="space-y-6">
          {/* Mockups / approval */}
          <Panel title="Mockups" id="mockups-heading">
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
              <Badge tone="success">{tally.approved} approved</Badge>
              <Badge tone="error">{tally.rejected} rejected</Badge>
              <Badge tone="neutral">{tally.pending} pending</Badge>
            </div>
            {mockups.length === 0 ? (
              <Text size="sm" tone="muted">
                No mockups yet — they’re generated after the artwork is processed.
              </Text>
            ) : (
              <ul className="space-y-2">
                {mockups.map((m) => (
                  <li
                    key={m.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-line p-3"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="grid size-10 shrink-0 place-items-center rounded bg-canvas-2 text-[10px] uppercase text-muted"
                        aria-hidden
                      >
                        {m.view}
                      </span>
                      <div>
                        <span className="block text-sm text-ink">{m.label}</span>
                        <span
                          className={cn(
                            'text-xs',
                            m.approval === 'approved'
                              ? 'text-success'
                              : m.approval === 'rejected'
                                ? 'text-error'
                                : 'text-muted',
                          )}
                        >
                          {m.approval === 'approved'
                            ? 'Approved'
                            : m.approval === 'rejected'
                              ? 'Rejected'
                              : 'Pending review'}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => approve(m.id, 'approved')}
                        aria-pressed={m.approval === 'approved'}
                        aria-label={`Approve ${m.label}`}
                        className={cn(
                          'inline-flex h-9 items-center gap-1 rounded-md border px-3 text-xs font-medium outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]',
                          m.approval === 'approved'
                            ? 'border-[var(--color-success)] text-success'
                            : 'border-line-2 text-ink hover:bg-canvas-2',
                        )}
                      >
                        <Check className="size-3.5" aria-hidden />
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => approve(m.id, 'rejected')}
                        aria-pressed={m.approval === 'rejected'}
                        aria-label={`Reject ${m.label}`}
                        className={cn(
                          'inline-flex h-9 items-center gap-1 rounded-md border px-3 text-xs font-medium outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]',
                          m.approval === 'rejected'
                            ? 'border-[var(--color-error)] text-error'
                            : 'border-line-2 text-ink hover:bg-canvas-2',
                        )}
                      >
                        <X className="size-3.5" aria-hidden />
                        Reject
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {mockups.length > 0 && !canPublish(mockups) ? (
              <Text size="sm" tone="muted" className="mt-3">
                All mockups must be approved before this artwork can be published.
              </Text>
            ) : null}
          </Panel>

          {/* Versions */}
          <Panel title="Versions" id="versions-heading">
            <ul className="space-y-2">
              {artwork.versions.map((v) => (
                <li key={v.id} className="rounded-md border border-line p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-ink">{v.label}</span>
                    <Badge tone={versionTone[v.processing]}>{versionLabel[v.processing]}</Badge>
                  </div>
                  {v.issues.length > 0 ? (
                    <ul className="mt-2 list-inside list-disc text-xs text-error">
                      {v.issues.map((issue) => (
                        <li key={issue}>{issue}</li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          </Panel>

          {/* Story */}
          <Panel title="Story & tags" id="story-heading">
            <Text size="sm" className="text-ink-2">
              {artwork.story}
            </Text>
            <div className="mt-3 flex flex-wrap gap-2">
              {artwork.tags.map((tag) => (
                <Badge key={tag} tone="neutral">
                  #{tag}
                </Badge>
              ))}
            </div>
          </Panel>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Panel title="SEO" id="seo-heading">
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-muted">Title</dt>
                <dd className="text-ink">{artwork.seoTitle}</dd>
              </div>
              <div>
                <dt className="text-muted">Description</dt>
                <dd className="text-ink-2">{artwork.seoDescription}</dd>
              </div>
              <div>
                <dt className="text-muted">Slug</dt>
                <dd className="font-mono text-xs text-ink-2">/{artwork.slug}</dd>
              </div>
            </dl>
          </Panel>

          <Panel title="Edition" id="edition-heading">
            <Text size="sm" className="text-ink-2">
              {artwork.limitedEdition
                ? `Limited edition${artwork.editionSize ? ` of ${artwork.editionSize}` : ''}.`
                : 'Open edition.'}
            </Text>
          </Panel>

          <Panel title="Compatibility" id="compat-heading">
            <div className="space-y-3 text-sm">
              <div>
                <span className="mb-1 block text-xs uppercase tracking-[0.06em] text-muted">
                  Garments
                </span>
                <div className="flex flex-wrap gap-2">
                  {artwork.compatibleGarments.map((g) => (
                    <Badge key={g} tone="neutral">
                      {g}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <span className="mb-1 block text-xs uppercase tracking-[0.06em] text-muted">
                  Placements
                </span>
                <div className="flex flex-wrap gap-2">
                  {artwork.placements.map((p) => (
                    <Badge key={p} tone="neutral">
                      {p}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
