'use client';

import { EmptyState, Price, Text } from '@tms/ui';
import { Palette, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { deleteSavedDesign, readSavedDesigns, type SavedDesign } from '@/lib/account';
import { buildStudioQuery } from '@/lib/studio';
import { AccountShell } from './account-shell';
import { useRequireAuth } from './use-require-auth';

function summarise(design: SavedDesign): string {
  const { config } = design;
  return [config.garment, config.colour, config.size, config.placement].filter(Boolean).join(' · ');
}

export function SavedDesignsView() {
  const { user, ready } = useRequireAuth('/account/saved-designs');
  const [designs, setDesigns] = useState<SavedDesign[] | null>(null);

  useEffect(() => {
    if (user) setDesigns(readSavedDesigns(user.email));
  }, [user]);

  const loading = !ready || !user || designs === null;

  function remove(id: string) {
    if (!user) return;
    setDesigns(deleteSavedDesign(user.email, id));
  }

  return (
    <AccountShell
      title="Saved designs"
      description="Your Design Studio creations, ready to open, tweak or add to your bag."
      loading={loading}
    >
      {designs && designs.length === 0 ? (
        <EmptyState
          icon={<Palette className="size-6" aria-hidden />}
          title="No saved designs yet"
          description="Create a piece in the Design Studio and save it to return to it any time."
          action={
            <Link
              href="/design-studio"
              className="inline-flex h-11 items-center justify-center rounded-md bg-accent px-5 text-sm font-medium text-on-accent outline-none hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
            >
              Open the Design Studio
            </Link>
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {designs?.map((design) => (
            <li
              key={design.id}
              className="flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-line bg-canvas-2"
            >
              <div
                className="grid aspect-[4/3] w-full place-items-center"
                style={{ backgroundColor: design.colourHex ?? 'var(--color-surface-secondary)' }}
                role="img"
                aria-label={`${design.artworkTitle} design preview`}
              >
                <span className="rounded-sm bg-white/85 px-2 py-1 text-center text-[11px] font-medium text-black/70">
                  {design.artworkTitle}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium text-ink">{design.artworkTitle}</span>
                  <Price
                    amountMinor={design.priceMinor}
                    currency={design.currency}
                    className="shrink-0 text-sm text-ink"
                  />
                </div>
                <Text size="sm" tone="muted">
                  {summarise(design)}
                </Text>
                <div className="mt-auto flex items-center gap-2 pt-2">
                  <Link
                    href={`/design-studio${buildStudioQuery(design.config)}`}
                    className="inline-flex h-10 flex-1 items-center justify-center rounded-md bg-accent text-sm font-medium text-on-accent outline-none hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
                  >
                    Open in studio
                  </Link>
                  <button
                    type="button"
                    onClick={() => remove(design.id)}
                    aria-label={`Remove saved design: ${design.artworkTitle}`}
                    className="grid size-10 shrink-0 place-items-center rounded-md border border-line-2 text-muted outline-none hover:text-error focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AccountShell>
  );
}
