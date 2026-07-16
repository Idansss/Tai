import { Badge, buttonVariants, Container, Eyebrow, Frame, Heading, Reveal, Text } from '@tms/ui';
import { ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArtworkCard } from '@/components/artwork/artwork-card';
import { ArtworkVisual } from '@/components/artwork/artwork-visual';
import { Countdown } from '@/components/drop/countdown';
import { DropEarlyAccess } from '@/components/drop/drop-early-access';
import { DropStatusBadge } from '@/components/drop/drop-status-badge';
import { MadeToOrderNote } from '@/components/fulfilment/made-to-order-note';
import { dataProvider } from '@/lib/data';
import { dropStatus, nextMilestone } from '@/lib/drops';
import { isPreOrderStatus } from '@/lib/fulfilment';

interface Params {
  params: Promise<{ slug: string }>;
}

// Drops are time-sensitive (live status + countdown), so they render at request
// time rather than being statically prerendered with a frozen clock, a
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
      <Container width="wide" className="py-10 sm:py-12">
        <nav
          aria-label="Breadcrumb"
          className="font-mono text-xs uppercase tracking-[0.12em] text-muted"
        >
          <Link href="/drops" className="rounded-sm transition-colors hover:text-ink">
            Drops
          </Link>
          <span aria-hidden className="px-2 text-line-2">
            /
          </span>
          <span className="text-ink-2">{drop.title}</span>
        </nav>

        <div className="mt-8 grid gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-7">
            <Reveal from="none">
              <Frame ratio="artwork" className="shadow-md">
                <ArtworkVisual seed={`drop-${drop.slug}`} title={drop.title} label={drop.collection} />
              </Frame>
            </Reveal>
          </div>

          <div className="lg:col-span-5">
            <div className="flex flex-wrap items-center gap-3">
              <Eyebrow className="m-0">{drop.collection}</Eyebrow>
              <DropStatusBadge status={status} />
              {isPreOrderStatus(status) ? <Badge tone="info">Pre-order</Badge> : null}
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

            {status === 'live' || isPreOrderStatus(status) ? (
              <div className="mt-4">
                <MadeToOrderNote
                  preOrderReleaseMs={
                    isPreOrderStatus(status) ? Date.parse(drop.releaseAt) : undefined
                  }
                />
              </div>
            ) : null}

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
          <Container width="wide" className="py-16">
            <Eyebrow>In this drop</Eyebrow>
            <Heading id="drop-pieces-title" as={2} size="lg" className="mt-2">
              {drop.pieceCount} {drop.pieceCount === 1 ? 'piece' : 'pieces'}
            </Heading>
            <ul className="mt-8 grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
              {drop.artworks.map((art, i) => (
                <Reveal as="li" key={art.id} delay={(i % 4) * 60}>
                  <ArtworkCard artwork={art} />
                </Reveal>
              ))}
            </ul>
          </Container>
        </section>
      ) : null}
    </>
  );
}
