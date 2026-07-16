import { Badge, buttonVariants, Container, Eyebrow, Heading, Text } from '@tms/ui';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PassportShare } from '@/components/artwork/passport-share';
import { dataProvider } from '@/lib/data';

interface Params {
  params: Promise<{ slug: string }>;
}

// The passport set is finite and enumerable (one per artwork), so, like the
// artwork detail route, every page is statically generated and any slug
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
  const description = `Authenticity & provenance for ${passport.title}, version ${passport.versionId}.`;
  return {
    title: `${passport.title}, Passport`,
    description,
    openGraph: { title: `${passport.title}, Artwork Passport`, description },
  };
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-1 border-t border-line py-3 first:border-t-0 first:pt-0 sm:flex-row sm:gap-3">
      <dt className="w-40 shrink-0 text-muted">{label}</dt>
      <dd className={mono ? 'font-mono text-ink' : 'text-ink-2'}>{value}</dd>
    </div>
  );
}

export default async function ArtworkPassportPage({ params }: Params) {
  const { slug } = await params;
  const passport = await dataProvider.getArtworkPassport(slug);
  if (!passport) notFound();

  return (
    <Container className="py-10">
      <nav aria-label="Breadcrumb" className="text-xs uppercase tracking-[0.08em] text-muted">
        <Link href="/artworks" className="rounded-sm hover:text-ink">
          Artworks
        </Link>
        <span aria-hidden> / </span>
        <Link href={`/artworks/${passport.artworkSlug}`} className="rounded-sm hover:text-ink">
          {passport.title}
        </Link>
        <span aria-hidden> / </span>
        <span className="text-ink-2">Passport</span>
      </nav>

      <div className="mt-6 max-w-3xl">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-5 text-accent" aria-hidden />
          <Eyebrow className="m-0">Artwork Passport</Eyebrow>
        </div>
        <Heading as={1} size="display-lg" className="mt-2">
          {passport.title}
        </Heading>
        <Text size="lg" tone="secondary" className="mt-3">
          A record of authenticity and provenance for this artwork, issued by {passport.issuedBy}.
        </Text>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        {/* Certificate */}
        <section
          aria-labelledby="certificate-title"
          className="rounded-[var(--radius-lg)] border border-line bg-surface p-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Heading id="certificate-title" as={2} size="md">
              Certificate of authenticity
            </Heading>
            <Badge tone={passport.editionSize ? 'warning' : 'neutral'}>{passport.edition}</Badge>
          </div>

          <dl className="mt-5 text-sm">
            <Field label="Version ID" value={passport.versionId} mono />
            <Field label="Collection" value={passport.collection} />
            <Field label="Edition" value={passport.edition} />
            {passport.serialExample ? (
              <Field label="Serial (example)" value={passport.serialExample} mono />
            ) : null}
            <Field label="Released" value={passport.releasedOn} />
            <Field label="Issued by" value={passport.issuedBy} />
          </dl>

          <p className="mt-5 rounded-[var(--radius-md)] border border-line bg-canvas-2 p-3 text-xs text-muted">
            The version ID is derived from this artwork’s content and stays fixed for this release -
            any change to the piece issues a new version. A per-piece serial ledger and a
            tamper-evident record are server-authoritative once the catalogue backend lands
            (TMS-FBR-001).
          </p>
        </section>

        {/* Ownership + share */}
        <aside className="space-y-6">
          <section
            aria-labelledby="ownership-title"
            className="rounded-[var(--radius-lg)] border border-line bg-surface p-6"
          >
            <Heading id="ownership-title" as={2} size="md">
              Ownership record
            </Heading>
            <Text tone="secondary" className="mt-2 text-sm">
              No owner is on record yet. Ownership is registered to the buyer and the serial is
              assigned when a piece is purchased.
            </Text>
            <p className="mt-3 text-xs text-muted">
              Placeholder, the ownership ledger is a backend feature (TMS-FBR-001). Nothing is
              stored on this device.
            </p>
          </section>

          <section
            aria-labelledby="share-title"
            className="rounded-[var(--radius-lg)] border border-line bg-surface p-6"
          >
            <Heading id="share-title" as={2} size="md">
              Share this passport
            </Heading>
            <Text tone="secondary" className="mt-2 text-sm">
              Share the public authenticity link for {passport.title}.
            </Text>
            <div className="mt-3">
              <PassportShare title={passport.title} />
            </div>
          </section>
        </aside>
      </div>

      {/* Provenance timeline */}
      <section aria-labelledby="provenance-title" className="mt-10 max-w-3xl">
        <Heading id="provenance-title" as={2} size="md">
          Provenance
        </Heading>
        <ol className="mt-4 space-y-4 border-l border-line pl-6">
          {passport.provenance.map((event, index) => (
            <li key={`${event.label}-${index}`} className="relative">
              <span
                aria-hidden
                className="absolute -left-[1.6rem] top-1.5 size-2.5 rounded-full border border-line bg-accent"
              />
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <p className="font-medium text-ink">{event.label}</p>
                <p className="text-xs text-muted">{event.date}</p>
              </div>
              <p className="mt-0.5 text-sm text-ink-2">{event.detail}</p>
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link href={`/artworks/${passport.artworkSlug}`} className={buttonVariants({ size: 'lg' })}>
          Back to artwork
        </Link>
        <Link
          href="/design-studio"
          className={buttonVariants({ size: 'lg', variant: 'secondary' })}
        >
          Design with this artwork <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </Container>
  );
}
