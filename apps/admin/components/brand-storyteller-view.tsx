'use client';

import { Alert, Badge, Button, cn, Heading, Skeleton, Text } from '@tms/ui';
import { AdminPageHeader } from '@/components/admin-page-header';
import { Check, Sparkles, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { adminDataProvider, type AdminArtworkSummary } from '@/lib/data';
import {
  canGenerate,
  CONTENT_TYPES,
  type ContentDraft,
  type ContentType,
  contentTypeLabel,
  draftFromVariant,
  type GeneratedVariant,
  type GenerationInput,
  generateVariants,
  type SourceKind,
} from '@/lib/storyteller';

const controlClass =
  'h-10 w-full rounded-md border border-line-2 bg-canvas px-3 text-sm text-ink outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]';

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Brand Storyteller (TMS-F5-009). Select an artwork or collection + a content
 * type, generate mock variants, compare, edit, and approve into a saved draft.
 * It **never publishes** — approving only saves a draft; going live is a
 * separate human action. The real generation endpoint lands under TMS-FBR-009.
 */
export function BrandStorytellerView() {
  const [artworks, setArtworks] = useState<AdminArtworkSummary[] | null>(null);
  const [sourceKind, setSourceKind] = useState<SourceKind>('artwork');
  const [sourceId, setSourceId] = useState('');
  const [contentType, setContentType] = useState<ContentType>('product_description');
  const [brief, setBrief] = useState('');

  const [activeInput, setActiveInput] = useState<GenerationInput | null>(null);
  const [variants, setVariants] = useState<GeneratedVariant[] | null>(null);
  const [generating, setGenerating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [drafts, setDrafts] = useState<ContentDraft[]>([]);
  const [savedNote, setSavedNote] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    adminDataProvider.listArtworks().then((list) => {
      if (active) setArtworks(list);
    });
    return () => {
      active = false;
    };
  }, []);

  const collections = useMemo(
    () => [...new Set((artworks ?? []).map((a) => a.collection))].sort(),
    [artworks],
  );

  // Reset the picked source when switching between artwork/collection.
  useEffect(() => {
    setSourceId('');
  }, [sourceKind]);

  const sourceTitle = useMemo(() => {
    if (sourceKind === 'artwork') {
      return artworks?.find((a) => a.id === sourceId)?.title ?? '';
    }
    return sourceId;
  }, [sourceKind, sourceId, artworks]);

  const ready = canGenerate({ sourceId, sourceTitle, contentType });

  async function handleGenerate() {
    if (!ready || generating) return;
    const input: GenerationInput = {
      sourceKind,
      sourceId,
      sourceTitle,
      contentType,
      brief: brief.trim() || undefined,
    };
    setGenerating(true);
    setVariants(null);
    setSelectedId(null);
    setSavedNote(null);
    // Simulated generation latency — the real call hits TMS-FBR-009.
    await new Promise((r) => setTimeout(r, 600));
    setActiveInput(input);
    setVariants(generateVariants(input));
    setGenerating(false);
  }

  function selectVariant(variant: GeneratedVariant) {
    setSelectedId(variant.id);
    setEditText(variant.text);
  }

  function approve() {
    if (!activeInput || !variants) return;
    const variant = variants.find((v) => v.id === selectedId);
    if (!variant) return;
    const draft = draftFromVariant(variant, activeInput, editText);
    setDrafts((prev) => [draft, ...prev]);
    setSavedNote(`Saved a ${contentTypeLabel(draft.contentType)} draft for ${draft.sourceTitle}.`);
    setVariants(null);
    setSelectedId(null);
  }

  const selectedVariant = variants?.find((v) => v.id === selectedId) ?? null;

  return (
    <div className="mx-auto max-w-5xl">
      <header className="space-y-4">
        <AdminPageHeader
          eyebrow="AI · Preview"
          title="Brand Storyteller"
          lead="Generate on-brand copy drafts for an artwork or collection. Review, edit, and approve into a draft — nothing is published automatically."
        />
        <p className="inline-flex items-center gap-1.5 rounded-md bg-canvas-2 px-2.5 py-1 text-xs text-muted">
          <Sparkles className="size-3.5 text-accent" aria-hidden />
          Preview — a mock generator. Output is a draft only and never goes live on its own
          (TMS-FBR-009).
        </p>
      </header>

      {/* Configure */}
      <section
        aria-labelledby="configure-title"
        className="mt-8 rounded-lg border border-line bg-surface p-6"
      >
        <Heading
          id="configure-title"
          as={2}
          size="md"
          className="font-display text-sm font-bold uppercase tracking-wide"
        >
          1 · Configure
        </Heading>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <span className="text-sm font-medium text-ink">Source</span>
            <div className="mt-1 flex gap-2">
              {(['artwork', 'collection'] as SourceKind[]).map((kind) => (
                <button
                  key={kind}
                  type="button"
                  onClick={() => setSourceKind(kind)}
                  aria-pressed={sourceKind === kind}
                  className={cn(
                    'h-10 flex-1 rounded-md border px-3 text-sm capitalize outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]',
                    sourceKind === kind
                      ? 'border-accent bg-canvas-2 font-medium text-ink'
                      : 'border-line-2 text-ink-2 hover:bg-canvas-2',
                  )}
                >
                  {kind}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="source-select" className="text-sm font-medium text-ink">
              {sourceKind === 'artwork' ? 'Artwork' : 'Collection'}
            </label>
            {artworks === null ? (
              <Skeleton className="mt-1 h-10 w-full" />
            ) : (
              <select
                id="source-select"
                value={sourceId}
                onChange={(e) => setSourceId(e.target.value)}
                className={cn(controlClass, 'mt-1')}
              >
                <option value="">Choose…</option>
                {sourceKind === 'artwork'
                  ? artworks.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.title}
                      </option>
                    ))
                  : collections.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
              </select>
            )}
          </div>

          <div>
            <label htmlFor="content-type" className="text-sm font-medium text-ink">
              Content type
            </label>
            <select
              id="content-type"
              value={contentType}
              onChange={(e) => setContentType(e.target.value as ContentType)}
              className={cn(controlClass, 'mt-1')}
            >
              {CONTENT_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-muted">
              {CONTENT_TYPES.find((t) => t.id === contentType)?.description}
            </p>
          </div>

          <div>
            <label htmlFor="brief" className="text-sm font-medium text-ink">
              Brief <span className="text-muted">(optional)</span>
            </label>
            <input
              id="brief"
              type="text"
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              placeholder="Anything to emphasise?"
              className={cn(controlClass, 'mt-1')}
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button type="button" onClick={handleGenerate} disabled={!ready} loading={generating}>
            <Sparkles className="size-4" aria-hidden /> Generate drafts
          </Button>
          {!ready ? <span className="text-xs text-muted">Pick a source to generate.</span> : null}
        </div>
      </section>

      {savedNote ? (
        <Alert tone="success" title="Draft saved" className="mt-6">
          <p>{savedNote} It’s in the drafts list below — publishing is a separate step.</p>
        </Alert>
      ) : null}

      {/* Compare + edit */}
      {variants && activeInput ? (
        <section
          aria-labelledby="compare-title"
          className="mt-6 rounded-lg border border-line bg-surface p-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Heading
              id="compare-title"
              as={2}
              size="md"
              className="font-display text-sm font-bold uppercase tracking-wide"
            >
              2 · Compare variants
            </Heading>
            <p className="text-xs text-muted">
              {variants[0]?.meta.model} · {variants[0]?.meta.variantCount} variants · temp{' '}
              {variants[0]?.meta.temperature} · batch {variants[0]?.meta.batchId} ·{' '}
              {fmtDateTime(variants[0]?.meta.createdAt ?? '')}
            </p>
          </div>

          <ul className="mt-4 grid gap-4 md:grid-cols-3">
            {variants.map((variant) => {
              const selected = variant.id === selectedId;
              return (
                <li key={variant.id}>
                  <button
                    type="button"
                    onClick={() => selectVariant(variant)}
                    aria-pressed={selected}
                    className={cn(
                      'flex h-full w-full flex-col rounded-md border p-4 text-left outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]',
                      selected ? 'border-accent bg-canvas-2' : 'border-line-2 hover:bg-canvas-2',
                    )}
                  >
                    <span className="flex items-center justify-between">
                      <span className="text-sm font-medium text-ink">{variant.label}</span>
                      <Badge tone={selected ? 'accent' : 'neutral'}>{variant.tone}</Badge>
                    </span>
                    <span className="mt-2 whitespace-pre-line text-sm text-ink-2">
                      {variant.text}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {selectedVariant ? (
            <div className="mt-6 border-t border-line pt-6">
              <Heading
                as={3}
                size="md"
                className="font-display text-sm font-bold uppercase tracking-wide"
              >
                3 · Edit &amp; approve
              </Heading>
              <label htmlFor="edit-text" className="sr-only">
                Edit the draft
              </label>
              <textarea
                id="edit-text"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={5}
                className="mt-3 w-full rounded-md border border-line-2 bg-canvas px-3 py-2 text-sm text-ink outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
              />
              <div className="mt-3 flex flex-wrap gap-3">
                <Button type="button" onClick={approve} disabled={editText.trim() === ''}>
                  <Check className="size-4" aria-hidden /> Approve &amp; save draft
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setSelectedId(null);
                    setEditText('');
                  }}
                >
                  <X className="size-4" aria-hidden /> Reject
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted">
                Approving saves a draft for a human to publish later. It never goes live from here.
              </p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted">Select a variant to edit and approve it.</p>
          )}
        </section>
      ) : null}

      {/* Drafts */}
      <section aria-labelledby="drafts-title" className="mt-6">
        <Heading
          id="drafts-title"
          as={2}
          size="md"
          className="font-display text-sm font-bold uppercase tracking-wide"
        >
          Saved drafts
        </Heading>
        {drafts.length === 0 ? (
          <Text tone="muted" className="mt-2 text-sm">
            No drafts yet. Generate and approve one above.
          </Text>
        ) : (
          <ul className="mt-3 space-y-3">
            {drafts.map((draft) => (
              <li key={draft.id} className="rounded-lg border border-line bg-surface p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="neutral">Draft — not published</Badge>
                  <span className="text-sm font-medium text-ink">
                    {contentTypeLabel(draft.contentType)}
                  </span>
                  <span className="text-xs text-muted">
                    {draft.sourceKind} · {draft.sourceTitle} · {draft.tone}
                    {draft.edited ? ' · edited' : ''}
                  </span>
                </div>
                <p className="mt-2 whitespace-pre-line text-sm text-ink-2">{draft.text}</p>
                <p className="mt-2 text-xs text-muted">
                  {draft.meta.model} · batch {draft.meta.batchId} · saved{' '}
                  {fmtDateTime(draft.savedAt)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
