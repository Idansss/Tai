import { buttonVariants, Container, EmptyState, Reveal } from '@tms/ui';
import { Search } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArtworkCard } from '@/components/artwork/artwork-card';
import { PageHeading } from '@/components/site/page-heading';
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
    <Container width="wide" className="py-14 sm:py-16">
      <PageHeading eyebrow="Search" index={1} title="Search the studio" />

      <form action="/search" method="get" role="search" className="mt-8 flex max-w-2xl gap-2">
        <label htmlFor="search-q" className="sr-only">
          Search artworks and collections
        </label>
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted"
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
            className="h-12 w-full rounded-md border border-line-2 bg-surface pl-11 pr-3 text-base text-ink outline-none transition-colors placeholder:text-muted hover:border-ink-2/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
          />
        </div>
        <button type="submit" className={buttonVariants({ size: 'lg' })}>
          Search
        </button>
      </form>

      {query ? (
        <section aria-labelledby="results-heading" className="mt-12">
          <h2
            id="results-heading"
            className="font-mono text-xs uppercase tracking-[0.12em] text-muted"
          >
            {results.length} {results.length === 1 ? 'result' : 'results'} for “{q.trim()}”
          </h2>
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
            <ul className="mt-8 grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
              {results.map((art, i) => (
                <Reveal as="li" key={art.id} delay={(i % 4) * 60}>
                  <ArtworkCard artwork={art} />
                </Reveal>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <div className="mt-10">
          <p className="font-mono text-xs uppercase tracking-[0.12em] text-muted">Try one of these</p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <li key={s}>
                <Link
                  href={`/search?q=${encodeURIComponent(s)}`}
                  className="inline-flex items-center rounded-[var(--radius-pill)] border border-line bg-surface px-4 py-2 text-sm text-ink-2 outline-none transition-colors hover:border-line-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
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
