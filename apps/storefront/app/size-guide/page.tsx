import type { Metadata } from 'next';
import { Heading } from '@tms/ui';
import { ContentPage } from '@/components/site/content-page';

export const metadata: Metadata = {
  title: 'Size guide',
  description: 'Body measurements and fit guidance for our garments, in centimetres.',
};

const ROWS = [
  { size: 'XS', chest: 46, length: 66, sleeve: 19 },
  { size: 'S', chest: 51, length: 69, sleeve: 20 },
  { size: 'M', chest: 56, length: 72, sleeve: 21 },
  { size: 'L', chest: 61, length: 74, sleeve: 22 },
  { size: 'XL', chest: 66, length: 76, sleeve: 23 },
  { size: 'XXL', chest: 71, length: 78, sleeve: 24 },
];

export default function Page() {
  return (
    <ContentPage
      eyebrow="Help"
      title="Size guide"
      intro="Our classic tee runs true to size. If you prefer a relaxed fit, or you’re choosing an oversized cut, size up. Measurements are in centimetres."
      sections={[
        {
          heading: 'How to measure',
          body: (
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                <span className="text-ink">Chest:</span> measure across the fullest part, from
                armpit to armpit, and double it.
              </li>
              <li>
                <span className="text-ink">Length:</span> from the highest point of the shoulder
                straight down to the hem.
              </li>
              <li>
                <span className="text-ink">Sleeve:</span> from the shoulder seam to the sleeve
                opening.
              </li>
              <li>The easiest check is to measure a garment you already love and compare.</li>
            </ul>
          ),
        },
      ]}
    >
      <Heading as={2} size="md" className="mb-3 text-xs uppercase tracking-[0.12em] text-muted">
        Classic tee — measurements (cm)
      </Heading>
      <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-line">
        <table className="w-full min-w-[28rem] text-sm">
          <caption className="sr-only">Garment measurements by size, in centimetres</caption>
          <thead>
            <tr className="border-b border-line bg-surface text-left text-xs uppercase tracking-[0.06em] text-muted">
              <th scope="col" className="px-4 py-3 font-medium">
                Size
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium">
                Chest
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium">
                Length
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium">
                Sleeve
              </th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.size} className="border-b border-line last:border-b-0">
                <th scope="row" className="px-4 py-3 text-left font-medium text-ink">
                  {r.size}
                </th>
                <td className="px-4 py-3 text-right tabular-nums text-ink-2">{r.chest}</td>
                <td className="px-4 py-3 text-right tabular-nums text-ink-2">{r.length}</td>
                <td className="px-4 py-3 text-right tabular-nums text-ink-2">{r.sleeve}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-sm text-muted">
        Measurements are approximate and can vary by ±2 cm. Oversized and heavyweight cuts have
        their own measurements, listed on each product page.
      </p>
    </ContentPage>
  );
}
