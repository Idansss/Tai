import type { Metadata } from 'next';
import { ContentPage } from '@/components/site/content-page';

export const metadata: Metadata = {
  title: 'The artist',
  description:
    'The hand behind Tai Manic Studios, how the drawings are made and why the story matters.',
};

export default function Page() {
  return (
    <ContentPage
      eyebrow="The hand behind the work"
      title="The artist"
      intro="Every drawing in the catalogue comes from one studio practice, line work first, colour second, and a story that gives each piece its name."
      sections={[
        {
          heading: 'The practice',
          body: (
            <p>
              The work is drawn by hand and finished digitally, keeping the weight and imperfection
              of the original line. Themes return often, city nights, movement, everyday Lagos -
              and each finished drawing is fixed as an immutable version, so the piece you buy is
              exactly the piece that was approved.
            </p>
          ),
        },
        {
          heading: 'Why the story matters',
          body: (
            <p>
              A drawing without its context is just decoration. Each artwork carries a short story -
              what it is, where it came from, because you should know what you are wearing. You
              will find these stories on every{' '}
              <a
                href="/artworks"
                className="text-ink underline decoration-line underline-offset-2 hover:decoration-ink"
              >
                artwork
              </a>{' '}
              page.
            </p>
          ),
        },
        {
          heading: 'Limited editions',
          body: (
            <p>
              Some pieces are released as limited editions, drawn, numbered and then retired. When
              an edition sells out it stays sold out, so the work keeps its meaning.
            </p>
          ),
        },
      ]}
    />
  );
}
