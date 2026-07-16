import { Container, EmptyState, Reveal } from '@tms/ui';
import type { Metadata } from 'next';
import { DropCard } from '@/components/drop/drop-card';
import { PageHeading } from '@/components/site/page-heading';
import { dataProvider } from '@/lib/data';
import { sortDrops } from '@/lib/drops';

export const metadata: Metadata = {
  title: 'Drops',
  description: 'Limited releases from the studio, early access, live drops, and past editions.',
};

// Time-sensitive (live statuses + countdowns) → render at request time so the
// clock is never frozen at build. See the drop detail route for the rationale.
export const dynamic = 'force-dynamic';

export default async function DropsPage() {
  const now = Date.now();
  const drops = sortDrops(await dataProvider.listDrops(), now);

  return (
    <Container width="wide" className="py-14 sm:py-16">
      <PageHeading
        eyebrow="Limited releases"
        index={1}
        title="Drops"
        titleId="drops-title"
        lead="Small, timed releases of new artwork. Members get early access; live drops are made to order and close when the window ends."
        meta={`${drops.length} ${drops.length === 1 ? 'release' : 'releases'}`}
      />

      {drops.length === 0 ? (
        <div className="mt-16">
          <EmptyState
            title="No drops right now"
            description="The next release is being prepared. Check back soon."
          />
        </div>
      ) : (
        <ul
          aria-labelledby="drops-title"
          className="mt-12 grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3"
        >
          {drops.map((drop, i) => (
            <Reveal as="li" key={drop.slug} delay={(i % 3) * 70}>
              <DropCard drop={drop} now={now} />
            </Reveal>
          ))}
        </ul>
      )}
    </Container>
  );
}
