import type { Metadata } from 'next';
import { ContentPage } from '@/components/site/content-page';

export const metadata: Metadata = {
  title: 'Delivery',
  description: 'Where we ship, how long made-to-order takes, and what delivery costs.',
};

export default function Page() {
  return (
    <ContentPage
      eyebrow="Help"
      title="Delivery"
      intro="Every piece is made to order, so each timeline has two parts: the days we spend printing and finishing your piece, and the days it spends with our courier."
      sections={[
        {
          heading: 'Where we deliver',
          body: (
            <p>
              We deliver across all 36 states and the FCT. Delivery is handled by our logistics
              partners, with the exact methods and fees for your destination shown at checkout
              before you pay.
            </p>
          ),
        },
        {
          heading: 'Timelines',
          body: (
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                <span className="text-ink">Production:</span> 2–4 working days to print and finish
                your made-to-order piece.
              </li>
              <li>
                <span className="text-ink">Delivery:</span> typically 2–4 working days once
                dispatched, depending on your state.
              </li>
              <li>
                Lagos and major cities are usually at the faster end; more remote destinations can
                take a little longer.
              </li>
            </ul>
          ),
        },
        {
          heading: 'Cost',
          body: (
            <p>
              Delivery is charged per order and calculated at checkout for your address — you will
              always see it, along with VAT, before confirming. Prices are in Naira (₦).
            </p>
          ),
        },
        {
          heading: 'Tracking your order',
          body: (
            <p>
              Once your order is placed you can follow its progress — production, dispatch and
              delivery — from your{' '}
              <a
                href="/account/orders"
                className="text-ink underline decoration-line underline-offset-2 hover:decoration-ink"
              >
                account
              </a>
              . We will also email you as the status changes.
            </p>
          ),
        },
      ]}
    />
  );
}
