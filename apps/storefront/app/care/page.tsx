import type { Metadata } from 'next';
import { ContentPage } from '@/components/site/content-page';

export const metadata: Metadata = {
  title: 'Care',
  description: 'How to wash and care for your printed pieces so the artwork lasts.',
};

export default function Page() {
  return (
    <ContentPage
      eyebrow="Help"
      title="Caring for your piece"
      intro="A printed drawing is only as good as the care it gets. A few small habits keep the artwork sharp and the garment in shape for years."
      sections={[
        {
          heading: 'Washing',
          body: (
            <ul className="list-disc space-y-1.5 pl-5">
              <li>Turn the garment inside out before washing to protect the print.</li>
              <li>Machine wash cold (30°C or below) on a gentle cycle, with similar colours.</li>
              <li>Use a mild detergent — skip bleach and fabric softener.</li>
            </ul>
          ),
        },
        {
          heading: 'Drying',
          body: (
            <p>
              Avoid the tumble dryer — the heat is what ages a print fastest. Reshape while damp and
              dry flat or on a line, away from direct sun.
            </p>
          ),
        },
        {
          heading: 'Ironing',
          body: (
            <p>
              Iron inside out on a warm setting and never directly on the artwork. For heavier
              pieces, a cloth between the iron and the garment is the safest option.
            </p>
          ),
        },
        {
          heading: 'On the garment',
          body: (
            <p>
              Exact fabric weights and care notes are listed on each product page, since a
              heavyweight hoodie and a lightweight tee ask for slightly different handling.
            </p>
          ),
        },
      ]}
    />
  );
}
