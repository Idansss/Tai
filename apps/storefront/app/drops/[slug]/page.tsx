import { buttonVariants, Container, Eyebrow, Heading, Text } from '@tms/ui';
import { ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArtworkCard } from '@/components/artwork/artwork-card';
import { Countdown } from '@/components/drop/countdown';
import { DropEarlyAccess } from '@/components/drop/drop-early-access';
import { DropStatusBadge } from '@/components/drop/drop-status-badge';
import { dataProvider } from '@/lib/data';
import { dropStatus, nextMilestone } from '@/lib/drops';

interface Params {
  params: Promise<{ slug: string }>;
}

// Drops are time-sensitive (live status + countdown), so they render at request
// time rather than being statically prerendered with a frozen clock — a
// deliberate divergence from the stable catalogue detail routes, which are
// static with `dynamicParams=false` for a CDN-genuine 404 (TMS-F1-DEF-001).
// The trade-off: an unknown drop slug is a soft 404 under self-hosted
// `next start` (SEO-only, same residual as DEF-001). Swap to the drops API on
// delivery (TMS-FBR-008).
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const drop = await dataProvider.getDrop(slug);
  if (!drop) notFound();
  return {
    title: drop.title,
    description: drop.tagline,
    openGraph: { title: drop.title, description: drop.tagline },
  };
}

export default async function DropDetailPage({ params }: Params) {
  const { slug } = await params;
  const drop = await dataProvider.getDrop(slug);
  if (!drop) notFound();

  const now = Date.now();
  const status = dropStatus(drop, now);
  const milestone = nextMilestone(drop, now);

  return (
    <>
      <Container className="py-10">
        <nav aria-label="Breadcrumb" className="text-xs uppercase tracking-[0.08em] text-muted">
          <Link href="/drops" className="rounded-sm hover:text-ink">
            Drops
          </Link>
          <span aria-hidden> / </span>
          <span className="text-ink-2">{drop.title}</span>
        </nav>

        <div className="mt-6 grid gap-10 lg:grid-cols-2">
          <div
            className="aspect-[4/5] w-full rounded-[var(--radius-lg)] border border-line bg-gradient-to-br from-canvas-2 to-surface-2"
            role="img"
            aria-label={`${drop.title} — drop presentation placeholder`}
          />

          <div>
            <div className="flex flex-wrap items-center gap-3">
              <Eyebrow className="m-0">{drop.collection}</Eyebrow>
              <DropStatusBadge status={status} />
            </div>
            <Heading as={1} size="display-lg" className="mt-2">
              {drop.title}
            </Heading>
            <Text size="lg" tone="secondary" className="mt-3">
              {drop.tagline}
            </Text>

            <div className="mt-6 rounded-[var(--radius-lg)] border border-line bg-surface p-5">
              {milestone.at !== null ? (
                <Countdown target={milestone.at} label={milestone.label} size="lg" />
              ) : (
                <p className="text-sm font-medium text-ink">{milestone.label}</p>
              )}
            </div>

            <div className="mt-6">
              <DropEarlyAccess status={status} slug={drop.slug} title={drop.title} />
            </div>

            <Text tone="secondary" className="mt-6">
              {drop.story}
            </Text>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/design-studio" className={buttonVariants({ size: 'lg' })}>
                Design with this drop <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link href="/drops" className={buttonVariants({ size: 'lg', variant: 'secondary' })}>
                All drops
              </Link>
            </div>
          </div>
        </div>
      </Container>

      {drop.artworks.length > 0 ? (
        <section aria-labelledby="drop-pieces-title" className="border-t border-line bg-canvas-2">
          <Container className="py-14">
            <Eyebrow>In this drop</Eyebrow>
            <Heading id="drop-pieces-title" as={2} size="lg" className="mt-2">
              {drop.pieceCount} {drop.pieceCount === 1 ? 'piece' : 'pieces'}
            </Heading>
            <ul className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {drop.artworks.map((art) => (
                <li key={art.id}>
                  <ArtworkCard artwork={art} />
                </li>
              ))}
            </ul>
          </Container>
        </section>
      ) : null}
    </>
  );
}
