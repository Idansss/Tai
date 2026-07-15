import type { Metadata } from 'next';
import { ContentPage } from '@/components/site/content-page';

export const metadata: Metadata = {
  title: 'Terms of service',
  description: 'The terms that apply when you browse and buy from Tai Manic Studios.',
};

export default function Page() {
  return (
    <ContentPage
      eyebrow="Legal"
      title="Terms of service"
      intro="These terms cover using this site and buying from us. They’re a working draft to be reviewed by legal counsel before launch and don’t constitute legal advice."
      updated="July 2026"
      sections={[
        {
          heading: 'Using this site',
          body: (
            <p>
              By browsing or ordering, you agree to use the site lawfully and not to misuse the
              artwork or content, which remains the property of Tai Manic Studios and its artists.
            </p>
          ),
        },
        {
          heading: 'Orders & made-to-order production',
          body: (
            <p>
              Placing an order is an offer to buy; a contract forms when we confirm it. Because
              pieces are made to order, production begins shortly after payment — see{' '}
              <a
                href="/returns"
                className="text-ink underline decoration-line underline-offset-2 hover:decoration-ink"
              >
                returns
              </a>{' '}
              for how cancellations and faults are handled.
            </p>
          ),
        },
        {
          heading: 'Pricing & payment',
          body: (
            <p>
              Prices are in Naira (₦) and include applicable VAT where shown. Delivery is added at
              checkout. We take payment through Flutterwave; the total you confirm at checkout is
              the amount charged. We may correct obvious pricing errors before dispatch.
            </p>
          ),
        },
        {
          heading: 'Availability',
          body: (
            <p>
              Availability and limited editions can change. If we can’t fulfil an order — for
              example a sold-out edition — we’ll let you know and refund you in full.
            </p>
          ),
        },
        {
          heading: 'Liability',
          body: (
            <p>
              Nothing in these terms limits rights you have under Nigerian consumer law. Beyond
              those rights, our liability is limited to the value of your order.
            </p>
          ),
        },
        {
          heading: 'Contact',
          body: (
            <p>
              Questions about these terms? Email{' '}
              <a
                href="mailto:hello@taimanicstudios.com"
                className="text-ink underline decoration-line underline-offset-2 hover:decoration-ink"
              >
                hello@taimanicstudios.com
              </a>
              .
            </p>
          ),
        },
      ]}
    />
  );
}
