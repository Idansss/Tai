import { buttonVariants, Container, EmptyState, Eyebrow, Heading, Text } from '@tms/ui';
import { Search } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArtworkCard } from '@/components/artwork/artwork-card';
import { dataProvider } from '@/lib/data';
import { normalizeQuery } from '@/lib/search';

// Internal search-result combinations should not be indexed (master prompt §25).
export const metadata: Metadata = {
  title: 'Search',
  robots: { index: false, follow: true },
};

const suggestions = ['Lagos', 'Comic', 'Season', 'Night'];

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function SearchPage({ searchParams }: PageProps) {
  const raw = (await searchParams).q;
  const q = (Array.isArray(raw) ? raw[0] : raw) ?? '';
  const query = normalizeQuery(q);
  const results = query ? await dataProvider.searchArtworks(q) : [];

  return (
    <Container className="py-14">
      <Eyebrow>Search</Eyebrow>
      <Heading as={1} size="display-lg" className="mt-2">
        Search the studio
      </Heading>

      <form action="/search" method="get" role="search" className="mt-6 flex max-w-xl gap-2">
        <label htmlFor="search-q" className="sr-only">
          Search artworks and collections
        </label>
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <input
            id="search-q"
            name="q"
            type="search"
            defaultValue={q}
            autoFocus
            enterKeyHint="search"
            placeholder="Search artworks, collections…"
            className="h-11 w-full rounded-md border border-line-2 bg-surface pl-10 pr-3 text-sm text-ink outline-none placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
          />
        </div>
        <button type="submit" className={buttonVariants()}>
          Search
        </button>
      </form>

      {query ? (
        <section aria-labelledby="results-heading" className="mt-10">
          <Heading id="results-heading" as={2} size="md">
            {results.length} {results.length === 1 ? 'result' : 'results'} for “{q.trim()}”
          </Heading>
          {results.length === 0 ? (
            <div className="mt-6">
              <EmptyState
                title="No matches"
                description="Try a different word, or browse the full gallery."
                action={
                  <Link href="/artworks" className={buttonVariants({ variant: 'secondary' })}>
                    Browse all artworks
                  </Link>
                }
              />
            </div>
          ) : (
            <ul className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((art) => (
                <li key={art.id}>
                  <ArtworkCard artwork={art} />
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <div className="mt-8">
          <Text tone="muted">Try one of these:</Text>
          <ul className="mt-3 flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <li key={s}>
                <Link
                  href={`/search?q=${encodeURIComponent(s)}`}
                  className="inline-flex items-center rounded-[var(--radius-pill)] border border-line bg-surface px-3 py-1.5 text-sm text-ink-2 outline-none hover:border-line-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
                >
                  {s}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Container>
  );
}
