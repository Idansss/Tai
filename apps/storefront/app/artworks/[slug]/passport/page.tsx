import { Badge, Container } from '@tms/ui';
import { ShieldCheck } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PassportShare } from '@/components/artwork/passport-share';
import { PillLink } from '@/components/site/pill-link';
import { dataProvider } from '@/lib/data';

interface Params {
  params: Promise<{ slug: string }>;
}

// The passport set is finite and enumerable (one per artwork), so — like the
// artwork detail route — every page is statically generated and any slug
// outside the catalogue is a genuine routing-layer 404 (TMS-F1-DEF-001).
// generateStaticParams enumerates from the real catalogue once TMS-FBR-001 lands.
export const dynamicParams = false;

export async function generateStaticParams() {
  const { items } = await dataProvider.listArtworks({ limit: 100 });
  return items.map((artwork) => ({ slug: artwork.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const passport = await dataProvider.getArtworkPassport(slug);
  if (!passport) notFound();
  const description = `Authenticity & provenance for ${passport.title} — version ${passport.versionId}.`;
  return {
    title: `${passport.title} — Passport`,
    description,
    openGraph: { title: `${passport.title} — Artwork Passport`, description },
  };
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-1 border-t border-line py-3 first:border-t-0 first:pt-0 sm:flex-row sm:items-baseline sm:gap-6">
      <dt className="w-40 shrink-0 font-display text-xs font-semibold uppercase tracking-[0.12em] text-muted">
        {label}
      </dt>
      <dd
        className={
          mono
            ? 'font-mono text-sm tracking-wide text-ink'
            : 'text-sm font-medium text-ink sm:text-base'
        }
      >
        {value}
      </dd>
    </div>
  );
}

export default async function ArtworkPassportPage({ params }: Params) {
  const { slug } = await params;
  const passport = await dataProvider.getArtworkPassport(slug);
  if (!passport) notFound();

  return (
    <Container className="py-10 sm:py-14">
      <nav
        aria-label="Breadcrumb"
        className="font-display text-xs font-semibold uppercase tracking-[0.12em] text-muted"
      >
        <Link
          href="/artworks"
          className="rounded-sm outline-none hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
        >
          Artworks
        </Link>
        <span aria-hidden> / </span>
        <Link
          href={`/artworks/${passport.artworkSlug}`}
          className="rounded-sm outline-none hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
        >
          {passport.title}
        </Link>
        <span aria-hidden> / </span>
        <span className="text-ink">Passport</span>
      </nav>

      <header className="mt-8 max-w-3xl">
        <div className="flex items-center gap-2 text-muted">
          <ShieldCheck className="size-4" aria-hidden />
          <p className="font-display text-xs font-semibold uppercase tracking-[0.2em]">
            Artwork passport
          </p>
        </div>
        <h1 className="mt-3 font-display text-4xl font-bold uppercase leading-[0.95] tracking-tight text-ink sm:text-5xl">
          {passport.title}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
          A record of authenticity and provenance for this artwork, issued by {passport.issuedBy}.
        </p>
      </header>

      <div className="mt-12 grid gap-12 lg:grid-cols-[1.4fr_1fr] lg:gap-16">
        {/* Certificate */}
        <section aria-labelledby="certificate-title">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
            <h2
              id="certificate-title"
              className="font-display text-sm font-bold uppercase tracking-wide text-ink"
            >
              Certificate of authenticity
            </h2>
            <Badge tone={passport.editionSize ? 'warning' : 'neutral'}>{passport.edition}</Badge>
          </div>

          <dl className="mt-2 text-sm">
            <Field label="Version ID" value={passport.versionId} mono />
            <Field label="Collection" value={passport.collection} />
            <Field label="Edition" value={passport.edition} />
            {passport.serialExample ? (
              <Field label="Serial (example)" value={passport.serialExample} mono />
            ) : null}
            <Field label="Released" value={passport.releasedOn} />
            <Field label="Issued by" value={passport.issuedBy} />
          </dl>

          <p className="mt-6 text-xs leading-relaxed text-muted">
            The version ID is derived from this artwork’s content and stays fixed for this release —
            any change to the piece issues a new version. A per-piece serial ledger and a
            tamper-evident record are server-authoritative once the catalogue backend lands
            (TMS-FBR-001).
          </p>
        </section>

        {/* Ownership + share */}
        <aside className="space-y-10">
          <section aria-labelledby="ownership-title">
            <h2
              id="ownership-title"
              className="border-b border-line pb-4 font-display text-sm font-bold uppercase tracking-wide text-ink"
            >
              Ownership record
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-ink-2">
              No owner is on record yet. Ownership is registered to the buyer and the serial is
              assigned when a piece is purchased.
            </p>
            <p className="mt-3 text-xs text-muted">
              Placeholder — the ownership ledger is a backend feature (TMS-FBR-001). Nothing is
              stored on this device.
            </p>
          </section>

          <section aria-labelledby="share-title">
            <h2
              id="share-title"
              className="border-b border-line pb-4 font-display text-sm font-bold uppercase tracking-wide text-ink"
            >
              Share this passport
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-ink-2">
              Share the public authenticity link for {passport.title}.
            </p>
            <div className="mt-4">
              <PassportShare title={passport.title} />
            </div>
          </section>
        </aside>
      </div>

      {/* Provenance timeline */}
      <section aria-labelledby="provenance-title" className="mt-16 max-w-3xl">
        <h2
          id="provenance-title"
          className="border-b border-line pb-4 font-display text-sm font-bold uppercase tracking-wide text-ink"
        >
          Provenance
        </h2>
        <ol className="mt-6 space-y-6 border-l border-line pl-6">
          {passport.provenance.map((event, index) => (
            <li key={`${event.label}-${index}`} className="relative">
              <span
                aria-hidden
                className="absolute -left-[1.6rem] top-1.5 size-2.5 rounded-full bg-neutral-950"
              />
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <p className="font-display text-sm font-bold uppercase tracking-wide text-ink">
                  {event.label}
                </p>
                <p className="font-display text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                  {event.date}
                </p>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-ink-2">{event.detail}</p>
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-14 flex flex-wrap items-center gap-4">
        <PillLink href={`/artworks/${passport.artworkSlug}`}>Back to artwork</PillLink>
        <Link
          href="/design-studio"
          className="text-xs font-medium uppercase tracking-[0.08em] text-muted underline-offset-4 outline-none hover:text-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
        >
          Design with this artwork
        </Link>
      </div>
    </Container>
  );
}
