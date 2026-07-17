import { Container, EmptyState, Eyebrow, Heading, Text } from '@tms/ui';
import type { Metadata } from 'next';
import { DropCard } from '@/components/drop/drop-card';
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

  return (
    <Container className="py-14">
      <header>
        <Eyebrow>Limited releases</Eyebrow>
        <Heading as={1} size="display-lg" className="mt-2">
          Drops
        </Heading>
        <Text tone="secondary" className="mt-2 max-w-prose">
          Small, timed releases of new artwork. Members get early access; live drops are made to
          order and close when the window ends.
        </Text>
      </header>

      {drops.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            title="No drops right now"
            description="The next release is being prepared. Check back soon."
          />
        </div>
      ) : (
        <ul className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {drops.map((drop) => (
            <li key={drop.slug}>
              <DropCard drop={drop} now={now} />
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
