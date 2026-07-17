import { Container, EmptyState } from '@tms/ui';
import type { Metadata } from 'next';
import { DropCard } from '@/components/drop/drop-card';
import { PageHeader } from '@/components/site/page-header';
import { artworkImage } from '@/lib/artwork-images';
import { dataProvider } from '@/lib/data';
import { sortDrops } from '@/lib/drops';

export const metadata: Metadata = {
  title: 'Drops',
  description: 'Limited releases from the studio — early access, live drops, and past editions.',
};

// Time-sensitive (live statuses + countdowns) → render at request time so the
// clock is never frozen at build. See the drop detail route for the rationale.
export const dynamic = 'force-dynamic';

export default async function DropsPage() {
  const now = Date.now();
  const drops = sortDrops(await dataProvider.listDrops(), now);

  // Drop summaries carry no cover, so fetch each drop's pieces and use the first drawing we hold.
  const details = await Promise.all(drops.map((d) => dataProvider.getDrop(d.slug)));
  const covers = new Map(
    drops.map((d, i) => [
      d.slug,
      details[i]?.artworks.find((a) => artworkImage(a.slug) !== null)?.slug ?? null,
    ]),
  );

  return (
    <Container className="py-14">
      <PageHeader
        eyebrow="Limited releases"
        title="Drops"
        lead="Small, timed releases of new artwork. Members get early access; live drops are made to order and close when the window ends."
        contained={false}
      />

      {drops.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            title="No drops right now"
            description="The next release is being prepared. Check back soon."
          />
        </div>
      ) : (
        <ul className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {drops.map((drop) => (
            <li key={drop.slug}>
              <DropCard drop={drop} now={now} coverSlug={covers.get(drop.slug)} />
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
