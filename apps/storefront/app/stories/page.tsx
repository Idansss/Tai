import type { Metadata } from 'next';
import { ContentPage } from '@/components/site/content-page';

export const metadata: Metadata = {
  title: 'Stories',
  description: 'Notes from the studio: process, releases and the ideas behind the work.',
};

export default function Page() {
  return (
    <ContentPage
      eyebrow="Editorial"
      title="Stories"
      intro="Notes from the studio — how a drawing becomes a piece you can wear, what we are releasing next, and the ideas we keep returning to."
      sections={[
        {
          heading: 'From drawing to garment',
          body: (
            <p>
              Every release starts on paper. We share the thinking behind new artworks here — the
              references, the false starts, and the choice of garment that finally does the drawing
              justice.
            </p>
          ),
        },
        {
          heading: 'Releases & editions',
          body: (
            <p>
              New drops and limited editions are announced here first. Until the full journal is
              live, the freshest work always sits in the{' '}
              <a
                href="/artworks"
                className="text-ink underline decoration-line underline-offset-2 hover:decoration-ink"
              >
                gallery
              </a>{' '}
              and across our{' '}
              <a
                href="/collections"
                className="text-ink underline decoration-line underline-offset-2 hover:decoration-ink"
              >
                collections
              </a>
              .
            </p>
          ),
        },
        {
          heading: 'Stay close',
          body: (
            <p>
              We are still building out the full journal. In the meantime, the newsletter in the
              footer is the best way to hear about new stories and releases as they land.
            </p>
          ),
        },
      ]}
    />
  );
}
