import {
  Alert,
  Badge,
  Button,
  Card,
  Container,
  EmptyState,
  ErrorState,
  Eyebrow,
  Heading,
  Price,
  Stack,
  Text,
} from '@tms/ui';
import { ArrowRight, Palette, Search } from 'lucide-react';
import type { Metadata } from 'next';
import { dataProvider } from '@/lib/data';

export const metadata: Metadata = {
  title: 'Art-led apparel',
  description: 'A premium digital gallery and interactive design studio. The artwork is the hero.',
};

const availabilityTone = {
  available: 'success',
  limited: 'warning',
  sold_out: 'neutral',
} as const;

const availabilityLabel = {
  available: 'Available',
  limited: 'Limited edition',
  sold_out: 'Sold out',
} as const;

export default async function HomePage() {
  const { items: artworks } = await dataProvider.listArtworks({ limit: 3 });

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-line">
        <Container>
          <nav className="flex h-16 items-center justify-between" aria-label="Primary">
            <span className="font-display text-lg font-semibold tracking-tight text-ink">
              Tai Manic Studios
            </span>
            <ul className="hidden items-center gap-8 text-xs font-medium uppercase tracking-[0.08em] text-muted sm:flex">
              <li>
                <a className="hover:text-ink" href="#gallery">
                  Artworks
                </a>
              </li>
              <li>
                <a className="hover:text-ink" href="#studio">
                  Design Studio
                </a>
              </li>
              <li>
                <a className="hover:text-ink" href="#system">
                  System
                </a>
              </li>
            </ul>
            <Button size="sm" variant="secondary">
              <Search className="size-4" aria-hidden /> Search
            </Button>
          </nav>
        </Container>
      </header>

      <main id="main" className="flex-1">
        {/* Hero */}
        <section className="border-b border-line">
          <Container className="py-20 sm:py-28">
            <div className="max-w-3xl">
              <Eyebrow>Art-led apparel · Est. studio</Eyebrow>
              <Heading as={1} size="display-2xl" className="mt-4">
                The artwork is the hero.
              </Heading>
              <Text size="lg" tone="secondary" className="mt-6 max-w-prose">
                Original drawings and comic-line illustrations, applied to considered garments.
                Explore the gallery, then step into the design studio to make a piece your own.
              </Text>
              <Stack direction="row" gap={3} className="mt-8" wrap>
                <Button size="lg">
                  Explore artworks <ArrowRight className="size-4" aria-hidden />
                </Button>
                <Button size="lg" variant="secondary">
                  <Palette className="size-4" aria-hidden /> Open Design Studio
                </Button>
              </Stack>
            </div>
          </Container>
        </section>

        {/* Featured artworks (mock adapter — TMS-FBR-001 pending) */}
        <section id="gallery" aria-labelledby="gallery-title">
          <Container className="py-16">
            <div className="flex items-end justify-between gap-4">
              <div>
                <Eyebrow>Featured</Eyebrow>
                <Heading id="gallery-title" as={2} size="display-lg" className="mt-2">
                  From the gallery
                </Heading>
              </div>
              <a
                className="hidden shrink-0 text-xs font-medium uppercase tracking-[0.08em] text-muted hover:text-ink sm:inline"
                href="#gallery"
              >
                View all
              </a>
            </div>

            <ul className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {artworks.map((art) => (
                <li key={art.id}>
                  <Card variant="surface" interactive padded={false} className="overflow-hidden">
                    <div
                      className="aspect-[4/5] w-full bg-gradient-to-br from-canvas-2 to-surface-2"
                      role="img"
                      aria-label={`${art.title} — artwork preview placeholder`}
                    />
                    <div className="space-y-2 p-5">
                      <div className="flex items-center justify-between gap-2">
                        <Eyebrow>{art.collection}</Eyebrow>
                        <Badge tone={availabilityTone[art.availability]}>
                          {availabilityLabel[art.availability]}
                        </Badge>
                      </div>
                      <Heading as={3} size="md">
                        {art.title}
                      </Heading>
                      <Text size="sm" tone="muted">
                        {art.shortStory}
                      </Text>
                      <div className="flex items-center justify-between pt-2">
                        <Price
                          amountMinor={art.startingPriceMinor}
                          currency={art.currency}
                          className="text-ink"
                        />
                        <span className="text-xs text-muted">from</span>
                      </div>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          </Container>
        </section>

        {/* Design system showcase — proves tokens, states, and both themes */}
        <section id="system" className="border-t border-line bg-canvas-2">
          <Container className="py-16">
            <Eyebrow>Foundation · F0</Eyebrow>
            <Heading as={2} size="display-lg" className="mt-2">
              Design system
            </Heading>
            <Text tone="secondary" className="mt-3 max-w-prose">
              The shared token layer and primitive components. Every interactive element ships
              default, hover, focus-visible, active, disabled and loading states.
            </Text>

            <div className="mt-8 grid gap-5 lg:grid-cols-2">
              <Card>
                <Heading as={3} size="md">
                  Buttons
                </Heading>
                <Stack direction="row" gap={3} className="mt-4" wrap align="center">
                  <Button>Primary</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="danger">Danger</Button>
                  <Button loading>Loading</Button>
                  <Button disabled>Disabled</Button>
                </Stack>
              </Card>

              <Card>
                <Heading as={3} size="md">
                  Status badges
                </Heading>
                <Stack direction="row" gap={3} className="mt-4" wrap align="center">
                  <Badge tone="neutral">Neutral</Badge>
                  <Badge tone="accent">Accent</Badge>
                  <Badge tone="success">In stock</Badge>
                  <Badge tone="warning">Low stock</Badge>
                  <Badge tone="error">Sold out</Badge>
                  <Badge tone="info">Pre-order</Badge>
                </Stack>
              </Card>

              <Card>
                <Heading as={3} size="md">
                  Feedback
                </Heading>
                <div className="mt-4 space-y-3">
                  <Alert tone="success" title="Design saved">
                    Your configuration is stored to your account.
                  </Alert>
                  <Alert tone="error" title="Payment failed">
                    Your card was declined. No charge was made.
                  </Alert>
                </div>
              </Card>

              <Card padded={false}>
                <div className="p-5">
                  <Heading as={3} size="md">
                    Empty &amp; error states
                  </Heading>
                </div>
                <div className="grid gap-px bg-line sm:grid-cols-2">
                  <div className="bg-surface p-5">
                    <EmptyState
                      title="No artworks found"
                      description="Try clearing your filters."
                      action={
                        <Button size="sm" variant="secondary">
                          Clear filters
                        </Button>
                      }
                    />
                  </div>
                  <div className="bg-surface p-5">
                    <ErrorState
                      title="Couldn't load gallery"
                      description="We couldn't reach the catalogue just now."
                      dataPreservedNote="Your place in the site is safe."
                      action={<Button size="sm">Try again</Button>}
                      reference="corr_0f9a"
                    />
                  </div>
                </div>
              </Card>
            </div>

            {/* Dark gallery mode */}
            <div
              data-theme="dark"
              className="mt-8 rounded-[var(--radius-xl)] border border-line bg-canvas p-8"
            >
              <Eyebrow>Dark gallery mode</Eyebrow>
              <Heading as={2} size="display-lg" className="mt-2 text-ink">
                Made for colour.
              </Heading>
              <Text tone="secondary" className="mt-3 max-w-prose">
                An elevated dark surface for artwork focus and the Design Studio, so colourful work
                reads with maximum contrast.
              </Text>
              <Stack direction="row" gap={3} className="mt-6" wrap align="center">
                <Button>Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Badge tone="success">Available</Badge>
                <Badge tone="warning">Limited</Badge>
              </Stack>
            </div>
          </Container>
        </section>

        {/* Studio invitation */}
        <section id="studio" className="border-t border-line">
          <Container className="py-16">
            <Card
              variant="elevated"
              className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <Eyebrow>Interactive</Eyebrow>
                <Heading as={2} size="lg" className="mt-2">
                  Design your own piece
                </Heading>
                <Text tone="secondary" className="mt-1">
                  Choose an artwork, a garment, colour, size and placement — with a live preview.
                </Text>
              </div>
              <Button size="lg">
                Open Design Studio <ArrowRight className="size-4" aria-hidden />
              </Button>
            </Card>
          </Container>
        </section>
      </main>

      <footer className="border-t border-line bg-canvas-2">
        <Container className="flex flex-col items-center justify-between gap-2 py-8 text-sm text-muted sm:flex-row">
          <span>© {new Date().getFullYear()} Tai Manic Studios</span>
          <span className="text-xs uppercase tracking-[0.08em]">Phase F0 · Visual foundation</span>
        </Container>
      </footer>
    </div>
  );
}
